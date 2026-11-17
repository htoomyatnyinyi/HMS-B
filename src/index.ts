import { Elysia } from "elysia";
import {
  checkDatabaseConnection,
  closeDatabase,
} from "./infrastructure/database/prisma";
import { pharmacyRoutes } from "./modules/pharmacy/pharmacy.routes";

const app = new Elysia()
  .use(pharmacyRoutes)
  .get("/", () => ({
    name: "Clinic Management API",
    status: "running",
  }))
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }))
  .get("/health/ready", async ({ set }) => {
    try {
      await checkDatabaseConnection();

      return {
        status: "ready",
        database: "connected",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      set.status = 503;

      console.error("Database readiness check failed:", error);

      return {
        status: "not_ready",
        database: "disconnected",
      };
    }
  })
  .listen(3000);

console.log(
  `Clinic API running at http://${app.server?.hostname}:${app.server?.port}`,
);

process.on("SIGINT", async () => {
  await closeDatabase();
  app.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeDatabase();
  app.stop();
  process.exit(0);
});

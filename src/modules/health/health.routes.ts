import { Elysia } from "elysia";
import { getSystemHealth } from "./health.service";

export const healthRoutes = new Elysia({ prefix: "/health" })
  .get("/", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }))
  .get("/ready", async ({ set }) => {
    const health = await getSystemHealth();
    if (health.database.status !== "connected") {
      set.status = 503;
      return health;
    }
    return health;
  })
  .get("/system", async () => {
    return await getSystemHealth();
  });

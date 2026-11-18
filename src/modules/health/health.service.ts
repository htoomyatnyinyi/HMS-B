import { checkDatabaseConnection } from "../../infrastructure/database/prisma";

export async function getSystemHealth() {
  let dbStatus = "connected";
  try {
    await checkDatabaseConnection();
  } catch (err) {
    dbStatus = "disconnected";
  }

  const memoryUsage = process.memoryUsage();

  return {
    status: dbStatus === "connected" ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    architecture: "modular-monolith",
    services: [
      { name: "auth-service", status: "online", module: "auth" },
      { name: "tenant-service", status: "online", module: "tenants" },
      { name: "patient-service", status: "online", module: "patients" },
      { name: "appointment-service", status: "online", module: "appointments" },
      { name: "encounter-service", status: "online", module: "encounters" },
      { name: "admission-service", status: "online", module: "admissions" },
      { name: "prescription-service", status: "online", module: "prescriptions" },
      { name: "pharmacy-service", status: "online", module: "pharmacy" },
      { name: "laboratory-service", status: "online", module: "laboratory" },
      { name: "billing-service", status: "online", module: "billing" },
    ],
    database: {
      status: dbStatus,
      engine: "PostgreSQL",
    },
    system: {
      uptimeSeconds: Math.floor(process.uptime()),
      memoryRssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
    },
  };
}

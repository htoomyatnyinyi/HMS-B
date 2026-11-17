import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "../../../prisma/schema.d";
import contractJson from "../../../prisma/schema.json" with { type: "json" };
import { config } from "../../config/env";

export const prisma = postgres<Contract>({ contractJson, url: config.databaseUrl });

export async function checkDatabaseConnection(): Promise<void> {
  try {
    await prisma.connect();
  } catch (err) {
    // Bubble up error for readiness checks
    throw err;
  }
}

export async function closeDatabase(): Promise<void> {
  try {
    await prisma.close();
  } catch (err) {
    console.error("Error closing database:", err);
  }
}

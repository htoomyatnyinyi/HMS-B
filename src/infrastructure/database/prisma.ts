import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "../../../prisma/schema.d";
import contractJson from "../../../prisma/schema.json" with { type: "json" };

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

export const prisma = postgres<Contract>({ contractJson, url: databaseUrl });

export async function checkDatabaseConnection(): Promise<void> {
  await prisma.orm.public.Clinic.select("id").limit(1).all();
}

export async function closeDatabase(): Promise<void> {
  await prisma.close();
}

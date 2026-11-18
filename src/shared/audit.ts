import { prisma } from "../infrastructure/database/prisma";
import type { UserContext } from "./types/common.types";

export async function audit(
  user: UserContext | null,
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "VIEW" | "EXPORT" | "PRINT",
  resource: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await prisma.orm.public.AuditLog.create({
      hospitalId: user?.hospitalId,
      userId: user?.userId,
      action,
      resource,
      resourceId,
      metadata,
    });
  } catch (error) {
    console.warn("[Audit Warning]", error);
  }
}

export async function listAuditLogs(hospitalId?: string) {
  const logs = await prisma.orm.public.AuditLog.all();
  return logs
    .filter((log: any) => !hospitalId || String(log.hospitalId) === String(hospitalId))
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 100);
}

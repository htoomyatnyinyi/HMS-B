import jwt from "@elysiajs/jwt";
import { Elysia } from "elysia";
import { config } from "../../config/env";
import type { UserContext } from "../types/common.types";

export const jwtPlugin = jwt({
  name: "jwt",
  secret: config.jwtSecret,
});

export const authMiddleware = new Elysia({ name: "auth-middleware" })
  .use(jwtPlugin)
  .derive(async ({ headers, jwt }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return { user: null };
    }

    const token = authHeader.substring(7);
    try {
      const payload = (await jwt.verify(token)) as Record<string, unknown> | false;
      if (!payload || typeof payload !== "object") {
        return { user: null };
      }

      const user: UserContext = {
        userId: String(payload.sub || ""),
        tenantId: payload.tenantId ? String(payload.tenantId) : undefined,
        hospitalId: payload.hospitalId ? String(payload.hospitalId) : undefined,
        email: String(payload.email || ""),
        roles: Array.isArray(payload.roles) ? (payload.roles as string[]) : ["STAFF"],
      };

      return { user };
    } catch {
      return { user: null };
    }
  });

export function requireAuth(user: UserContext | null, allowedRoles?: string[]): { authorized: boolean; reason?: string } {
  if (!user || !user.userId) {
    return { authorized: false, reason: "Unauthorized: Access token is missing or invalid" };
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = user.roles.some((role) => allowedRoles.includes(role) || role === "SUPER_ADMIN" || role === "ADMIN");
    if (!hasRole) {
      return { authorized: false, reason: `Forbidden: Requires one of [${allowedRoles.join(", ")}] roles` };
    }
  }

  return { authorized: true };
}

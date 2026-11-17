import { Elysia, t } from "elysia";
import jwt from "@elysiajs/jwt";
import { prisma } from "../../infrastructure/database/prisma";
import { authenticateUser, getUserClinicMemberships } from "../auth/auth.service";
import {
  adjustStock,
  createMedication,
  dispenseStock,
  InventoryError,
  listInventory,
  listMedications,
  listMovements,
  receiveStock,
  transferStock,
  type StockActor,
} from "./pharmacy.service";

const configuredSecret = process.env.AUTH_JWT_SECRET;
if (!configuredSecret && process.env.NODE_ENV === "production") {
  throw new Error("AUTH_JWT_SECRET must be configured in production");
}
const jwtSecret = configuredSecret ?? crypto.randomUUID();

const tokenPlugin = jwt({ name: "jwt", secret: jwtSecret });

function errorResponse(error: unknown, set: { status?: number }) {
  if (error instanceof InventoryError) {
    set.status = error.status;
    return { error: error.message };
  }
  console.error("Pharmacy operation failed:", error);
  set.status = 500;
  return { error: "Pharmacy operation failed" };
}

function positiveId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

async function authorizeClinic(
  authorization: string | undefined,
  clinicId: string,
  verify: (token: string) => Promise<unknown>,
  allowedRoles: string[],
): Promise<{ actor: StockActor; role: string } | null> {
  const clinicKey = positiveId(clinicId);
  if (!clinicKey) return null;
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  let payload: unknown;
  try {
    payload = await verify(token);
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object" || !("sub" in payload)) return null;
  const userId = (payload as { sub?: unknown }).sub;
  if (typeof userId !== "string") return null;
  const userKey = positiveId(userId);
  if (!userKey) return null;

  const membership = await prisma.orm.public.ClinicMembership.where({
    userId: userKey,
    clinicId: clinicKey,
    isActive: true,
  }).first();
  if (!membership || !allowedRoles.includes(membership.role)) return null;
  return {
    actor: { clinicId: membership.clinicId, userId: userKey },
    role: membership.role,
  };
}

export const pharmacyRoutes = new Elysia()
  .use(tokenPlugin)
  .post(
    "/auth/login",
    async ({ body, jwt, set }) => {
      const user = await authenticateUser(body.email, body.password);
      if (!user) {
        set.status = 401;
        return { error: "Email or password is incorrect" };
      }
      const memberships = await getUserClinicMemberships(user.id);
      const accessToken = await jwt.sign({
        sub: String(user.id),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
      });
      return { accessToken, tokenType: "Bearer", expiresIn: 43200, user, memberships };
    },
    { body: t.Object({ email: t.String({ format: "email" }), password: t.String({ minLength: 1 }) }) },
  )
  .get(
    "/api/clinics/:clinicId/medications",
    async ({ headers, params, jwt, set }) => {
      const access = await authorizeClinic(headers.authorization, params.clinicId, ((token: string) => jwt.verify(token)), [
        "OWNER", "ADMIN", "DOCTOR", "NURSE", "PHARMACIST", "RECEPTIONIST", "ACCOUNTANT",
      ]);
      if (!access) {
        set.status = 403;
        return { error: "Clinic access denied" };
      }
      return listMedications(access.actor);
    },
    { params: t.Object({ clinicId: t.String({ pattern: "^[1-9]\\d*$" }) }) },
  )
  .post(
    "/api/clinics/:clinicId/medications",
    async ({ headers, params, body, jwt, set }) => {
      const access = await authorizeClinic(headers.authorization, params.clinicId, ((token: string) => jwt.verify(token)), ["OWNER", "ADMIN", "PHARMACIST"]);
      if (!access) {
        set.status = 403;
        return { error: "Clinic access denied" };
      }
      try {
        return await createMedication(access.actor, body);
      } catch (error) {
        return errorResponse(error, set);
      }
    },
    {
      params: t.Object({ clinicId: t.String({ pattern: "^[1-9]\\d*$" }) }),
      body: t.Object({
        code: t.Optional(t.String()),
        name: t.String({ minLength: 1, maxLength: 200 }),
        strength: t.Optional(t.String()),
        dosageForm: t.Optional(t.String()),
        unit: t.String({ minLength: 1, maxLength: 40 }),
      }),
    },
  )
  .get(
    "/api/clinics/:clinicId/inventory",
    async ({ headers, params, query, jwt, set }) => {
      const access = await authorizeClinic(headers.authorization, params.clinicId, ((token: string) => jwt.verify(token)), [
        "OWNER", "ADMIN", "DOCTOR", "NURSE", "PHARMACIST", "RECEPTIONIST", "ACCOUNTANT",
      ]);
      if (!access) {
        set.status = 403;
        return { error: "Clinic access denied" };
      }
      return listInventory(access.actor, query.medicationId);
    },
    {
      params: t.Object({ clinicId: t.String({ pattern: "^[1-9]\\d*$" }) }),
      query: t.Object({ medicationId: t.Optional(t.String({ format: "uuid" })) }),
    },
  )
  .get(
    "/api/clinics/:clinicId/inventory/movements",
    async ({ headers, params, query, jwt, set }) => {
      const access = await authorizeClinic(headers.authorization, params.clinicId, ((token: string) => jwt.verify(token)), [
        "OWNER", "ADMIN", "DOCTOR", "NURSE", "PHARMACIST", "ACCOUNTANT",
      ]);
      if (!access) {
        set.status = 403;
        return { error: "Clinic access denied" };
      }
      return listMovements(access.actor, Number(query.limit ?? 100));
    },
    {
      params: t.Object({ clinicId: t.String({ pattern: "^[1-9]\\d*$" }) }),
      query: t.Object({ limit: t.Optional(t.String({ pattern: "^\\d+$" })) }),
    },
  )
  .post(
    "/api/clinics/:clinicId/inventory/receive",
    async ({ headers, params, body, jwt, set }) => {
      const access = await authorizeClinic(headers.authorization, params.clinicId, ((token: string) => jwt.verify(token)), ["OWNER", "ADMIN", "PHARMACIST"]);
      if (!access) {
        set.status = 403;
        return { error: "Clinic access denied" };
      }
      try {
        return await receiveStock(access.actor, headers["idempotency-key"] ?? "", body);
      } catch (error) {
        return errorResponse(error, set);
      }
    },
    {
      params: t.Object({ clinicId: t.String({ pattern: "^[1-9]\\d*$" }) }),
      body: t.Object({
        medicationId: t.String({ format: "uuid" }),
        batchNumber: t.String({ minLength: 1, maxLength: 100 }),
        expiresAt: t.Optional(t.Union([t.String({ format: "date" }), t.Null()])),
        quantity: t.String({ pattern: "^\\d+(\\.\\d{1,3})?$" }),
        unitCost: t.Optional(t.String({ pattern: "^\\d+(\\.\\d{1,2})?$" })),
        reference: t.Optional(t.String()),
        reason: t.Optional(t.String()),
        movementType: t.Optional(t.Union([t.Literal("RECEIPT"), t.Literal("RETURN")])),
      }),
    },
  )
  .post(
    "/api/clinics/:clinicId/inventory/dispense",
    async ({ headers, params, body, jwt, set }) => {
      const access = await authorizeClinic(headers.authorization, params.clinicId, ((token: string) => jwt.verify(token)), ["OWNER", "ADMIN", "PHARMACIST", "DOCTOR", "NURSE"]);
      if (!access) {
        set.status = 403;
        return { error: "Clinic access denied" };
      }
      try {
        return await dispenseStock(access.actor, headers["idempotency-key"] ?? "", body);
      } catch (error) {
        return errorResponse(error, set);
      }
    },
    {
      params: t.Object({ clinicId: t.String({ pattern: "^[1-9]\\d*$" }) }),
      body: t.Object({
        medicationId: t.String({ format: "uuid" }),
        quantity: t.String({ pattern: "^\\d+(\\.\\d{1,3})?$" }),
        reference: t.Optional(t.String()),
        reason: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/api/clinics/:clinicId/inventory/adjust",
    async ({ headers, params, body, jwt, set }) => {
      const access = await authorizeClinic(headers.authorization, params.clinicId, ((token: string) => jwt.verify(token)), ["OWNER", "ADMIN", "PHARMACIST"]);
      if (!access) {
        set.status = 403;
        return { error: "Clinic access denied" };
      }
      try {
        return await adjustStock(access.actor, headers["idempotency-key"] ?? "", body);
      } catch (error) {
        return errorResponse(error, set);
      }
    },
    {
      params: t.Object({ clinicId: t.String({ pattern: "^[1-9]\\d*$" }) }),
      body: t.Object({
        medicationId: t.String({ format: "uuid" }),
        quantityDelta: t.String({ pattern: "^-?\\d+(\\.\\d{1,3})?$" }),
        batchNumber: t.Optional(t.String()),
        expiresAt: t.Optional(t.Union([t.String({ format: "date" }), t.Null()])),
        lotId: t.Optional(t.String({ format: "uuid" })),
        unitCost: t.Optional(t.String({ pattern: "^\\d+(\\.\\d{1,2})?$" })),
        reason: t.String({ minLength: 1, maxLength: 500 }),
      }),
    },
  )
  .post(
    "/api/clinics/:clinicId/inventory/transfer",
    async ({ headers, params, body, jwt, set }) => {
      const access = await authorizeClinic(headers.authorization, params.clinicId, ((token: string) => jwt.verify(token)), ["OWNER", "ADMIN", "PHARMACIST"]);
      if (!access) {
        set.status = 403;
        return { error: "Clinic access denied" };
      }
      try {
        return await transferStock(access.actor, headers["idempotency-key"] ?? "", body);
      } catch (error) {
        return errorResponse(error, set);
      }
    },
    {
      params: t.Object({ clinicId: t.String({ pattern: "^[1-9]\\d*$" }) }),
      body: t.Object({
        sourceLotId: t.String({ format: "uuid" }),
        destinationLotId: t.String({ format: "uuid" }),
        quantity: t.String({ pattern: "^\\d+(\\.\\d{1,3})?$" }),
        reason: t.Optional(t.String()),
      }),
    },
  );

import { Elysia, t } from "elysia";
import { authMiddleware, requireAuth } from "../../shared/middleware/auth.middleware";
import { errorResponse, successResponse } from "../../shared/utils/response";
import {
  createLabOrder,
  getLabOrderById,
  listLabOrders,
  listLabTests,
  submitLabResult,
} from "./laboratory.service";

export const laboratoryRoutes = new Elysia({ prefix: "/laboratory" })
  .use(authMiddleware)
  .get("/tests", async ({ query, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const tests = await listLabTests(query.laboratoryId);
    return successResponse(tests);
  })
  .get("/orders", async ({ query, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const orders = await listLabOrders(query.laboratoryId);
    return successResponse(orders);
  })
  .post(
    "/orders",
    async ({ body, user, set }) => {
      const auth = requireAuth(user, ["DOCTOR", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden: Only doctors can order lab tests");
      }

      try {
        const order = await createLabOrder({
          ...body,
          priority: body.priority as any,
        });
        return successResponse(order, "Laboratory order placed successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to order lab tests");
      }
    },
    {
      body: t.Object({
        laboratoryId: t.String({ minLength: 1 }),
        patientId: t.String({ minLength: 1 }),
        encounterId: t.Optional(t.String()),
        testIds: t.Array(t.String({ minLength: 1 })),
        priority: t.Optional(t.Union([
          t.Literal("ROUTINE"),
          t.Literal("URGENT"),
          t.Literal("ASAP"),
          t.Literal("STAT"),
        ])),
        notes: t.Optional(t.String()),
      }),
    },
  )
  .get("/orders/:id", async ({ params, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const order = await getLabOrderById(params.id);
    if (!order) {
      set.status = 404;
      return errorResponse("Lab order not found");
    }
    return successResponse(order);
  })
  .post(
    "/results",
    async ({ body, user, set }) => {
      const auth = requireAuth(user, ["DOCTOR", "NURSE", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }

      try {
        const result = await submitLabResult({
          ...body,
          verifiedBy: user?.email,
        });
        return successResponse(result, "Lab result submitted successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to submit lab result");
      }
    },
    {
      body: t.Object({
        orderItemId: t.String({ minLength: 1 }),
        valueText: t.Optional(t.String()),
        valueNumber: t.Optional(t.Number()),
        unit: t.Optional(t.String()),
        referenceRange: t.Optional(t.String()),
        abnormalFlag: t.Optional(t.String()),
        remarks: t.Optional(t.String()),
      }),
    },
  );

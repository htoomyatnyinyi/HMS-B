import { Elysia, t } from "elysia";
import { authMiddleware, requireAuth } from "../../shared/middleware/auth.middleware";
import { errorResponse, successResponse } from "../../shared/utils/response";
import {
  cancelPrescription,
  createPrescription,
  getPrescriptionById,
  listPrescriptions,
} from "./prescription.service";

export const prescriptionRoutes = new Elysia({ prefix: "/prescriptions" })
  .use(authMiddleware)
  .get("/", async ({ query, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const list = await listPrescriptions({
      patientId: query.patientId,
      encounterId: query.encounterId,
      doctorId: query.doctorId,
    });

    return successResponse(list);
  })
  .post(
    "/",
    async ({ body, user, set }) => {
      const auth = requireAuth(user, ["DOCTOR", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden: Only doctors can prescribe");
      }

      try {
        const prescription = await createPrescription({
          ...body,
          doctorId: body.doctorId || user?.userId,
        });
        return successResponse(prescription, "Prescription created successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to create prescription");
      }
    },
    {
      body: t.Object({
        patientId: t.String({ minLength: 1 }),
        encounterId: t.Optional(t.String()),
        doctorId: t.Optional(t.String()),
        notes: t.Optional(t.String()),
        items: t.Array(
          t.Object({
            medicineId: t.String({ minLength: 1 }),
            dose: t.Optional(t.String()),
            route: t.Optional(t.String()),
            frequency: t.Optional(t.String()),
            durationDays: t.Optional(t.Number()),
            quantity: t.Number({ minimum: 1 }),
            instructions: t.Optional(t.String()),
          }),
        ),
      }),
    },
  )
  .get("/:id", async ({ params, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const prescription = await getPrescriptionById(params.id);
    if (!prescription) {
      set.status = 404;
      return errorResponse("Prescription not found");
    }
    return successResponse(prescription);
  })
  .patch("/:id/cancel", async ({ params, user, set }) => {
    const auth = requireAuth(user, ["DOCTOR", "ADMIN"]);
    if (!auth.authorized) {
      set.status = 403;
      return errorResponse(auth.reason || "Forbidden");
    }

    try {
      const cancelled = await cancelPrescription(params.id);
      return successResponse(cancelled, "Prescription cancelled");
    } catch (err: any) {
      set.status = 400;
      return errorResponse(err.message || "Failed to cancel prescription");
    }
  });

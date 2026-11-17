import { Elysia, t } from "elysia";
import { authMiddleware, requireAuth } from "../../shared/middleware/auth.middleware";
import { errorResponse, successResponse } from "../../shared/utils/response";
import {
  admitPatient,
  dischargePatient,
  getAdmissionById,
  listAdmissions,
  listWards,
  transferBed,
} from "./admission.service";

export const admissionRoutes = new Elysia({ prefix: "/admissions" })
  .use(authMiddleware)
  .get("/", async ({ query, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const hospitalId = query.hospitalId || user?.hospitalId;
    const admissions = await listAdmissions(hospitalId, query.status);
    return successResponse(admissions);
  })
  .post(
    "/",
    async ({ body, user, set }) => {
      const auth = requireAuth(user, ["DOCTOR", "NURSE", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }

      const hospitalId = body.hospitalId || user?.hospitalId;
      if (!hospitalId) {
        set.status = 400;
        return errorResponse("hospitalId is required");
      }

      try {
        const admission = await admitPatient({
          ...body,
          hospitalId,
        });
        return successResponse(admission, "Patient admitted successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to admit patient");
      }
    },
    {
      body: t.Object({
        hospitalId: t.Optional(t.String()),
        patientId: t.String({ minLength: 1 }),
        encounterId: t.Optional(t.String()),
        bedId: t.Optional(t.String()),
        admissionReason: t.Optional(t.String()),
        attendingDoctorName: t.Optional(t.String()),
      }),
    },
  )
  .get("/:id", async ({ params, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const admission = await getAdmissionById(params.id);
    if (!admission) {
      set.status = 404;
      return errorResponse("Admission not found");
    }
    return successResponse(admission);
  })
  .post(
    "/:id/transfer",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user, ["NURSE", "DOCTOR", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }

      try {
        const transfer = await transferBed({
          admissionId: params.id,
          fromBedId: body.fromBedId,
          toBedId: body.toBedId,
          reason: body.reason,
        });
        return successResponse(transfer, "Patient transferred successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to transfer bed");
      }
    },
    {
      body: t.Object({
        fromBedId: t.Optional(t.String()),
        toBedId: t.String({ minLength: 1 }),
        reason: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/:id/discharge",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user, ["DOCTOR", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }

      try {
        const discharged = await dischargePatient({
          admissionId: params.id,
          dischargeDiagnosis: body.dischargeDiagnosis,
          dischargeSummary: body.dischargeSummary,
        });
        return successResponse(discharged, "Patient discharged successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to discharge patient");
      }
    },
    {
      body: t.Object({
        dischargeDiagnosis: t.Optional(t.String()),
        dischargeSummary: t.Optional(t.String()),
      }),
    },
  );

export const wardRoutes = new Elysia({ prefix: "/wards" })
  .use(authMiddleware)
  .get("/", async ({ query, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }
    const wards = await listWards(query.hospitalId || user?.hospitalId);
    return successResponse(wards);
  });

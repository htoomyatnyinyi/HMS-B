import { Elysia, t } from "elysia";
import { authMiddleware, requireAuth } from "../../shared/middleware/auth.middleware";
import { errorResponse, successResponse } from "../../shared/utils/response";
import {
  admitPatient,
  createBed,
  createRoom,
  createWard,
  dischargePatient,
  getAdmissionById,
  listAdmissions,
  listBeds,
  listRooms,
  listWards,
  transferBed,
  updateBedStatus,
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
  })
  .post(
    "/",
    async ({ body, user, set }) => {
      const auth = requireAuth(user, ["ADMIN", "SUPER_ADMIN"]);
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
        const ward = await createWard(hospitalId, body);
        return successResponse(ward, "Ward created successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to create ward");
      }
    },
    {
      body: t.Object({
        hospitalId: t.Optional(t.String()),
        code: t.String({ minLength: 1 }),
        name: t.String({ minLength: 1 }),
        wardType: t.Optional(t.String()),
        floor: t.Optional(t.String()),
      }),
    },
  )
  .get("/:id/rooms", async ({ params, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }
    const rooms = await listRooms(params.id);
    return successResponse(rooms);
  })
  .post(
    "/:id/rooms",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user, ["ADMIN", "SUPER_ADMIN"]);
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
        const room = await createRoom(hospitalId, params.id, body);
        return successResponse(room, "Room created successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to create room");
      }
    },
    {
      body: t.Object({
        hospitalId: t.Optional(t.String()),
        roomNo: t.String({ minLength: 1 }),
        roomType: t.Optional(t.String()),
      }),
    },
  )
  .get("/beds", async ({ query, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }
    const beds = await listBeds(query.wardId, query.status);
    return successResponse(beds);
  })
  .post(
    "/:id/beds",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user, ["ADMIN", "SUPER_ADMIN"]);
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
        const bed = await createBed(hospitalId, params.id, body);
        return successResponse(bed, "Bed added successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to create bed");
      }
    },
    {
      body: t.Object({
        hospitalId: t.Optional(t.String()),
        roomId: t.Optional(t.String()),
        bedNo: t.String({ minLength: 1 }),
        bedType: t.Optional(t.String()),
        dailyRate: t.Optional(t.Number()),
      }),
    },
  )
  .patch(
    "/beds/:id/status",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user, ["NURSE", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }
      try {
        const updated = await updateBedStatus(params.id, body.status as any);
        return successResponse(updated, "Bed status updated");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to update bed status");
      }
    },
    {
      body: t.Object({
        status: t.Union([
          t.Literal("AVAILABLE"),
          t.Literal("OCCUPIED"),
          t.Literal("RESERVED"),
          t.Literal("CLEANING"),
          t.Literal("MAINTENANCE"),
          t.Literal("BLOCKED"),
        ]),
      }),
    },
  );

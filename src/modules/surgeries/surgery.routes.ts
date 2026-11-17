import { Elysia, t } from "elysia";
import { authMiddleware, requireAuth } from "../../shared/middleware/auth.middleware";
import { errorResponse, successResponse } from "../../shared/utils/response";
import {
  createOperatingRoom,
  getSurgeryById,
  listOperatingRooms,
  listSurgeries,
  scheduleSurgery,
  updateSurgeryStatus,
} from "./surgery.service";
import type { SurgeryStatus } from "./surgery.types";

export const surgeryRoutes = new Elysia({ prefix: "/surgeries" })
  .use(authMiddleware)
  .get("/operating-rooms", async ({ query, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const rooms = await listOperatingRooms(query.hospitalId || user?.hospitalId);
    return successResponse(rooms);
  })
  .post(
    "/operating-rooms",
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
        const room = await createOperatingRoom(hospitalId, body);
        return successResponse(room, "Operating room created successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to create operating room");
      }
    },
    {
      body: t.Object({
        hospitalId: t.Optional(t.String()),
        code: t.String({ minLength: 1 }),
        name: t.String({ minLength: 1 }),
        location: t.Optional(t.String()),
      }),
    },
  )
  .get("/", async ({ query, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const surgeries = await listSurgeries(query.hospitalId || user?.hospitalId, query.status);
    return successResponse(surgeries);
  })
  .post(
    "/",
    async ({ body, user, set }) => {
      const auth = requireAuth(user, ["DOCTOR", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden: Only doctors can schedule surgery");
      }

      try {
        const surgery = await scheduleSurgery({
          ...body,
          doctorId: body.doctorId || user?.userId,
        });
        return successResponse(surgery, "Surgery scheduled successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to schedule surgery");
      }
    },
    {
      body: t.Object({
        operatingRoomId: t.String({ minLength: 1 }),
        doctorId: t.Optional(t.String()),
        patientId: t.String({ minLength: 1 }),
        procedureName: t.String({ minLength: 1 }),
        scheduledStart: t.String(),
        scheduledEnd: t.Optional(t.String()),
        anesthesiaNotes: t.Optional(t.String()),
        operativeNotes: t.Optional(t.String()),
      }),
    },
  )
  .get("/:id", async ({ params, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const surgery = await getSurgeryById(params.id);
    if (!surgery) {
      set.status = 404;
      return errorResponse("Surgery not found");
    }
    return successResponse(surgery);
  })
  .patch(
    "/:id/status",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user, ["DOCTOR", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }

      try {
        const updated = await updateSurgeryStatus(params.id, body.status as SurgeryStatus, {
          actualStart: body.actualStart,
          actualEnd: body.actualEnd,
          operativeNotes: body.operativeNotes,
        });
        return successResponse(updated, `Surgery status updated to ${body.status}`);
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to update surgery status");
      }
    },
    {
      body: t.Object({
        status: t.Union([
          t.Literal("SCHEDULED"),
          t.Literal("PREPARATION"),
          t.Literal("IN_PROGRESS"),
          t.Literal("COMPLETED"),
          t.Literal("CANCELLED"),
        ]),
        actualStart: t.Optional(t.String()),
        actualEnd: t.Optional(t.String()),
        operativeNotes: t.Optional(t.String()),
      }),
    },
  );

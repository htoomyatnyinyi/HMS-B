import { Elysia, t } from "elysia";
import { authMiddleware, requireAuth } from "../../shared/middleware/auth.middleware";
import { errorResponse, successResponse } from "../../shared/utils/response";
import { audit } from "../../shared/audit";
import {
  bookAppointment,
  getAppointmentById,
  getDoctorSchedule,
  listAppointments,
  rescheduleAppointment,
  updateAppointmentStatus,
} from "./appointment.service";
import type { AppointmentStatus } from "./appointment.types";

export const appointmentRoutes = new Elysia({ prefix: "/appointments" })
  .use(authMiddleware)
  .get("/", async ({ query, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const hospitalId = query.hospitalId || user?.hospitalId;
    const appointments = await listAppointments({
      hospitalId,
      doctorId: query.doctorId,
      patientId: query.patientId,
      status: query.status as AppointmentStatus,
      date: query.date,
    });

    return successResponse(appointments);
  })
  .post(
    "/",
    async ({ body, user, set }) => {
      const auth = requireAuth(user);
      if (!auth.authorized) {
        set.status = 401;
        return errorResponse(auth.reason || "Unauthorized");
      }

      const hospitalId = body.hospitalId || user?.hospitalId;
      if (!hospitalId) {
        set.status = 400;
        return errorResponse("hospitalId is required");
      }

      try {
        const appointment = await bookAppointment({
          ...body,
          hospitalId,
          createdById: user?.userId,
        });
        await audit(user, "CREATE", "Appointment", appointment.id);
        return successResponse(appointment, "Appointment scheduled successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to book appointment");
      }
    },
    {
      body: t.Object({
        hospitalId: t.Optional(t.String()),
        branchId: t.Optional(t.String()),
        patientId: t.String({ minLength: 1 }),
        doctorId: t.Optional(t.String()),
        departmentId: t.Optional(t.String()),
        startAt: t.String(),
        endAt: t.String(),
        reason: t.Optional(t.String()),
        notes: t.Optional(t.String()),
      }),
    },
  )
  .get("/doctor/:doctorId/schedule", async ({ params, query, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const schedule = await getDoctorSchedule(params.doctorId, query.date);
    return successResponse(schedule);
  })
  .get("/:id", async ({ params, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const appointment = await getAppointmentById(params.id);
    if (!appointment) {
      set.status = 404;
      return errorResponse("Appointment not found");
    }
    return successResponse(appointment);
  })
  .patch(
    "/:id/status",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user);
      if (!auth.authorized) {
        set.status = 401;
        return errorResponse(auth.reason || "Unauthorized");
      }

      try {
        const updated = await updateAppointmentStatus(params.id, body.status as AppointmentStatus, body.notes);
        await audit(user, "UPDATE", "Appointment", params.id, { status: body.status });
        return successResponse(updated, `Appointment status updated to ${body.status}`);
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to update appointment status");
      }
    },
    {
      body: t.Object({
        status: t.Union([
          t.Literal("REQUESTED"),
          t.Literal("BOOKED"),
          t.Literal("CONFIRMED"),
          t.Literal("ARRIVED"),
          t.Literal("CHECKED_IN"),
          t.Literal("IN_PROGRESS"),
          t.Literal("COMPLETED"),
          t.Literal("CANCELLED"),
          t.Literal("NO_SHOW"),
        ]),
        notes: t.Optional(t.String()),
      }),
    },
  )
  .put(
    "/:id/reschedule",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user);
      if (!auth.authorized) {
        set.status = 401;
        return errorResponse(auth.reason || "Unauthorized");
      }

      try {
        const rescheduled = await rescheduleAppointment(params.id, body.startAt, body.endAt, body.reason);
        return successResponse(rescheduled, "Appointment rescheduled successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to reschedule appointment");
      }
    },
    {
      body: t.Object({
        startAt: t.String(),
        endAt: t.String(),
        reason: t.Optional(t.String()),
      }),
    },
  );

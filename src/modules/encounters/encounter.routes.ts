import { Elysia, t } from "elysia";
import { authMiddleware, requireAuth } from "../../shared/middleware/auth.middleware";
import { errorResponse, successResponse } from "../../shared/utils/response";
import {
  addClinicalNote,
  addEncounterDiagnosis,
  addObservation,
  finishEncounter,
  getEncounterById,
  listEncounters,
  startEncounter,
} from "./encounter.service";
import type { EncounterType, Priority } from "./encounter.types";

export const encounterRoutes = new Elysia({ prefix: "/encounters" })
  .use(authMiddleware)
  .get("/", async ({ query, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const hospitalId = query.hospitalId || user?.hospitalId;
    const encounters = await listEncounters({
      hospitalId,
      patientId: query.patientId,
      doctorId: query.doctorId,
      status: query.status,
    });

    return successResponse(encounters);
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
        const encounter = await startEncounter({
          ...body,
          hospitalId,
          type: body.type as EncounterType,
          priority: body.priority as Priority,
        });
        return successResponse(encounter, "Encounter started successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to start encounter");
      }
    },
    {
      body: t.Object({
        hospitalId: t.Optional(t.String()),
        branchId: t.Optional(t.String()),
        patientId: t.String({ minLength: 1 }),
        appointmentId: t.Optional(t.String()),
        doctorId: t.Optional(t.String()),
        type: t.Optional(t.Union([
          t.Literal("OPD"),
          t.Literal("IPD"),
          t.Literal("EMERGENCY"),
          t.Literal("TELEMEDICINE"),
          t.Literal("HOMECARE"),
        ])),
        priority: t.Optional(t.Union([
          t.Literal("ROUTINE"),
          t.Literal("URGENT"),
          t.Literal("ASAP"),
          t.Literal("STAT"),
        ])),
        chiefComplaint: t.Optional(t.String()),
      }),
    },
  )
  .get("/:id", async ({ params, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const encounter = await getEncounterById(params.id);
    if (!encounter) {
      set.status = 404;
      return errorResponse("Encounter not found");
    }
    return successResponse(encounter);
  })
  .patch(
    "/:id/finish",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user, ["DOCTOR", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }

      try {
        const finished = await finishEncounter(params.id, body.clinicalSummary, body.disposition);
        return successResponse(finished, "Encounter concluded successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to finish encounter");
      }
    },
    {
      body: t.Object({
        clinicalSummary: t.Optional(t.String()),
        disposition: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/:id/notes",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user, ["DOCTOR", "NURSE", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }

      try {
        const note = await addClinicalNote({
          encounterId: params.id,
          authorId: user!.userId,
          noteType: body.noteType,
          subjective: body.subjective,
          objective: body.objective,
          assessment: body.assessment,
          plan: body.plan,
          content: body.content,
        });
        return successResponse(note, "Clinical note saved");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to save note");
      }
    },
    {
      body: t.Object({
        noteType: t.Optional(t.String()),
        subjective: t.Optional(t.String()),
        objective: t.Optional(t.String()),
        assessment: t.Optional(t.String()),
        plan: t.Optional(t.String()),
        content: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/:id/diagnoses",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user, ["DOCTOR", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }

      try {
        const diagnosis = await addEncounterDiagnosis({
          encounterId: params.id,
          code: body.code,
          codeSystem: body.codeSystem,
          description: body.description,
          isPrimary: body.isPrimary,
        });
        return successResponse(diagnosis, "Diagnosis recorded");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to record diagnosis");
      }
    },
    {
      body: t.Object({
        code: t.Optional(t.String()),
        codeSystem: t.Optional(t.String()),
        description: t.String({ minLength: 1 }),
        isPrimary: t.Optional(t.Boolean()),
      }),
    },
  )
  .post(
    "/:id/observations",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user);
      if (!auth.authorized) {
        set.status = 401;
        return errorResponse(auth.reason || "Unauthorized");
      }

      try {
        const obs = await addObservation({
          encounterId: params.id,
          patientId: body.patientId,
          code: body.code,
          display: body.display,
          category: body.category,
          valueString: body.valueString,
          valueNumber: body.valueNumber,
          unit: body.unit,
        });
        return successResponse(obs, "Vital observation recorded");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to record observation");
      }
    },
    {
      body: t.Object({
        patientId: t.String({ minLength: 1 }),
        code: t.String({ minLength: 1 }),
        display: t.String({ minLength: 1 }),
        category: t.Optional(t.String()),
        valueString: t.Optional(t.String()),
        valueNumber: t.Optional(t.Number()),
        unit: t.Optional(t.String()),
      }),
    },
  );

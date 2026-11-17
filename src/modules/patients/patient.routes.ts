import { Elysia, t } from "elysia";
import { authMiddleware, requireAuth } from "../../shared/middleware/auth.middleware";
import { errorResponse, paginatedResponse, successResponse } from "../../shared/utils/response";
import {
  addPatientAllergy,
  createPatient,
  deletePatient,
  getPatientAllergies,
  getPatientById,
  listPatients,
  updatePatient,
} from "./patient.service";

export const patientRoutes = new Elysia({ prefix: "/patients" })
  .use(authMiddleware)
  .get("/", async ({ query, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const hospitalId = query.hospitalId || user?.hospitalId;
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;

    const result = await listPatients({
      hospitalId,
      search: query.search,
      page,
      limit,
    });

    return paginatedResponse(result.items, result.total, result.page, result.limit);
  })
  .post(
    "/",
    async ({ body, user, set }) => {
      const auth = requireAuth(user);
      if (!auth.authorized) {
        set.status = 401;
        return errorResponse(auth.reason || "Unauthorized");
      }

      const tenantId = body.tenantId || user?.tenantId;
      const hospitalId = body.hospitalId || user?.hospitalId;

      if (!tenantId || !hospitalId) {
        set.status = 400;
        return errorResponse("tenantId and hospitalId are required");
      }

      try {
        const patient = await createPatient({
          ...body,
          tenantId,
          hospitalId,
        });
        return successResponse(patient, "Patient registered successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to create patient");
      }
    },
    {
      body: t.Object({
        tenantId: t.Optional(t.String()),
        hospitalId: t.Optional(t.String()),
        branchId: t.Optional(t.String()),
        mrn: t.Optional(t.String()),
        nationalId: t.Optional(t.String()),
        firstName: t.String({ minLength: 1 }),
        middleName: t.Optional(t.String()),
        lastName: t.String({ minLength: 1 }),
        preferredName: t.Optional(t.String()),
        dateOfBirth: t.Optional(t.String()),
        gender: t.Optional(t.Union([t.Literal("MALE"), t.Literal("FEMALE"), t.Literal("OTHER"), t.Literal("UNKNOWN")])),
        bloodGroup: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        email: t.Optional(t.String()),
      }),
    },
  )
  .get("/:id", async ({ params, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const patient = await getPatientById(params.id);
    if (!patient) {
      set.status = 404;
      return errorResponse("Patient not found");
    }
    return successResponse(patient);
  })
  .put(
    "/:id",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user);
      if (!auth.authorized) {
        set.status = 401;
        return errorResponse(auth.reason || "Unauthorized");
      }

      try {
        const updated = await updatePatient(params.id, body);
        return successResponse(updated, "Patient updated successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to update patient");
      }
    },
    {
      body: t.Object({
        firstName: t.Optional(t.String()),
        middleName: t.Optional(t.String()),
        lastName: t.Optional(t.String()),
        preferredName: t.Optional(t.String()),
        dateOfBirth: t.Optional(t.String()),
        gender: t.Optional(t.Union([t.Literal("MALE"), t.Literal("FEMALE"), t.Literal("OTHER"), t.Literal("UNKNOWN")])),
        bloodGroup: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        email: t.Optional(t.String()),
      }),
    },
  )
  .delete("/:id", async ({ params, user, set }) => {
    const auth = requireAuth(user, ["ADMIN", "DOCTOR", "SUPER_ADMIN"]);
    if (!auth.authorized) {
      set.status = 403;
      return errorResponse(auth.reason || "Forbidden");
    }

    try {
      await deletePatient(params.id);
      return successResponse({ deleted: true }, "Patient archived successfully");
    } catch (err: any) {
      set.status = 400;
      return errorResponse(err.message || "Failed to delete patient");
    }
  })
  .get("/:id/allergies", async ({ params, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const allergies = await getPatientAllergies(params.id);
    return successResponse(allergies);
  })
  .post(
    "/:id/allergies",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user);
      if (!auth.authorized) {
        set.status = 401;
        return errorResponse(auth.reason || "Unauthorized");
      }

      try {
        const allergy = await addPatientAllergy({
          patientId: params.id,
          substance: body.substance,
          reaction: body.reaction,
          severity: body.severity,
          status: body.status,
        });
        return successResponse(allergy, "Allergy recorded successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to add allergy");
      }
    },
    {
      body: t.Object({
        substance: t.String({ minLength: 1 }),
        reaction: t.Optional(t.String()),
        severity: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
    },
  );

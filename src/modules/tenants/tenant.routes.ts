import { Elysia, t } from "elysia";
import { authMiddleware, requireAuth } from "../../shared/middleware/auth.middleware";
import { errorResponse, successResponse } from "../../shared/utils/response";
import {
  createBranch,
  createDepartment,
  createHospital,
  createTenant,
  getHospitalById,
  getTenantById,
  listBranches,
  listDepartments,
  listHospitals,
  listTenants,
  updateHospital,
  updateTenant,
} from "./tenant.service";

export const tenantRoutes = new Elysia({ prefix: "/tenants" })
  .use(authMiddleware)
  .get("/", async () => {
    const tenants = await listTenants();
    return successResponse(tenants);
  })
  .post(
    "/",
    async ({ body, user, set }) => {
      const auth = requireAuth(user, ["SUPER_ADMIN", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }
      try {
        const tenant = await createTenant(body);
        return successResponse(tenant, "Tenant created successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to create tenant");
      }
    },
    {
      body: t.Object({
        code: t.String({ minLength: 2 }),
        name: t.String({ minLength: 2 }),
        legalName: t.Optional(t.String()),
        email: t.Optional(t.String({ format: "email" })),
        phone: t.Optional(t.String()),
        currency: t.Optional(t.String()),
        timezone: t.Optional(t.String()),
      }),
    },
  )
  .get("/:id", async ({ params, set }) => {
    const tenant = await getTenantById(params.id);
    if (!tenant) {
      set.status = 404;
      return errorResponse("Tenant not found");
    }
    return successResponse(tenant);
  })
  .put(
    "/:id",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user, ["SUPER_ADMIN", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }
      try {
        const updated = await updateTenant(params.id, body);
        return successResponse(updated, "Tenant updated successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to update tenant");
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        legalName: t.Optional(t.String()),
        email: t.Optional(t.String({ format: "email" })),
        phone: t.Optional(t.String()),
        currency: t.Optional(t.String()),
        timezone: t.Optional(t.String()),
      }),
    },
  );

export const hospitalRoutes = new Elysia({ prefix: "/hospitals" })
  .use(authMiddleware)
  .get("/", async ({ query }) => {
    const hospitals = await listHospitals(query.tenantId);
    return successResponse(hospitals);
  })
  .post(
    "/",
    async ({ body, user, set }) => {
      const auth = requireAuth(user, ["SUPER_ADMIN", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }
      try {
        const hospital = await createHospital(body);
        return successResponse(hospital, "Hospital created successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to create hospital");
      }
    },
    {
      body: t.Object({
        tenantId: t.String(),
        code: t.String({ minLength: 2 }),
        name: t.String({ minLength: 2 }),
        legalName: t.Optional(t.String()),
        email: t.Optional(t.String({ format: "email" })),
        phone: t.Optional(t.String()),
        currency: t.Optional(t.String()),
        timezone: t.Optional(t.String()),
      }),
    },
  )
  .get("/:id", async ({ params, set }) => {
    const hospital = await getHospitalById(params.id);
    if (!hospital) {
      set.status = 404;
      return errorResponse("Hospital not found");
    }
    return successResponse(hospital);
  })
  .put(
    "/:id",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user, ["SUPER_ADMIN", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }
      try {
        const updated = await updateHospital(params.id, body);
        return successResponse(updated, "Hospital updated successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to update hospital");
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        legalName: t.Optional(t.String()),
        email: t.Optional(t.String({ format: "email" })),
        phone: t.Optional(t.String()),
        currency: t.Optional(t.String()),
        timezone: t.Optional(t.String()),
      }),
    },
  )
  .get("/:id/branches", async ({ params }) => {
    const branches = await listBranches(params.id);
    return successResponse(branches);
  })
  .post(
    "/:id/branches",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user, ["SUPER_ADMIN", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }
      try {
        const branch = await createBranch(params.id, body);
        return successResponse(branch, "Branch created successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to create branch");
      }
    },
    {
      body: t.Object({
        code: t.String({ minLength: 2 }),
        name: t.String({ minLength: 2 }),
        phone: t.Optional(t.String()),
        email: t.Optional(t.String({ format: "email" })),
      }),
    },
  )
  .get("/:id/departments", async ({ params }) => {
    const departments = await listDepartments(params.id);
    return successResponse(departments);
  })
  .post(
    "/:id/departments",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user, ["SUPER_ADMIN", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }
      try {
        const department = await createDepartment(params.id, body);
        return successResponse(department, "Department created successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to create department");
      }
    },
    {
      body: t.Object({
        code: t.String({ minLength: 2 }),
        name: t.String({ minLength: 2 }),
        branchId: t.Optional(t.String()),
        parentId: t.Optional(t.String()),
        description: t.Optional(t.String()),
      }),
    },
  );

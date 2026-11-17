import { Elysia, t } from "elysia";
import { authMiddleware, requireAuth } from "../../shared/middleware/auth.middleware";
import { errorResponse, successResponse } from "../../shared/utils/response";
import {
  createHospital,
  createTenant,
  getTenantById,
  listBranches,
  listDepartments,
  listHospitals,
  listTenants,
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
  });

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
  .get("/:id/branches", async ({ params }) => {
    const branches = await listBranches(params.id);
    return successResponse(branches);
  })
  .get("/:id/departments", async ({ params }) => {
    const departments = await listDepartments(params.id);
    return successResponse(departments);
  });

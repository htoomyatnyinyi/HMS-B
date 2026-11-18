import { Elysia, t } from "elysia";
import { config } from "../../config/env";
import { authMiddleware, jwtPlugin, requireAuth } from "../../shared/middleware/auth.middleware";
import { errorResponse, successResponse } from "../../shared/utils/response";
import { audit, listAuditLogs } from "../../shared/audit";
import {
  assignUserRole,
  authenticateUser,
  createDoctorProfile,
  getUserProfile,
  listDoctors,
  listRoles,
  listUsers,
  registerUser,
  updateUser,
} from "./auth.service";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(jwtPlugin)
  .use(authMiddleware)
  .post(
    "/register",
    async ({ body, set }) => {
      try {
        const user = await registerUser(body);
        return successResponse(user, "User registered successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Registration failed");
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 6 }),
        firstName: t.String({ minLength: 1 }),
        lastName: t.String({ minLength: 1 }),
        username: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        tenantId: t.Optional(t.String()),
        hospitalId: t.Optional(t.String()),
        role: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/login",
    async ({ body, jwt, set }) => {
      const user = await authenticateUser(body);
      if (!user) {
        set.status = 401;
        return errorResponse("Invalid email or password");
      }

      const accessToken = await jwt.sign({
        sub: user.id,
        email: user.email,
        roles: user.roles,
        tenantId: user.tenantId,
        hospitalId: user.hospitalId,
        exp: Math.floor(Date.now() / 1000) + config.jwtExpiresIn,
      });

      await audit({
        userId: user.id,
        email: user.email,
        roles: user.roles,
        tenantId: user.tenantId,
        hospitalId: user.hospitalId,
      }, "LOGIN", "User", user.id);

      return successResponse({
        accessToken,
        tokenType: "Bearer",
        expiresIn: config.jwtExpiresIn,
        user,
      });
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 1 }),
      }),
    },
  )
  .get("/me", async ({ user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const profile = await getUserProfile(user!.userId);
    if (!profile) {
      set.status = 404;
      return errorResponse("User profile not found");
    }

    return successResponse(profile);
  })
  .post("/logout", async ({ user }) => {
    await audit(user, "LOGOUT", "User", user?.userId);
    return successResponse({ loggedOut: true }, "Logged out successfully");
  })
  .get("/users", async ({ query, user, set }) => {
    const auth = requireAuth(user, ["ADMIN", "SUPER_ADMIN"]);
    if (!auth.authorized) {
      set.status = 403;
      return errorResponse(auth.reason || "Forbidden");
    }

    const users = await listUsers(query.hospitalId || user?.hospitalId, query.search);
    return successResponse(users);
  })
  .get("/audit-logs", async ({ user, set }) => {
    const auth = requireAuth(user, ["ADMIN", "SUPER_ADMIN"]);
    if (!auth.authorized) {
      set.status = 403;
      return errorResponse(auth.reason || "Forbidden");
    }
    try {
      return successResponse(await listAuditLogs(user?.hospitalId));
    } catch (err: any) {
      set.status = 500;
      return errorResponse(err.message || "Failed to load audit logs");
    }
  })
  .post(
    "/users",
    async ({ body, user, set }) => {
      const auth = requireAuth(user, ["ADMIN", "SUPER_ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }
      try {
        const created = await registerUser({
          ...body,
          tenantId: user!.tenantId,
          hospitalId: user!.hospitalId,
        });
        await audit(user, "CREATE", "User", created.id, { email: created.email });
        return successResponse(created, "Staff account created successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to create staff account");
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 6 }),
        firstName: t.String({ minLength: 1 }),
        lastName: t.String({ minLength: 1 }),
        username: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        role: t.Optional(t.String()),
      }),
    },
  )
  .put(
    "/users/:id",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user, ["ADMIN", "SUPER_ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }

      try {
        const updated = await updateUser(params.id, body);
        await audit(user, "UPDATE", "User", params.id, { fields: Object.keys(body) });
        return successResponse(updated, "User updated successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to update user");
      }
    },
    {
      body: t.Object({
        firstName: t.Optional(t.String()),
        lastName: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/users/:id/roles",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user, ["ADMIN", "SUPER_ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }

      try {
        const assigned = await assignUserRole(params.id, body.roleId);
        await audit(user, "UPDATE", "UserRole", params.id, { roleId: body.roleId });
        return successResponse(assigned, "Role assigned successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to assign role");
      }
    },
    {
      body: t.Object({
        roleId: t.String({ minLength: 1 }),
      }),
    },
  )
  .get("/roles", async ({ user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const roles = await listRoles(user?.tenantId);
    return successResponse(roles);
  })
  .get("/doctors", async ({ query, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const doctors = await listDoctors(query.hospitalId || user?.hospitalId);
    return successResponse(doctors);
  })
  .post(
    "/doctors",
    async ({ body, user, set }) => {
      const auth = requireAuth(user, ["ADMIN", "SUPER_ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }

      try {
        const profile = await createDoctorProfile(body);
        return successResponse(profile, "Doctor profile created successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to create doctor profile");
      }
    },
    {
      body: t.Object({
        userId: t.String({ minLength: 1 }),
        departmentId: t.Optional(t.String()),
        employeeNo: t.String({ minLength: 1 }),
        licenseNo: t.Optional(t.String()),
        qualification: t.Optional(t.String()),
        consultationFee: t.Optional(t.Number()),
      }),
    },
  );

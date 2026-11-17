import { Elysia, t } from "elysia";
import { config } from "../../config/env";
import { authMiddleware, jwtPlugin, requireAuth } from "../../shared/middleware/auth.middleware";
import { errorResponse, successResponse } from "../../shared/utils/response";
import { authenticateUser, getUserProfile, registerUser } from "./auth.service";

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
  .post("/logout", async () => {
    return successResponse({ loggedOut: true }, "Logged out successfully");
  });

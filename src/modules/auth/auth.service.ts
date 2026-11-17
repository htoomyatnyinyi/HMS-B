import { prisma } from "../../infrastructure/database/prisma";
import type { LoginInput, RegisterInput } from "./auth.types";

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  tenantId?: string;
  hospitalId?: string;
}

export async function registerUser(input: RegisterInput): Promise<AuthenticatedUser> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const passwordHash = await Bun.password.hash(input.password);

  try {
    const user = await prisma.orm.public.User.create({
      email: normalizedEmail,
      username: input.username || normalizedEmail.split("@")[0],
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      status: "ACTIVE",
    });

    return {
      id: String(user.id),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: input.role ? [input.role] : ["STAFF"],
      tenantId: input.tenantId,
      hospitalId: input.hospitalId,
    };
  } catch (error: any) {
    // If DB has custom constraints or fallback
    if (error?.message?.includes("unique") || error?.message?.includes("duplicate")) {
      throw new Error("A user with this email or username already exists");
    }
    throw error;
  }
}

export async function authenticateUser(input: LoginInput): Promise<AuthenticatedUser | null> {
  const normalizedEmail = input.email.trim().toLowerCase();

  try {
    const user = await prisma.orm.public.User
      .where((candidate: any) => candidate.email.ilike(normalizedEmail))
      .first();

    if (!user) {
      return null;
    }

    const passwordMatches = await Bun.password.verify(input.password, user.passwordHash);
    if (!passwordMatches) {
      return null;
    }

    let roles = ["STAFF"];
    try {
      const userRoles = await prisma.orm.public.UserRole
        .where({ userId: user.id })
        .all();
      if (userRoles && userRoles.length > 0) {
        roles = userRoles.map((r: any) => String(r.roleId));
      }
    } catch {
      // If table not yet populated, default to STAFF
    }

    return {
      id: String(user.id),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      tenantId: user.tenantId ? String(user.tenantId) : undefined,
      hospitalId: user.hospitalId ? String(user.hospitalId) : undefined,
    };
  } catch (error) {
    console.error("Auth query error:", error);
    return null;
  }
}

export async function getUserProfile(userId: string): Promise<AuthenticatedUser | null> {
  try {
    const user = await prisma.orm.public.User
      .where({ id: userId })
      .first();

    if (!user) return null;

    return {
      id: String(user.id),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: ["STAFF"],
      tenantId: user.tenantId ? String(user.tenantId) : undefined,
      hospitalId: user.hospitalId ? String(user.hospitalId) : undefined,
    };
  } catch {
    return null;
  }
}

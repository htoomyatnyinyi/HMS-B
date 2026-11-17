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
      tenantId: input.tenantId,
      hospitalId: input.hospitalId,
      email: normalizedEmail,
      username: input.username || normalizedEmail.split("@")[0],
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      status: "ACTIVE",
    });

    if (input.role) {
      try {
        await prisma.orm.public.UserRole.create({
          userId: user.id,
          roleId: input.role,
        });
      } catch {}
    }

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

    if (!user) return null;

    const passwordMatches = await Bun.password.verify(input.password, user.passwordHash);
    if (!passwordMatches) return null;

    let roles = ["STAFF"];
    try {
      const userRoles = await prisma.orm.public.UserRole.where({ userId: user.id }).all();
      if (userRoles && userRoles.length > 0) {
        roles = userRoles.map((r: any) => String(r.roleId));
      }
    } catch {}

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
    const user = await prisma.orm.public.User.where({ id: userId }).first();
    if (!user) return null;

    let roles = ["STAFF"];
    try {
      const userRoles = await prisma.orm.public.UserRole.where({ userId }).all();
      if (userRoles && userRoles.length > 0) {
        roles = userRoles.map((r: any) => String(r.roleId));
      }
    } catch {}

    return {
      id: String(user.id),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      tenantId: user.tenantId ? String(user.tenantId) : undefined,
      hospitalId: user.hospitalId ? String(user.hospitalId) : undefined,
    };
  } catch {
    return null;
  }
}

export async function listUsers(hospitalId?: string, search?: string) {
  try {
    const users = await prisma.orm.public.User.all();
    let filtered = users.filter((u: any) => !u.isDeleted);
    if (hospitalId) {
      filtered = filtered.filter((u: any) => String(u.hospitalId) === String(hospitalId));
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (u: any) =>
          u.firstName?.toLowerCase().includes(q) ||
          u.lastName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q),
      );
    }
    return filtered.map((u: any) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      status: u.status,
      hospitalId: u.hospitalId,
      createdAt: u.createdAt,
    }));
  } catch {
    return [];
  }
}

export async function updateUser(id: string, data: { firstName?: string; lastName?: string; phone?: string; status?: string }) {
  return await prisma.orm.public.User.where({ id }).update(data);
}

export async function assignUserRole(userId: string, roleId: string) {
  return await prisma.orm.public.UserRole.create({
    userId,
    roleId,
    assignedAt: new Date(),
  });
}

export async function listRoles(tenantId?: string) {
  try {
    const roles = await prisma.orm.public.Role.all();
    if (tenantId) {
      return roles.filter((r: any) => String(r.tenantId) === String(tenantId));
    }
    return roles;
  } catch {
    return [];
  }
}

export async function listDoctors(hospitalId?: string) {
  try {
    const doctors = await prisma.orm.public.Doctor.all();
    return doctors;
  } catch {
    return [];
  }
}

export async function createDoctorProfile(data: {
  userId: string;
  departmentId?: string;
  employeeNo: string;
  licenseNo?: string;
  qualification?: string;
  consultationFee?: number;
}) {
  const staff = await prisma.orm.public.Staff.create({
    userId: data.userId,
    departmentId: data.departmentId,
    employeeNo: data.employeeNo,
    licenseNo: data.licenseNo,
    jobTitle: "Consultant Physician",
    isActive: true,
  });

  const doctor = await prisma.orm.public.Doctor.create({
    staffId: staff.id,
    qualification: data.qualification,
    consultationFee: data.consultationFee || 0,
  });

  return {
    staff,
    doctor,
  };
}

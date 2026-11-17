import { prisma } from "../../infrastructure/database/prisma";

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<AuthUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.orm.public.User
    .where((candidate) => candidate.email.ilike(normalizedEmail))
    .first();

  if (
    !user ||
    user.email.toLowerCase() !== normalizedEmail ||
    !user.isActive ||
    !(await Bun.password.verify(password, user.passwordHash))
  ) {
    return null;
  }

  return { id: user.id, email: user.email, fullName: user.fullName };
}

export async function getUserClinicMemberships(userId: number) {
  return prisma.orm.public.ClinicMembership.where({ userId, isActive: true })
    .select("clinicId", "role")
    .all();
}

import { prisma } from "../../infrastructure/database/prisma";
import type { CreateHospitalInput, CreateTenantInput } from "./tenant.types";

export async function listTenants() {
  try {
    return await prisma.orm.public.Tenant.all();
  } catch {
    return [];
  }
}

export async function createTenant(input: CreateTenantInput) {
  return await prisma.orm.public.Tenant.create({
    code: input.code.toUpperCase(),
    name: input.name,
    legalName: input.legalName,
    email: input.email,
    phone: input.phone,
    currency: input.currency || "THB",
    timezone: input.timezone || "Asia/Bangkok",
    isActive: true,
  });
}

export async function getTenantById(id: string) {
  try {
    return await prisma.orm.public.Tenant.where({ id }).first();
  } catch {
    return null;
  }
}

export async function listHospitals(tenantId?: string) {
  try {
    if (tenantId) {
      return await prisma.orm.public.Hospital.where({ tenantId }).all();
    }
    return await prisma.orm.public.Hospital.all();
  } catch {
    return [];
  }
}

export async function createHospital(input: CreateHospitalInput) {
  return await prisma.orm.public.Hospital.create({
    tenantId: input.tenantId,
    code: input.code.toUpperCase(),
    name: input.name,
    legalName: input.legalName,
    email: input.email,
    phone: input.phone,
    timezone: input.timezone || "Asia/Bangkok",
    currency: input.currency || "THB",
    isActive: true,
  });
}

export async function listBranches(hospitalId: string) {
  try {
    return await prisma.orm.public.Branch.where({ hospitalId }).all();
  } catch {
    return [];
  }
}

export async function listDepartments(hospitalId: string) {
  try {
    return await prisma.orm.public.Department.where({ hospitalId }).all();
  } catch {
    return [];
  }
}

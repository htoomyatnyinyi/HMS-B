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

export async function updateTenant(id: string, data: Partial<CreateTenantInput>) {
  return await prisma.orm.public.Tenant.where({ id }).update(data);
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

export async function getHospitalById(id: string) {
  try {
    return await prisma.orm.public.Hospital.where({ id }).first();
  } catch {
    return null;
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

export async function updateHospital(id: string, data: Partial<CreateHospitalInput>) {
  return await prisma.orm.public.Hospital.where({ id }).update(data);
}

export async function listBranches(hospitalId: string) {
  try {
    return await prisma.orm.public.Branch.where({ hospitalId }).all();
  } catch {
    return [];
  }
}

export async function createBranch(hospitalId: string, data: { code: string; name: string; phone?: string; email?: string }) {
  return await prisma.orm.public.Branch.create({
    hospitalId,
    code: data.code.toUpperCase(),
    name: data.name,
    phone: data.phone,
    email: data.email,
    isActive: true,
  });
}

export async function listDepartments(hospitalId: string) {
  try {
    return await prisma.orm.public.Department.where({ hospitalId }).all();
  } catch {
    return [];
  }
}

export async function createDepartment(hospitalId: string, data: { code: string; name: string; branchId?: string; parentId?: string; description?: string }) {
  return await prisma.orm.public.Department.create({
    hospitalId,
    branchId: data.branchId,
    parentId: data.parentId,
    code: data.code.toUpperCase(),
    name: data.name,
    description: data.description,
    isActive: true,
  });
}

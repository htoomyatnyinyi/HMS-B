import { prisma } from "../../infrastructure/database/prisma";
import type { CreateAllergyInput, CreatePatientInput, UpdatePatientInput } from "./patient.types";

export function generateMRN(): string {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `MRN-${datePart}-${randomPart}`;
}

export async function listPatients(params: {
  hospitalId?: string;
  tenantId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));

  try {
    const patients = await prisma.orm.public.Patient.all();
    const active = patients.filter((p: any) => !p.isDeleted);

    let filtered = active;
    if (params.hospitalId) {
      filtered = filtered.filter((p: any) => String(p.hospitalId) === String(params.hospitalId));
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (p: any) =>
          p.firstName?.toLowerCase().includes(q) ||
          p.lastName?.toLowerCase().includes(q) ||
          p.mrn?.toLowerCase().includes(q) ||
          p.phone?.includes(q),
      );
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      items: paginated,
      total,
      page,
      limit,
    };
  } catch (error) {
    console.error("List patients error:", error);
    return { items: [], total: 0, page, limit };
  }
}

export async function getPatientById(id: string) {
  try {
    const patient = await prisma.orm.public.Patient.where({ id }).first();
    if (!patient || patient.isDeleted) return null;

    let allergies: any[] = [];
    let conditions: any[] = [];
    try {
      allergies = await prisma.orm.public.PatientAllergy.where({ patientId: id }).all();
    } catch {}
    try {
      conditions = await prisma.orm.public.Condition.where({ patientId: id }).all();
    } catch {}

    return {
      ...patient,
      allergiesList: allergies,
      conditions,
    };
  } catch {
    return null;
  }
}

export async function createPatient(input: CreatePatientInput) {
  const mrn = input.mrn || generateMRN();

  return await prisma.orm.public.Patient.create({
    tenantId: input.tenantId,
    hospitalId: input.hospitalId,
    branchId: input.branchId,
    mrn,
    nationalId: input.nationalId,
    firstName: input.firstName,
    middleName: input.middleName,
    lastName: input.lastName,
    preferredName: input.preferredName,
    dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
    gender: input.gender || "UNKNOWN",
    bloodGroup: input.bloodGroup || "UNKNOWN",
    maritalStatus: input.maritalStatus || "UNKNOWN",
    phone: input.phone,
    email: input.email,
    address: input.address,
    emergencyContact: input.emergencyContact,
    isActive: true,
    isDeleted: false,
  });
}

export async function updatePatient(id: string, input: UpdatePatientInput) {
  return await prisma.orm.public.Patient.where({ id }).update({
    firstName: input.firstName,
    middleName: input.middleName,
    lastName: input.lastName,
    preferredName: input.preferredName,
    dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
    gender: input.gender,
    bloodGroup: input.bloodGroup,
    phone: input.phone,
    email: input.email,
    address: input.address,
    emergencyContact: input.emergencyContact,
  });
}

export async function deletePatient(id: string) {
  return await prisma.orm.public.Patient.where({ id }).update({
    isDeleted: true,
    isActive: false,
  });
}

export async function addPatientAllergy(input: CreateAllergyInput) {
  return await prisma.orm.public.PatientAllergy.create({
    patientId: input.patientId,
    substance: input.substance,
    reaction: input.reaction,
    severity: input.severity || "MODERATE",
    status: input.status || "ACTIVE",
    recordedAt: new Date(),
  });
}

export async function getPatientAllergies(patientId: string) {
  try {
    return await prisma.orm.public.PatientAllergy.where({ patientId }).all();
  } catch {
    return [];
  }
}

export async function addPatientCondition(patientId: string, data: { display: string; code?: string; clinicalStatus?: string; onsetAt?: string; notes?: string }) {
  return await prisma.orm.public.Condition.create({
    patientId,
    display: data.display,
    code: data.code,
    clinicalStatus: data.clinicalStatus || "ACTIVE",
    onsetAt: data.onsetAt ? new Date(data.onsetAt) : new Date(),
    notes: data.notes,
  });
}

export async function getPatientConditions(patientId: string) {
  try {
    return await prisma.orm.public.Condition.where({ patientId }).all();
  } catch {
    return [];
  }
}

export async function getPatientEncounters(patientId: string) {
  try {
    return await prisma.orm.public.Encounter.where({ patientId }).all();
  } catch {
    return [];
  }
}

export async function getPatientPrescriptions(patientId: string) {
  try {
    return await prisma.orm.public.Prescription.where({ patientId }).all();
  } catch {
    return [];
  }
}

export async function getPatientAppointments(patientId: string) {
  try {
    return await prisma.orm.public.Appointment.where({ patientId }).all();
  } catch {
    return [];
  }
}

export async function getPatientInvoices(patientId: string) {
  try {
    return await prisma.orm.public.Invoice.where({ patientId }).all();
  } catch {
    return [];
  }
}

export async function addPatientDocument(patientId: string, data: { title: string; documentType?: any; fileName: string; storageKey: string; mimeType?: string; fileSize?: number }) {
  return await prisma.orm.public.PatientDocument.create({
    patientId,
    title: data.title,
    documentType: data.documentType || "OTHER",
    fileName: data.fileName,
    storageKey: data.storageKey,
    mimeType: data.mimeType,
    fileSize: data.fileSize,
    createdAt: new Date(),
  });
}

export async function getPatientDocuments(patientId: string) {
  try {
    return await prisma.orm.public.PatientDocument.where({ patientId }).all();
  } catch {
    return [];
  }
}

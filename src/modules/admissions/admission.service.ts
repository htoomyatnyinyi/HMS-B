import { prisma } from "../../infrastructure/database/prisma";
import type { AdmitPatientInput, DischargePatientInput, TransferBedInput } from "./admission.types";

export function generateAdmissionNo(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.floor(100 + Math.random() * 900);
  return `ADM-${date}-${rand}`;
}

export async function listAdmissions(hospitalId?: string, status?: string) {
  try {
    const list = await prisma.orm.public.Admission.all();
    let filtered = list;
    if (hospitalId) {
      filtered = filtered.filter((a: any) => String(a.hospitalId) === String(hospitalId));
    }
    if (status) {
      filtered = filtered.filter((a: any) => a.status === status);
    }
    return filtered;
  } catch (error) {
    console.error("List admissions error:", error);
    return [];
  }
}

export async function getAdmissionById(id: string) {
  try {
    return await prisma.orm.public.Admission.where({ id }).first();
  } catch {
    return null;
  }
}

export async function admitPatient(input: AdmitPatientInput) {
  const admissionNo = generateAdmissionNo();

  if (input.bedId) {
    try {
      await prisma.orm.public.Bed.where({ id: input.bedId }).update({
        status: "OCCUPIED",
      });
    } catch {}
  }

  return await prisma.orm.public.Admission.create({
    hospitalId: input.hospitalId,
    patientId: input.patientId,
    encounterId: input.encounterId,
    bedId: input.bedId,
    admissionNo,
    status: "ADMITTED",
    admittedAt: new Date(),
    admissionReason: input.admissionReason,
    attendingDoctorName: input.attendingDoctorName,
  });
}

export async function transferBed(input: TransferBedInput) {
  // Update old bed status
  if (input.fromBedId) {
    try {
      await prisma.orm.public.Bed.where({ id: input.fromBedId }).update({ status: "AVAILABLE" });
    } catch {}
  }

  // Update new bed status
  try {
    await prisma.orm.public.Bed.where({ id: input.toBedId }).update({ status: "OCCUPIED" });
  } catch {}

  // Update admission record
  await prisma.orm.public.Admission.where({ id: input.admissionId }).update({
    bedId: input.toBedId,
    status: "TRANSFERRED",
  });

  // Record transfer log
  return await prisma.orm.public.BedTransfer.create({
    admissionId: input.admissionId,
    fromBedId: input.fromBedId,
    toBedId: input.toBedId,
    reason: input.reason,
    transferredAt: new Date(),
  });
}

export async function dischargePatient(input: DischargePatientInput) {
  const admission = await prisma.orm.public.Admission.where({ id: input.admissionId }).first();

  if (admission?.bedId) {
    try {
      await prisma.orm.public.Bed.where({ id: admission.bedId }).update({ status: "AVAILABLE" });
    } catch {}
  }

  return await prisma.orm.public.Admission.where({ id: input.admissionId }).update({
    status: "DISCHARGED",
    dischargedAt: new Date(),
    dischargeDiagnosis: input.dischargeDiagnosis,
    dischargeSummary: input.dischargeSummary,
  });
}

export async function listWards(hospitalId?: string) {
  try {
    const wards = await prisma.orm.public.Ward.all();
    if (hospitalId) {
      return wards.filter((w: any) => String(w.hospitalId) === String(hospitalId));
    }
    return wards;
  } catch {
    return [];
  }
}

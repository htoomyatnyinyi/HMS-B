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
    const patients = await prisma.orm.public.Patient.all();
    const beds = await prisma.orm.public.Bed.all();
    const wards = await prisma.orm.public.Ward.all();
    return filtered.map((admission: any) => {
      const patient = patients.find((item: any) => String(item.id) === String(admission.patientId));
      const bed = beds.find((item: any) => String(item.id) === String(admission.bedId));
      const ward = wards.find((item: any) => String(item.id) === String(bed?.wardId));
      return {
        ...admission,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : undefined,
        bedNo: bed?.bedNo,
        wardName: ward?.name,
      };
    });
  } catch (error) {
    console.error("List admissions error:", error);
    return [];
  }
}

export async function getAdmissionById(id: string) {
  try {
    const admission = await prisma.orm.public.Admission.where({ id }).first();
    if (!admission) return null;
    let transfers: any[] = [];
    try {
      transfers = await prisma.orm.public.BedTransfer.where({ admissionId: id }).all();
    } catch {}
    return {
      ...admission,
      transfers,
    };
  } catch {
    return null;
  }
}

export async function admitPatient(input: AdmitPatientInput) {
  const admissionNo = generateAdmissionNo();
  return await prisma.transaction(async (tx) => {
    if (input.bedId) {
      const bed = await tx.orm.public.Bed.where({ id: input.bedId }).first();
      if (!bed) throw new Error("Bed not found");
      if (bed.status !== "AVAILABLE") throw new Error("Selected bed is not available");
      await tx.orm.public.Bed.where({ id: input.bedId }).update({ status: "OCCUPIED" });
    }
    return await tx.orm.public.Admission.create({
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
  });
}

export async function transferBed(input: TransferBedInput) {
  return await prisma.transaction(async (tx) => {
    const toBed = await tx.orm.public.Bed.where({ id: input.toBedId }).first();
    if (!toBed) throw new Error("Destination bed not found");
    if (toBed.status !== "AVAILABLE") throw new Error("Destination bed is not available");
    if (input.fromBedId) await tx.orm.public.Bed.where({ id: input.fromBedId }).update({ status: "AVAILABLE" });
    await tx.orm.public.Bed.where({ id: input.toBedId }).update({ status: "OCCUPIED" });
    await tx.orm.public.Admission.where({ id: input.admissionId }).update({ bedId: input.toBedId, status: "TRANSFERRED" });
    return await tx.orm.public.BedTransfer.create({
      admissionId: input.admissionId,
      fromBedId: input.fromBedId,
      toBedId: input.toBedId,
      reason: input.reason,
      transferredAt: new Date(),
    });
  });
}

export async function dischargePatient(input: DischargePatientInput) {
  return await prisma.transaction(async (tx) => {
    const admission = await tx.orm.public.Admission.where({ id: input.admissionId }).first();
    if (!admission) throw new Error("Admission not found");
    if (admission.bedId) await tx.orm.public.Bed.where({ id: admission.bedId }).update({ status: "AVAILABLE" });
    return await tx.orm.public.Admission.where({ id: input.admissionId }).update({
      status: "DISCHARGED",
      dischargedAt: new Date(),
      dischargeDiagnosis: input.dischargeDiagnosis,
      dischargeSummary: input.dischargeSummary,
    });
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

export async function createWard(hospitalId: string, data: { code: string; name: string; wardType?: string; floor?: string }) {
  return await prisma.orm.public.Ward.create({
    hospitalId,
    code: data.code.toUpperCase(),
    name: data.name,
    wardType: data.wardType,
    floor: data.floor,
  });
}

export async function listRooms(wardId: string) {
  try {
    return await prisma.orm.public.Room.where({ wardId }).all();
  } catch {
    return [];
  }
}

export async function createRoom(hospitalId: string, wardId: string, data: { roomNo: string; roomType?: string }) {
  return await prisma.orm.public.Room.create({
    hospitalId,
    wardId,
    roomNo: data.roomNo,
    roomType: data.roomType,
  });
}

export async function listBeds(wardId?: string, status?: string) {
  try {
    const beds = await prisma.orm.public.Bed.all();
    let filtered = beds;
    if (wardId) {
      filtered = filtered.filter((b: any) => String(b.wardId) === String(wardId));
    }
    if (status) {
      filtered = filtered.filter((b: any) => b.status === status);
    }
    return filtered;
  } catch {
    return [];
  }
}

export async function createBed(hospitalId: string, wardId: string, data: { bedNo: string; roomId?: string; bedType?: string; dailyRate?: number }) {
  return await prisma.orm.public.Bed.create({
    hospitalId,
    wardId,
    roomId: data.roomId,
    bedNo: data.bedNo,
    bedType: data.bedType,
    dailyRate: data.dailyRate,
    status: "AVAILABLE",
  });
}

export async function updateBedStatus(bedId: string, status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "CLEANING" | "MAINTENANCE" | "BLOCKED") {
  return await prisma.orm.public.Bed.where({ id: bedId }).update({ status });
}

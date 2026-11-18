import { prisma } from "../../infrastructure/database/prisma";
import type { ScheduleSurgeryInput, SurgeryStatus } from "./surgery.types";

export function generateSurgeryNo(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.floor(100 + Math.random() * 900);
  return `SUR-${date}-${rand}`;
}

export async function listOperatingRooms(hospitalId?: string) {
  try {
    const list = await prisma.orm.public.OperatingRoom.all();
    if (hospitalId) {
      return list.filter((r: any) => String(r.hospitalId) === String(hospitalId) && r.isActive);
    }
    return list.filter((r: any) => r.isActive);
  } catch {
    return [];
  }
}

export async function createOperatingRoom(hospitalId: string, data: { code: string; name: string; location?: string }) {
  return await prisma.orm.public.OperatingRoom.create({
    hospitalId,
    code: data.code.toUpperCase(),
    name: data.name,
    location: data.location,
    isActive: true,
  });
}

export async function listSurgeries(hospitalId?: string, status?: string) {
  try {
    const list = await prisma.orm.public.Surgery.all();
    if (status) {
      return list.filter((s: any) => s.status === status);
    }
    return list;
  } catch {
    return [];
  }
}

export async function getSurgeryById(id: string) {
  try {
    return await prisma.orm.public.Surgery.where({ id }).first();
  } catch {
    return null;
  }
}

export async function scheduleSurgery(input: ScheduleSurgeryInput) {
  const surgeryNo = generateSurgeryNo();

  return await prisma.orm.public.Surgery.create({
    operatingRoomId: input.operatingRoomId,
    doctorId: input.doctorId,
    patientId: input.patientId,
    surgeryNo,
    procedureName: input.procedureName,
    status: "SCHEDULED",
    scheduledStart: new Date(input.scheduledStart),
    scheduledEnd: input.scheduledEnd ? new Date(input.scheduledEnd) : undefined,
    anesthesiaNotes: input.anesthesiaNotes,
    operativeNotes: input.operativeNotes,
  });
}

export async function updateSurgeryStatus(id: string, status: SurgeryStatus, notes?: { actualStart?: string; actualEnd?: string; operativeNotes?: string }) {
  return await prisma.orm.public.Surgery.where({ id }).update({
    status,
    actualStart: notes?.actualStart ? new Date(notes.actualStart) : undefined,
    actualEnd: notes?.actualEnd ? new Date(notes.actualEnd) : undefined,
    operativeNotes: notes?.operativeNotes,
  });
}

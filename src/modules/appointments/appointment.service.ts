import { prisma } from "../../infrastructure/database/prisma";
import type { AppointmentStatus, BookAppointmentInput } from "./appointment.types";

export function generateAppointmentNo(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.floor(100 + Math.random() * 900);
  return `APT-${date}-${rand}`;
}

export async function listAppointments(params: {
  hospitalId?: string;
  doctorId?: string;
  patientId?: string;
  status?: AppointmentStatus;
  date?: string;
}) {
  try {
    const list = await prisma.orm.public.Appointment.all();
    let filtered = list;

    if (params.hospitalId) {
      filtered = filtered.filter((a: any) => String(a.hospitalId) === String(params.hospitalId));
    }
    if (params.doctorId) {
      filtered = filtered.filter((a: any) => String(a.doctorId) === String(params.doctorId));
    }
    if (params.patientId) {
      filtered = filtered.filter((a: any) => String(a.patientId) === String(params.patientId));
    }
    if (params.status) {
      filtered = filtered.filter((a: any) => a.status === params.status);
    }
    if (params.date) {
      const targetDate = params.date.slice(0, 10);
      filtered = filtered.filter((a: any) => new Date(a.startAt).toISOString().slice(0, 10) === targetDate);
    }

    return filtered;
  } catch (error) {
    console.error("List appointments error:", error);
    return [];
  }
}

export async function getAppointmentById(id: string) {
  try {
    return await prisma.orm.public.Appointment.where({ id }).first();
  } catch {
    return null;
  }
}

export async function bookAppointment(input: BookAppointmentInput) {
  const appointmentNo = generateAppointmentNo();

  return await prisma.orm.public.Appointment.create({
    hospitalId: input.hospitalId,
    branchId: input.branchId,
    patientId: input.patientId,
    doctorId: input.doctorId,
    departmentId: input.departmentId,
    createdById: input.createdById,
    appointmentNo,
    startAt: new Date(input.startAt),
    endAt: new Date(input.endAt),
    status: "BOOKED",
    reason: input.reason,
    notes: input.notes,
  });
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus, notes?: string) {
  return await prisma.orm.public.Appointment.where({ id }).update({
    status,
    notes: notes || undefined,
  });
}

import { prisma } from "../../infrastructure/database/prisma";
import type { CreatePrescriptionInput } from "./prescription.types";

export function generatePrescriptionNo(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.floor(100 + Math.random() * 900);
  return `RX-${date}-${rand}`;
}

export async function listPrescriptions(params: {
  patientId?: string;
  encounterId?: string;
  doctorId?: string;
}) {
  try {
    const list = await prisma.orm.public.Prescription.all();
    let filtered = list;

    if (params.patientId) {
      filtered = filtered.filter((p: any) => String(p.patientId) === String(params.patientId));
    }
    if (params.encounterId) {
      filtered = filtered.filter((p: any) => String(p.encounterId) === String(params.encounterId));
    }
    if (params.doctorId) {
      filtered = filtered.filter((p: any) => String(p.doctorId) === String(params.doctorId));
    }

    return await Promise.all(filtered.map(async (prescription: any) => ({
      ...prescription,
      items: await prisma.orm.public.PrescriptionItem.where({ prescriptionId: prescription.id }).all(),
    })));
  } catch (error) {
    console.error("List prescriptions error:", error);
    return [];
  }
}

export async function getPrescriptionById(id: string) {
  try {
    const prescription = await prisma.orm.public.Prescription.where({ id }).first();
    if (!prescription) return null;

    let items: any[] = [];
    try {
      items = await prisma.orm.public.PrescriptionItem.where({ prescriptionId: id }).all();
    } catch {}

    return {
      ...prescription,
      items,
    };
  } catch {
    return null;
  }
}

export async function createPrescription(input: CreatePrescriptionInput) {
  const prescriptionNo = generatePrescriptionNo();

  let doctorId = input.doctorId;
  if (!doctorId && input.userId) {
    const staff = await prisma.orm.public.Staff.where({ userId: input.userId }).first();
    if (staff) {
      const doctor = await prisma.orm.public.Doctor.where({ staffId: staff.id }).first();
      doctorId = doctor?.id;
    }
  }

  const prescription = await prisma.orm.public.Prescription.create({
    patientId: input.patientId,
    encounterId: input.encounterId,
    doctorId,
    prescriptionNo,
    status: "ACTIVE",
    prescribedAt: new Date(),
    notes: input.notes,
  });

  const createdItems = [];
  for (const item of input.items) {
    try {
      const createdItem = await prisma.orm.public.PrescriptionItem.create({
        prescriptionId: prescription.id,
        medicineId: item.medicineId,
        dose: item.dose,
        route: item.route,
        frequency: item.frequency,
        durationDays: item.durationDays,
        quantity: item.quantity,
        instructions: item.instructions,
      });
      createdItems.push(createdItem);
    } catch (err) {
      console.error("Error creating prescription item:", err);
    }
  }

  return {
    ...prescription,
    items: createdItems,
  };
}

export async function cancelPrescription(id: string) {
  return await prisma.orm.public.Prescription.where({ id }).update({
    status: "CANCELLED",
  });
}

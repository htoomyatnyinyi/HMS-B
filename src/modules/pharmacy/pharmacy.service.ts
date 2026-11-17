import { prisma } from "../../infrastructure/database/prisma";
import type { CreateDispensationInput, CreateMedicineInput, StockMovementInput } from "./pharmacy.types";

export function generateDispensationNo(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.floor(100 + Math.random() * 900);
  return `DSP-${date}-${rand}`;
}

export async function listMedicines(pharmacyId?: string, search?: string) {
  try {
    const list = await prisma.orm.public.Medicine.all();
    let filtered = list.filter((m: any) => m.isActive);

    if (pharmacyId) {
      filtered = filtered.filter((m: any) => String(m.pharmacyId) === String(pharmacyId));
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (m: any) =>
          m.name?.toLowerCase().includes(q) ||
          m.genericName?.toLowerCase().includes(q) ||
          m.code?.toLowerCase().includes(q),
      );
    }
    return filtered;
  } catch (error) {
    console.error("List medicines error:", error);
    return [];
  }
}

export async function createMedicine(input: CreateMedicineInput) {
  return await prisma.orm.public.Medicine.create({
    pharmacyId: input.pharmacyId,
    code: input.code.toUpperCase(),
    name: input.name,
    genericName: input.genericName,
    strength: input.strength,
    dosageForm: input.dosageForm,
    route: input.route,
    manufacturer: input.manufacturer,
    barcode: input.barcode,
    unit: input.unit || "unit",
    reorderLevel: input.reorderLevel,
    isControlled: input.isControlled || false,
    isActive: true,
  });
}

export async function listInventory(locationId?: string) {
  try {
    const list = await prisma.orm.public.StockItem.all();
    if (locationId) {
      return list.filter((item: any) => String(item.locationId) === String(locationId));
    }
    return list;
  } catch {
    return [];
  }
}

export async function createDispensation(input: CreateDispensationInput) {
  const dispensationNo = generateDispensationNo();

  const dispensation = await prisma.orm.public.Dispensation.create({
    pharmacyId: input.pharmacyId,
    prescriptionId: input.prescriptionId,
    dispensationNo,
    status: "COMPLETED",
    dispensedAt: new Date(),
    pharmacistName: input.pharmacistName,
  });

  const createdItems = [];
  for (const item of input.items) {
    try {
      const dispensedItem = await prisma.orm.public.DispensedItem.create({
        dispensationId: dispensation.id,
        prescriptionItemId: item.prescriptionItemId,
        quantity: item.quantity,
      });
      createdItems.push(dispensedItem);
    } catch (err) {
      console.error("Error creating dispensed item:", err);
    }
  }

  // Update prescription status to COMPLETED
  try {
    await prisma.orm.public.Prescription.where({ id: input.prescriptionId }).update({
      status: "COMPLETED",
    });
  } catch {}

  return {
    ...dispensation,
    items: createdItems,
  };
}

export async function recordStockMovement(input: StockMovementInput) {
  return await prisma.orm.public.StockMovement.create({
    locationId: input.locationId,
    medicineCode: input.medicineCode,
    batchNo: input.batchNo,
    movementType: input.movementType,
    quantity: input.quantity,
    unitCost: input.unitCost,
    referenceNo: input.referenceNo,
    notes: input.notes,
    occurredAt: new Date(),
  });
}

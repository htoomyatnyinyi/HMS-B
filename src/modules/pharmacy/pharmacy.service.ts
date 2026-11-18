import { prisma } from "../../infrastructure/database/prisma";
import type { CreateDispensationInput, CreateMedicineInput, StockMovementInput } from "./pharmacy.types";

export function generateDispensationNo(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.floor(100 + Math.random() * 900);
  return `DSP-${date}-${rand}`;
}

export function generateOrderNo(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.floor(100 + Math.random() * 900);
  return `PO-${date}-${rand}`;
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
    const stockItems = await prisma.orm.public.StockItem.all();
    return filtered.map((medicine: any) => ({
      ...medicine,
      stockQuantity: stockItems
        .filter((item: any) => String(item.medicineId) === String(medicine.id))
        .reduce((total: number, item: any) => total + Number(item.quantity || 0), 0),
    }));
  } catch (error) {
    console.error("List medicines error:", error);
    return [];
  }
}

export async function getMedicineById(id: string) {
  try {
    return await prisma.orm.public.Medicine.where({ id }).first();
  } catch {
    return null;
  }
}

export async function getDefaultPharmacy(hospitalId?: string) {
  const pharmacies = await prisma.orm.public.Pharmacy.all();
  return pharmacies.find((pharmacy: any) =>
    !hospitalId || String(pharmacy.hospitalId) === String(hospitalId),
  ) || null;
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

export async function updateMedicine(id: string, data: Partial<CreateMedicineInput>) {
  return await prisma.orm.public.Medicine.where({ id }).update(data);
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

export async function listDispensations(pharmacyId?: string) {
  try {
    const list = await prisma.orm.public.Dispensation.all();
    if (pharmacyId) {
      return list.filter((d: any) => String(d.pharmacyId) === String(pharmacyId));
    }
    return list;
  } catch {
    return [];
  }
}

export async function getDispensationById(id: string) {
  try {
    const dispensation = await prisma.orm.public.Dispensation.where({ id }).first();
    if (!dispensation) return null;
    let items: any[] = [];
    try {
      items = await prisma.orm.public.DispensedItem.where({ dispensationId: id }).all();
    } catch {}
    return {
      ...dispensation,
      items,
    };
  } catch {
    return null;
  }
}

export async function createDispensation(input: CreateDispensationInput) {
  const dispensationNo = generateDispensationNo();
  return await prisma.transaction(async (tx) => {
    const pharmacy = await tx.orm.public.Pharmacy.where({ id: input.pharmacyId }).first();
    const location = pharmacy
      ? await tx.orm.public.InventoryLocation.where({ hospitalId: pharmacy.hospitalId }).first()
      : null;
    if (!location) throw new Error("No inventory location is configured for this pharmacy");

    const stockAllocations: Array<{ stockItem: any; quantity: number; medicineCode: string }> = [];
    for (const item of input.items) {
      const prescriptionItem = await tx.orm.public.PrescriptionItem.where({ id: item.prescriptionItemId }).first();
      if (!prescriptionItem) throw new Error("Prescription item not found");
      const medicine = await tx.orm.public.Medicine.where({ id: prescriptionItem.medicineId }).first();
      if (!medicine) throw new Error("Medicine not found for prescription item");
      const stockItems = await tx.orm.public.StockItem.where({ locationId: location.id, medicineId: medicine.id }).all();
      const stockItem = stockItems.find((candidate: any) => Number(candidate.quantity || 0) >= item.quantity);
      if (!stockItem) throw new Error(`Insufficient stock for ${medicine.name}`);
      stockAllocations.push({ stockItem, quantity: item.quantity, medicineCode: medicine.code });
    }

    const dispensation = await tx.orm.public.Dispensation.create({
      pharmacyId: input.pharmacyId,
      prescriptionId: input.prescriptionId,
      dispensationNo,
      status: "COMPLETED",
      dispensedAt: new Date(),
      pharmacistName: input.pharmacistName,
    });
    const createdItems = [];
    for (const item of input.items) {
      createdItems.push(await tx.orm.public.DispensedItem.create({
        dispensationId: dispensation.id,
        prescriptionItemId: item.prescriptionItemId,
        quantity: item.quantity,
      }));
    }
    for (const allocation of stockAllocations) {
      await tx.orm.public.StockItem.where({ id: allocation.stockItem.id }).update({
        quantity: Number(allocation.stockItem.quantity) - allocation.quantity,
      });
      await tx.orm.public.StockMovement.create({
        locationId: location.id,
        medicineCode: allocation.medicineCode,
        batchNo: allocation.stockItem.batchNo,
        movementType: "DISPENSE",
        quantity: allocation.quantity,
        referenceNo: dispensationNo,
        occurredAt: new Date(),
      });
    }
    await tx.orm.public.Prescription.where({ id: input.prescriptionId }).update({ status: "COMPLETED" });
    return { ...dispensation, items: createdItems };
  });
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

export async function listSuppliers(tenantId?: string) {
  try {
    const list = await prisma.orm.public.Supplier.all();
    if (tenantId) {
      return list.filter((s: any) => String(s.tenantId) === String(tenantId) && s.isActive);
    }
    return list.filter((s: any) => s.isActive);
  } catch {
    return [];
  }
}

export async function createSupplier(tenantId: string, data: { code: string; name: string; contactName?: string; phone?: string; email?: string }) {
  return await prisma.orm.public.Supplier.create({
    tenantId,
    code: data.code.toUpperCase(),
    name: data.name,
    contactName: data.contactName,
    phone: data.phone,
    email: data.email,
    isActive: true,
  });
}

export async function listPurchaseOrders(supplierId?: string) {
  try {
    const list = await prisma.orm.public.PurchaseOrder.all();
    if (supplierId) {
      return list.filter((p: any) => String(p.supplierId) === String(supplierId));
    }
    return list;
  } catch {
    return [];
  }
}

export async function createPurchaseOrder(supplierId: string, items: { itemCode: string; description: string; quantity: number; unitCost: number }[]) {
  const orderNo = generateOrderNo();
  const subtotal = items.reduce((acc, curr) => acc + curr.quantity * curr.unitCost, 0);

  const po = await prisma.orm.public.PurchaseOrder.create({
    supplierId,
    orderNo,
    status: "SUBMITTED",
    orderedAt: new Date(),
    subtotal,
    total: subtotal,
  });

  for (const item of items) {
    try {
      await prisma.orm.public.PurchaseOrderItem.create({
        purchaseOrderId: po.id,
        itemCode: item.itemCode,
        description: item.description,
        quantity: item.quantity,
        unitCost: item.unitCost,
      });
    } catch {}
  }

  return po;
}

export async function receivePurchaseOrder(id: string) {
  return await prisma.orm.public.PurchaseOrder.where({ id }).update({
    status: "RECEIVED",
    receivedAt: new Date(),
  });
}

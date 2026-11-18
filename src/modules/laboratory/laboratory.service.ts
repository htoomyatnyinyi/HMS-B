import { prisma } from "../../infrastructure/database/prisma";
import type { CreateLabOrderInput, SubmitLabResultInput } from "./laboratory.types";

export function generateRequestNo(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `LAB-${date}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export function generateAccessionNo(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `ACC-${date}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function listLabTests(laboratoryId?: string) {
  try {
    const list = await prisma.orm.public.LabTest.all();
    if (laboratoryId) {
      return list.filter((t: any) => String(t.laboratoryId) === String(laboratoryId) && t.isActive);
    }
    return list.filter((t: any) => t.isActive);
  } catch {
    return [];
  }
}

export async function createLabTest(data: { laboratoryId: string; code: string; name: string; loincCode?: string; specimenType?: string; unit?: string; price?: number }) {
  return await prisma.orm.public.LabTest.create({
    laboratoryId: data.laboratoryId,
    code: data.code.toUpperCase(),
    name: data.name,
    loincCode: data.loincCode,
    specimenType: data.specimenType,
    unit: data.unit,
    price: data.price,
    isActive: true,
  });
}

export async function listLabOrders(laboratoryId?: string) {
  try {
    const list = await prisma.orm.public.LabOrder.all();
    if (laboratoryId) {
      return list.filter((o: any) => String(o.laboratoryId) === String(laboratoryId));
    }
    return list;
  } catch {
    return [];
  }
}

export async function getLabOrderById(id: string) {
  try {
    const order = await prisma.orm.public.LabOrder.where({ id }).first();
    if (!order) return null;

    let items: any[] = [];
    try {
      items = await prisma.orm.public.LabOrderItem.where({ labOrderId: id }).all();
    } catch {}

    const detailedItems = await Promise.all(items.map(async (item: any) => ({
      ...item,
      specimen: await prisma.orm.public.Specimen.where({ labOrderItemId: item.id }).first(),
      result: await prisma.orm.public.LabResult.where({ labOrderItemId: item.id }).first(),
    })));

    return {
      ...order,
      items: detailedItems,
    };
  } catch {
    return null;
  }
}

export async function createLabOrder(input: CreateLabOrderInput) {
  const requestNo = generateRequestNo();

  const serviceRequest = await prisma.orm.public.ServiceRequest.create({
    patientId: input.patientId,
    encounterId: input.encounterId,
    requestNo,
    category: "LABORATORY",
    description: `Laboratory Test Order (${input.testIds.length} tests)`,
    priority: input.priority || "ROUTINE",
    status: "ACTIVE",
    orderedAt: new Date(),
    notes: input.notes,
  });

  const labOrder = await prisma.orm.public.LabOrder.create({
    serviceRequestId: serviceRequest.id,
    laboratoryId: input.laboratoryId,
    status: "ACTIVE",
    orderedAt: new Date(),
  });

  const createdItems = [];
  for (const testId of input.testIds) {
    try {
      const item = await prisma.orm.public.LabOrderItem.create({
        labOrderId: labOrder.id,
        labTestId: testId,
        status: "PENDING",
      });
      createdItems.push(item);
    } catch (err) {
      console.error("Error creating lab order item:", err);
    }
  }

  return {
    ...labOrder,
    serviceRequest,
    items: createdItems,
  };
}

export async function collectSpecimen(orderItemId: string, specimenType: string, collectedBy?: string) {
  const accessionNo = generateAccessionNo();

  const specimen = await prisma.orm.public.Specimen.create({
    labOrderItemId: orderItemId,
    accessionNo,
    specimenType,
    status: "COLLECTED",
    collectedAt: new Date(),
    collectedBy,
  });

  try {
    await prisma.orm.public.LabOrderItem.where({ id: orderItemId }).update({
      status: "IN_PROCESS",
    });
  } catch {}

  return specimen;
}

export async function submitLabResult(input: SubmitLabResultInput) {
  const result = await prisma.orm.public.LabResult.create({
    labOrderItemId: input.orderItemId,
    status: "FINAL",
    valueText: input.valueText,
    valueNumber: input.valueNumber,
    unit: input.unit,
    referenceRange: input.referenceRange,
    abnormalFlag: input.abnormalFlag,
    remarks: input.remarks,
    verifiedBy: input.verifiedBy,
    verifiedAt: new Date(),
    resultedAt: new Date(),
  });

  try {
    await prisma.orm.public.LabOrderItem.where({ id: input.orderItemId }).update({
      status: "FINAL",
    });
  } catch {}

  return result;
}

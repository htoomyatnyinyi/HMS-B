import { createHash } from "node:crypto";
import { prisma } from "../../infrastructure/database/prisma";

export type StockActor = { clinicId: number; userId: number };
type PrismaTransaction = Parameters<Parameters<typeof prisma.transaction>[0]>[0];
type MovementKind = "RECEIPT" | "RETURN" | "DISPENSE" | "ADJUSTMENT" | "TRANSFER";

export class InventoryError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

function milliUnits(value: string | number): bigint {
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,3})?$/.test(text)) {
    throw new InventoryError("Quantity must be positive and have at most 3 decimal places");
  }
  const [whole, fraction = ""] = text.split(".");
  const result = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, "0"));
  if (result <= 0n) throw new InventoryError("Quantity must be greater than zero");
  return result;
}

function asMilliUnits(value: string | number | bigint): bigint {
  if (typeof value === "bigint") return value;
  const text = String(value);
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match || (match[2]?.length ?? 0) > 3) {
    throw new InventoryError("Stored inventory quantity has invalid precision", 500);
  }
  return BigInt(match[1]!) * 1000n + BigInt((match[2] ?? "").padEnd(3, "0"));
}

function quantityText(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 1000n}.${String(absolute % 1000n).padStart(3, "0")}`;
}

function hashRequest(value: unknown): string {
  const normalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(normalize);
    if (entry && typeof entry === "object") {
      return Object.fromEntries(Object.entries(entry).sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalize(item)]));
    }
    return entry;
  };
  return createHash("sha256").update(JSON.stringify(normalize(value))).digest("hex");
}

function dateText(value: unknown): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value.slice(0, 10) : String(value).slice(0, 10);
}

async function idempotentOperation<T>(
  actor: StockActor,
  idempotencyKey: string,
  request: unknown,
  work: (tx: PrismaTransaction, operationId: string) => Promise<T>,
): Promise<T> {
  if (!idempotencyKey || idempotencyKey.length > 160) {
    throw new InventoryError("A valid Idempotency-Key header is required");
  }
  const requestHash = hashRequest(request);

  try {
    return await prisma.transaction(async (tx) => {
      const operation = await tx.orm.public.StockOperation.create({
        clinicId: actor.clinicId,
        actorUserId: actor.userId,
        idempotencyKey,
        requestHash,
      });
      const result = await work(tx, operation.id);
      await tx.orm.public.StockOperation.where({
        clinicId: actor.clinicId,
        id: operation.id,
      }).update({ result: result as object });
      return result;
    });
  } catch (error) {
    const existing = await prisma.orm.public.StockOperation.where({
      clinicId: actor.clinicId,
      idempotencyKey,
    }).first();
    if (!existing) throw error;
    if (existing.requestHash !== requestHash) {
      throw new InventoryError("Idempotency-Key was already used for a different request", 409);
    }
    if (!existing.result) {
      throw new InventoryError("The original stock operation did not complete", 409);
    }
    return { ...(existing.result as object), idempotentReplay: true } as T;
  }
}

async function lockLot(tx: PrismaTransaction, actor: StockActor, lotId: string) {
  const lot = await tx.orm.public.InventoryLot.where({
    clinicId: actor.clinicId,
    id: lotId,
  }).forUpdate().first();
  if (!lot) throw new InventoryError("Stock lot not found in this clinic", 404);
  return lot;
}

async function findOrCreateLot(
  tx: PrismaTransaction,
  actor: StockActor,
  input: { medicationId: string; batchNumber: string; expiresAt?: string | null; unitCost?: string | number },
) {
  const medication = await tx.orm.public.Medication.where({
    clinicId: actor.clinicId,
    id: input.medicationId,
    isActive: true,
  }).first();
  if (!medication) throw new InventoryError("Medication not found in this clinic", 404);

  const expiresAt = input.expiresAt || null;
  const cost = String(input.unitCost ?? "0");
  const prior = await tx.orm.public.InventoryLot.where({
    clinicId: actor.clinicId,
    medicationId: input.medicationId,
    batchNumber: input.batchNumber,
  }).first();

  if (!prior) {
    await tx.orm.public.InventoryLot.create({
      clinicId: actor.clinicId,
      medicationId: input.medicationId,
      batchNumber: input.batchNumber,
      expiresAt,
      quantityOnHand: "0",
      unitCost: cost,
    });
  }

  const lot = await tx.orm.public.InventoryLot.where({
    clinicId: actor.clinicId,
    medicationId: input.medicationId,
    batchNumber: input.batchNumber,
  }).forUpdate().first();
  if (!lot) throw new InventoryError("Could not create or find the stock lot", 500);
  if (input.expiresAt !== undefined && dateText(lot.expiresAt) !== expiresAt) {
    throw new InventoryError("Batch expiry date differs from the existing lot", 409);
  }
  if (prior && input.unitCost !== undefined && String(lot.unitCost) !== cost) {
    throw new InventoryError("Batch unit cost differs from the existing lot", 409);
  }
  return lot;
}

async function addMovement(
  tx: PrismaTransaction,
  actor: StockActor,
  operationId: string,
  values: {
    type: MovementKind;
    quantity: bigint;
    sourceLotId?: string;
    destinationLotId?: string;
    reason?: string;
    reference?: string;
  },
) {
  return tx.orm.public.StockMovement.create({
    clinicId: actor.clinicId,
    operationId,
    type: values.type,
    quantity: quantityText(values.quantity),
    sourceLotId: values.sourceLotId,
    destinationLotId: values.destinationLotId,
    reason: values.reason,
    reference: values.reference,
  });
}

export async function createMedication(
  actor: StockActor,
  input: { code?: string; name: string; strength?: string; dosageForm?: string; unit: string },
) {
  return prisma.orm.public.Medication.create({
    clinicId: actor.clinicId,
    code: input.code,
    name: input.name.trim(),
    strength: input.strength,
    dosageForm: input.dosageForm,
    unit: input.unit.trim(),
    isActive: true,
  });
}

export async function listMedications(actor: StockActor) {
  return prisma.orm.public.Medication.where({
    clinicId: actor.clinicId,
    isActive: true,
  }).orderBy((medication) => medication.name.asc()).all();
}

export async function receiveStock(
  actor: StockActor,
  key: string,
  input: {
    medicationId: string;
    batchNumber: string;
    expiresAt?: string | null;
    quantity: string | number;
    unitCost?: string | number;
    reference?: string;
    reason?: string;
    movementType?: "RECEIPT" | "RETURN";
  },
) {
  const quantity = milliUnits(input.quantity);
  const movementType = input.movementType ?? "RECEIPT";
  return idempotentOperation(actor, key, { ...input, movementType, quantity: quantityText(quantity) }, async (tx, operationId) => {
    const lot = await findOrCreateLot(tx, actor, input);
    const next = asMilliUnits(lot.quantityOnHand) + quantity;
    await tx.orm.public.InventoryLot.where({ clinicId: actor.clinicId, id: lot.id })
      .update({ quantityOnHand: quantityText(next) });
    const movement = await addMovement(tx, actor, operationId, {
      type: movementType,
      quantity,
      destinationLotId: lot.id,
      reason: input.reason,
      reference: input.reference,
    });
    return { operationId, movementIds: [movement.id], lotId: lot.id, quantityOnHand: quantityText(next) };
  });
}

export async function dispenseStock(
  actor: StockActor,
  key: string,
  input: { medicationId: string; quantity: string | number; reference?: string; reason?: string },
) {
  const requested = milliUnits(input.quantity);
  return idempotentOperation(actor, key, { ...input, quantity: quantityText(requested) }, async (tx, operationId) => {
    const medication = await tx.orm.public.Medication.where({
      clinicId: actor.clinicId, id: input.medicationId, isActive: true,
    }).first();
    if (!medication) throw new InventoryError("Medication not found in this clinic", 404);

    const lots = await tx.orm.public.InventoryLot.where({
      clinicId: actor.clinicId,
      medicationId: input.medicationId,
    }).orderBy((lot) => lot.expiresAt.asc({ nulls: "last" })).forUpdate().all();
    const today = new Date().toISOString().slice(0, 10);
    let remaining = requested;
    const movementIds: string[] = [];

    for (const lot of lots) {
      const expiry = dateText(lot.expiresAt);
      if (expiry && expiry < today) continue;
      const available = asMilliUnits(lot.quantityOnHand);
      if (available <= 0n) continue;
      const taken = available < remaining ? available : remaining;
      await tx.orm.public.InventoryLot.where({ clinicId: actor.clinicId, id: lot.id })
        .update({ quantityOnHand: quantityText(available - taken) });
      const movement = await addMovement(tx, actor, operationId, {
        type: "DISPENSE", quantity: taken, sourceLotId: lot.id, reason: input.reason, reference: input.reference,
      });
      movementIds.push(movement.id);
      remaining -= taken;
      if (remaining === 0n) break;
    }

    if (remaining > 0n) throw new InventoryError("Insufficient unexpired stock", 409);
    return { operationId, movementIds, medicationId: input.medicationId, quantity: quantityText(requested) };
  });
}

export async function adjustStock(
  actor: StockActor,
  key: string,
  input: {
    medicationId: string;
    quantityDelta: string | number;
    batchNumber?: string;
    expiresAt?: string | null;
    lotId?: string;
    unitCost?: string | number;
    reason: string;
  },
) {
  const raw = String(input.quantityDelta).trim();
  const negative = raw.startsWith("-");
  const quantity = milliUnits(negative ? raw.slice(1) : raw);
  if (!input.reason.trim()) throw new InventoryError("Adjustment reason is required");
  return idempotentOperation(actor, key, { ...input, quantityDelta: quantityText(negative ? -quantity : quantity) }, async (tx, operationId) => {
    let lot;
    if (negative) {
      if (!input.lotId) throw new InventoryError("lotId is required for a stock decrease");
      lot = await lockLot(tx, actor, input.lotId);
      if (lot.medicationId !== input.medicationId) throw new InventoryError("Lot belongs to another medication", 409);
      const available = asMilliUnits(lot.quantityOnHand);
      if (available < quantity) throw new InventoryError("Adjustment would make stock negative", 409);
      await tx.orm.public.InventoryLot.where({ clinicId: actor.clinicId, id: lot.id })
        .update({ quantityOnHand: quantityText(available - quantity) });
      const movement = await addMovement(tx, actor, operationId, {
        type: "ADJUSTMENT", quantity, sourceLotId: lot.id, reason: input.reason,
      });
      return { operationId, movementIds: [movement.id], lotId: lot.id, quantityOnHand: quantityText(available - quantity) };
    }

    if (!input.batchNumber) throw new InventoryError("batchNumber is required for a stock increase");
    lot = await findOrCreateLot(tx, actor, input);
    const next = asMilliUnits(lot.quantityOnHand) + quantity;
    await tx.orm.public.InventoryLot.where({ clinicId: actor.clinicId, id: lot.id })
      .update({ quantityOnHand: quantityText(next) });
    const movement = await addMovement(tx, actor, operationId, {
      type: "ADJUSTMENT", quantity, destinationLotId: lot.id, reason: input.reason,
    });
    return { operationId, movementIds: [movement.id], lotId: lot.id, quantityOnHand: quantityText(next) };
  });
}

export async function transferStock(
  actor: StockActor,
  key: string,
  input: { sourceLotId: string; destinationLotId: string; quantity: string | number; reason?: string },
) {
  const quantity = milliUnits(input.quantity);
  if (input.sourceLotId === input.destinationLotId) throw new InventoryError("Transfer needs two different lots");
  return idempotentOperation(actor, key, { ...input, quantity: quantityText(quantity) }, async (tx, operationId) => {
    const [firstId, secondId] = [input.sourceLotId, input.destinationLotId].sort();
    const firstLot = await lockLot(tx, actor, firstId);
    const secondLot = await lockLot(tx, actor, secondId);
    const source = firstLot.id === input.sourceLotId ? firstLot : secondLot;
    const destination = firstLot.id === input.destinationLotId ? firstLot : secondLot;
    if (source.medicationId !== destination.medicationId) {
      throw new InventoryError("Cannot transfer stock between different medications", 409);
    }
    const sourceBalance = asMilliUnits(source.quantityOnHand);
    const destinationBalance = asMilliUnits(destination.quantityOnHand);
    if (sourceBalance < quantity) throw new InventoryError("Insufficient stock in source lot", 409);
    await tx.orm.public.InventoryLot.where({ clinicId: actor.clinicId, id: source.id })
      .update({ quantityOnHand: quantityText(sourceBalance - quantity) });
    await tx.orm.public.InventoryLot.where({ clinicId: actor.clinicId, id: destination.id })
      .update({ quantityOnHand: quantityText(destinationBalance + quantity) });
    const movement = await addMovement(tx, actor, operationId, {
      type: "TRANSFER", quantity, sourceLotId: source.id, destinationLotId: destination.id, reason: input.reason,
    });
    return {
      operationId,
      movementIds: [movement.id],
      sourceQuantityOnHand: quantityText(sourceBalance - quantity),
      destinationQuantityOnHand: quantityText(destinationBalance + quantity),
    };
  });
}

export async function listInventory(actor: StockActor, medicationId?: string) {
  const clinicLots = prisma.orm.public.InventoryLot.where({
    clinicId: actor.clinicId,
  });
  if (medicationId) {
    return clinicLots.where({ medicationId })
      .orderBy((lot) => lot.expiresAt.asc({ nulls: "last" }))
      .all();
  }
  return clinicLots.orderBy((lot) => lot.expiresAt.asc({ nulls: "last" })).all();
}

export async function listMovements(actor: StockActor, limit = 100) {
  return prisma.orm.public.StockMovement.where({ clinicId: actor.clinicId })
    .orderBy((movement) => movement.createdAt.desc())
    .limit(Math.min(Math.max(limit, 1), 250))
    .all();
}

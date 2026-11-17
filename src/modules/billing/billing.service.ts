import { prisma } from "../../infrastructure/database/prisma";
import type { CreateInvoiceInput, RecordPaymentInput, SubmitClaimInput } from "./billing.types";

export function generateInvoiceNo(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.floor(100 + Math.random() * 900);
  return `INV-${date}-${rand}`;
}

export function generatePaymentNo(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.floor(100 + Math.random() * 900);
  return `PAY-${date}-${rand}`;
}

export function generateClaimNo(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.floor(100 + Math.random() * 900);
  return `CLM-${date}-${rand}`;
}

export async function listInvoices(hospitalId?: string, patientId?: string, status?: string) {
  try {
    const list = await prisma.orm.public.Invoice.all();
    let filtered = list;

    if (hospitalId) {
      filtered = filtered.filter((i: any) => String(i.hospitalId) === String(hospitalId));
    }
    if (patientId) {
      filtered = filtered.filter((i: any) => String(i.patientId) === String(patientId));
    }
    if (status) {
      filtered = filtered.filter((i: any) => i.status === status);
    }
    return filtered;
  } catch (error) {
    console.error("List invoices error:", error);
    return [];
  }
}

export async function getInvoiceById(id: string) {
  try {
    const invoice = await prisma.orm.public.Invoice.where({ id }).first();
    if (!invoice) return null;

    let items: any[] = [];
    let payments: any[] = [];
    let claims: any[] = [];

    try {
      items = await prisma.orm.public.InvoiceItem.where({ invoiceId: id }).all();
    } catch {}
    try {
      payments = await prisma.orm.public.Payment.where({ invoiceId: id }).all();
    } catch {}
    try {
      claims = await prisma.orm.public.InsuranceClaim.where({ invoiceId: id }).all();
    } catch {}

    return {
      ...invoice,
      items,
      payments,
      claims,
    };
  } catch {
    return null;
  }
}

export async function createInvoice(input: CreateInvoiceInput) {
  const invoiceNo = generateInvoiceNo();

  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  for (const item of input.items) {
    const itemSub = item.quantity * item.unitPrice;
    subtotal += itemSub;
    totalDiscount += item.discount || 0;
    totalTax += item.tax || 0;
  }

  const grandTotal = subtotal - totalDiscount + totalTax;

  const invoice = await prisma.orm.public.Invoice.create({
    hospitalId: input.hospitalId,
    patientId: input.patientId,
    invoiceNo,
    status: "ISSUED",
    issuedAt: new Date(),
    subtotal,
    discount: totalDiscount,
    tax: totalTax,
    total: grandTotal,
    balanceDue: grandTotal,
    currency: input.currency || "THB",
  });

  const createdItems = [];
  for (const item of input.items) {
    try {
      const lineTotal = item.quantity * item.unitPrice - (item.discount || 0) + (item.tax || 0);
      const createdItem = await prisma.orm.public.InvoiceItem.create({
        invoiceId: invoice.id,
        serviceCode: item.serviceCode,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        tax: item.tax || 0,
        lineTotal,
      });
      createdItems.push(createdItem);
    } catch (err) {
      console.error("Error creating invoice item:", err);
    }
  }

  return {
    ...invoice,
    items: createdItems,
  };
}

export async function recordPayment(input: RecordPaymentInput) {
  const paymentNo = generatePaymentNo();

  const payment = await prisma.orm.public.Payment.create({
    invoiceId: input.invoiceId,
    paymentNo,
    method: input.method,
    status: "COMPLETED",
    amount: input.amount,
    currency: input.currency || "THB",
    transactionRef: input.transactionRef,
    paidAt: new Date(),
    receivedBy: input.receivedBy,
    notes: input.notes,
  });

  // Recalculate balance due
  try {
    const invoice = await prisma.orm.public.Invoice.where({ id: input.invoiceId }).first();
    if (invoice) {
      const currentBalance = Number(invoice.balanceDue || invoice.total);
      const newBalance = Math.max(0, currentBalance - input.amount);
      const newStatus = newBalance <= 0 ? "PAID" : "PARTIALLY_PAID";

      await prisma.orm.public.Invoice.where({ id: input.invoiceId }).update({
        balanceDue: newBalance,
        status: newStatus,
      });
    }
  } catch {}

  return payment;
}

export async function submitInsuranceClaim(input: SubmitClaimInput) {
  const claimNo = generateClaimNo();

  return await prisma.orm.public.InsuranceClaim.create({
    invoiceId: input.invoiceId,
    coverageId: input.coverageId,
    providerId: input.providerId,
    claimNo,
    status: "SUBMITTED",
    claimedAmount: input.claimedAmount,
    submittedAt: new Date(),
    remarks: input.remarks,
  });
}

export type InvoiceStatus = "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "VOID";
export type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "MOBILE_WALLET" | "INSURANCE" | "OTHER";

export interface InvoiceItemInput {
  serviceCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
}

export interface CreateInvoiceInput {
  hospitalId: string;
  patientId: string;
  items: InvoiceItemInput[];
  currency?: string;
}

export interface RecordPaymentInput {
  invoiceId: string;
  method: PaymentMethod;
  amount: number;
  currency?: string;
  transactionRef?: string;
  notes?: string;
  receivedBy?: string;
}

export interface SubmitClaimInput {
  invoiceId: string;
  coverageId: string;
  providerId: string;
  claimedAmount: number;
  remarks?: string;
}

export type PrescriptionStatus = "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

export interface PrescriptionItemInput {
  medicineId: string;
  dose?: string;
  route?: string;
  frequency?: string;
  durationDays?: number;
  quantity: number;
  instructions?: string;
}

export interface CreatePrescriptionInput {
  patientId: string;
  encounterId?: string;
  doctorId?: string;
  notes?: string;
  items: PrescriptionItemInput[];
  userId?: string;
}

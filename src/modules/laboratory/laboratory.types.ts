export interface CreateLabOrderInput {
  serviceRequestId?: string;
  laboratoryId: string;
  patientId: string;
  encounterId?: string;
  testIds: string[];
  priority?: "ROUTINE" | "URGENT" | "ASAP" | "STAT";
  notes?: string;
}

export interface SubmitLabResultInput {
  orderItemId: string;
  valueText?: string;
  valueNumber?: number;
  unit?: string;
  referenceRange?: string;
  abnormalFlag?: string;
  remarks?: string;
  verifiedBy?: string;
}

export type AdmissionStatus = "PLANNED" | "ADMITTED" | "TRANSFERRED" | "DISCHARGED" | "CANCELLED";

export interface AdmitPatientInput {
  hospitalId: string;
  patientId: string;
  encounterId?: string;
  bedId?: string;
  admissionReason?: string;
  attendingDoctorName?: string;
}

export interface TransferBedInput {
  admissionId: string;
  fromBedId?: string;
  toBedId: string;
  reason?: string;
}

export interface DischargePatientInput {
  admissionId: string;
  dischargeDiagnosis?: string;
  dischargeSummary?: string;
}

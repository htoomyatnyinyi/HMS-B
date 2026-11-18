export type EncounterType = "OPD" | "IPD" | "EMERGENCY" | "TELEMEDICINE" | "HOMECARE";
export type EncounterStatus = "PLANNED" | "IN_PROGRESS" | "ON_HOLD" | "FINISHED" | "CANCELLED" | "ENTERED_IN_ERROR";
export type Priority = "ROUTINE" | "URGENT" | "ASAP" | "STAT";

export interface StartEncounterInput {
  hospitalId: string;
  branchId?: string;
  patientId: string;
  appointmentId?: string;
  doctorId?: string;
  type?: EncounterType;
  priority?: Priority;
  chiefComplaint?: string;
}

export interface AddClinicalNoteInput {
  encounterId: string;
  authorId: string;
  noteType?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  content?: string;
}

export interface AddDiagnosisInput {
  encounterId: string;
  code?: string;
  codeSystem?: string;
  description: string;
  isPrimary?: boolean;
}

export interface AddObservationInput {
  encounterId: string;
  patientId: string;
  code: string;
  display: string;
  category?: string;
  valueString?: string;
  valueNumber?: number;
  unit?: string;
}

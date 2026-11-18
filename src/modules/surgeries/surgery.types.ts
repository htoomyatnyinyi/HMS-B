export type SurgeryStatus = "SCHEDULED" | "PREPARATION" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface ScheduleSurgeryInput {
  operatingRoomId: string;
  doctorId?: string;
  patientId: string;
  procedureName: string;
  scheduledStart: string;
  scheduledEnd?: string;
  anesthesiaNotes?: string;
  operativeNotes?: string;
}

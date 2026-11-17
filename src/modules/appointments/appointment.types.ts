export type AppointmentStatus =
  | "REQUESTED"
  | "BOOKED"
  | "CONFIRMED"
  | "ARRIVED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface BookAppointmentInput {
  hospitalId: string;
  branchId?: string;
  patientId: string;
  doctorId?: string;
  departmentId?: string;
  startAt: string;
  endAt: string;
  reason?: string;
  notes?: string;
  createdById?: string;
}

export interface UpdateAppointmentStatusInput {
  status: AppointmentStatus;
  notes?: string;
}

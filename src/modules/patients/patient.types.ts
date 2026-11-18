export interface CreatePatientInput {
  tenantId: string;
  hospitalId: string;
  branchId?: string;
  mrn?: string;
  nationalId?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
  bloodGroup?: string;
  maritalStatus?: string;
  phone?: string;
  email?: string;
  address?: Record<string, unknown>;
  emergencyContact?: Record<string, unknown>;
}

export interface UpdatePatientInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  preferredName?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
  bloodGroup?: string;
  phone?: string;
  email?: string;
  address?: Record<string, unknown>;
  emergencyContact?: Record<string, unknown>;
}

export interface CreateAllergyInput {
  patientId: string;
  substance: string;
  reaction?: string;
  severity?: string;
  status?: string;
}

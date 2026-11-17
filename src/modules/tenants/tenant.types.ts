export interface CreateTenantInput {
  code: string;
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  currency?: string;
  timezone?: string;
}

export interface CreateHospitalInput {
  tenantId: string;
  code: string;
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  currency?: string;
}

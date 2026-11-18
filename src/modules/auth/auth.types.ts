export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
  phone?: string;
  tenantId?: string;
  hospitalId?: string;
  role?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthSessionResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    tenantId?: string;
    hospitalId?: string;
  };
}

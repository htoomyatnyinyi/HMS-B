export {};

const baseUrl = process.env.API_BASE_URL || "http://127.0.0.1:3000/api/v1";
const accounts = [
  { email: process.env.SMOKE_EMAIL || "doctor@clinic.local", password: process.env.SMOKE_PASSWORD || "DoctorPassword123!", role: "DOCTOR" },
  { email: "admin@clinic.local", password: "AdminPassword123!", role: "ADMIN" },
  { email: "nurse@clinic.local", password: "NursePassword123!", role: "NURSE" },
  { email: "pharmacist@clinic.local", password: "PharmPassword123!", role: "PHARMACIST" },
  { email: "lab@clinic.local", password: "LabPassword123!", role: "LAB_TECH" },
  { email: "cashier@clinic.local", password: "CashierPassword123!", role: "CASHIER" },
];

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) {
    throw new Error(`${init.method || "GET"} ${path} failed (${response.status}): ${body?.error || body?.message || "unknown error"}`);
  }
  return body;
}

async function expectStatus(path: string, token: string, expected: number) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status !== expected) {
    throw new Error(`GET ${path}: expected ${expected}, received ${response.status}`);
  }
}

const checks = [
  "/patients?limit=1",
  "/appointments?limit=1",
  "/encounters",
  "/admissions",
  "/wards",
  "/pharmacy/medicines",
  "/laboratory/tests",
  "/laboratory/orders",
  "/billing/invoices",
  "/prescriptions",
];

console.log(`Running HMS smoke checks against ${baseUrl}`);
const healthResponse = await fetch(`${baseUrl.replace(/\/api\/v1$/, "")}/health/`);
if (!healthResponse.ok) throw new Error(`GET /health/ failed (${healthResponse.status})`);
console.log("✅ /health/");
const readyResponse = await fetch(`${baseUrl.replace(/\/api\/v1$/, "")}/health/ready`);
if (!readyResponse.ok) throw new Error(`GET /health/ready failed (${readyResponse.status})`);
console.log("✅ /health/ready");
const loginTokens: string[] = [];
for (const account of accounts) {
  const login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: account.email, password: account.password }),
  });
  const token = login.data?.accessToken;
  const roles = login.data?.user?.roles || [];
  if (!token) throw new Error(`${account.email} login returned no access token`);
  if (!roles.includes(account.role)) throw new Error(`${account.email}: expected ${account.role}, received ${roles.join(", ")}`);
  loginTokens.push(token);
  console.log(`✅ login ${account.email} [${account.role}]`);
}

const token = loginTokens[0];
await expectStatus("/auth/users", loginTokens[0], 403);
await request("/auth/users", { headers: { Authorization: `Bearer ${loginTokens[1]}` } });
await request("/auth/audit-logs", { headers: { Authorization: `Bearer ${loginTokens[1]}` } });
console.log("✅ RBAC admin endpoint protection");

for (const path of checks) {
  await request(path, { headers: { Authorization: `Bearer ${token}` } });
  console.log(`✅ ${path}`);
}

console.log("✅ HMS smoke checks passed");

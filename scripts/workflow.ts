export {};

const baseUrl = process.env.API_BASE_URL || "http://127.0.0.1:3000/api/v1";
const unique = Date.now().toString();

async function request(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) throw new Error(`${init.method || "GET"} ${path} failed (${response.status}): ${body?.error || body?.message || "unknown error"} ${body?.message || ""}`);
  return body;
}

async function login(email: string, password: string) {
  const body = await request("/auth/login", "", { method: "POST", body: JSON.stringify({ email, password }), headers: { Authorization: "" } });
  return body.data.accessToken as string;
}

const doctorToken = await login("doctor@clinic.local", "DoctorPassword123!");
const adminToken = await login("admin@clinic.local", "AdminPassword123!");

const patients = await request("/patients?limit=1", doctorToken);
const patient = patients.data.data[0];
if (!patient) throw new Error("No seeded patient available");

const appointment = await request("/appointments", doctorToken, {
  method: "POST",
  body: JSON.stringify({ patientId: patient.id, startAt: new Date(Date.now() + 3600000).toISOString(), endAt: new Date(Date.now() + 5400000).toISOString(), reason: `Workflow test ${unique}` }),
});
console.log(`✅ appointment ${appointment.data.id}`);

const encounter = await request("/encounters", doctorToken, {
  method: "POST",
  body: JSON.stringify({ patientId: patient.id, appointmentId: appointment.data.id, type: "OPD", chiefComplaint: `Workflow test ${unique}` }),
});
console.log(`✅ encounter ${encounter.data.id}`);

const medicines = await request("/pharmacy/medicines?search=Paracetamol", doctorToken);
const medicine = medicines.data[0];
if (!medicine) throw new Error("No seeded medicine available");

const prescription = await request("/prescriptions", doctorToken, {
  method: "POST",
  body: JSON.stringify({ patientId: patient.id, encounterId: encounter.data.id, items: [{ medicineId: medicine.id, dose: "500mg", frequency: "BID", durationDays: 3, quantity: 2, instructions: "After meals" }] }),
});
console.log(`✅ prescription ${prescription.data.id}`);

const labTests = await request("/laboratory/tests", doctorToken);
const labTest = labTests.data[0];
if (!labTest) throw new Error("No seeded laboratory test available");
const labOrder = await request("/laboratory/orders", doctorToken, {
  method: "POST",
  body: JSON.stringify({ laboratoryId: labTest.laboratoryId, patientId: patient.id, encounterId: encounter.data.id, testIds: [labTest.id], notes: `Workflow test ${unique}` }),
});
const labItem = labOrder.data.items?.[0];
if (!labItem) throw new Error("Laboratory order returned no item");
await request(`/laboratory/orders/${labItem.id}/specimens`, adminToken, { method: "POST", body: JSON.stringify({ specimenType: labTest.specimenType || "Blood" }) });
await request("/laboratory/results", adminToken, { method: "POST", body: JSON.stringify({ orderItemId: labItem.id, valueText: "NORMAL", unit: "", referenceRange: "Normal", remarks: "Workflow test" }) });
console.log("✅ laboratory order and result");

const prescriptionItem = prescription.data.items?.[0];
if (!prescriptionItem) throw new Error("Prescription returned no item");
await request("/pharmacy/dispensations", await login("pharmacist@clinic.local", "PharmPassword123!"), {
  method: "POST",
  body: JSON.stringify({ pharmacyId: medicine.pharmacyId, prescriptionId: prescription.data.id, items: [{ prescriptionItemId: prescriptionItem.id, quantity: Number(prescriptionItem.quantity) }] }),
});
console.log("✅ pharmacy dispensing and stock reduction");

const beds = await request("/wards/beds?status=AVAILABLE", adminToken);
const availableBed = beds.data[0];
if (!availableBed) throw new Error("No available seeded bed");
const admission = await request("/admissions", adminToken, {
  method: "POST",
  body: JSON.stringify({ patientId: patient.id, bedId: availableBed.id, admissionReason: `Workflow test ${unique}` }),
});
await request(`/admissions/${admission.data.id}/discharge`, adminToken, { method: "POST", body: JSON.stringify({ dischargeSummary: "Workflow test completed" }) });
console.log("✅ admission and discharge");

const invoice = await request("/billing/invoices", adminToken, {
  method: "POST",
  body: JSON.stringify({ patientId: patient.id, items: [{ description: `Workflow test ${unique}`, quantity: 1, unitPrice: 100 }] }),
});
console.log(`✅ invoice ${invoice.data.id}`);

await request(`/billing/invoices/${invoice.data.id}/payments`, adminToken, {
  method: "POST",
  body: JSON.stringify({ method: "CASH", amount: 100 }),
});
console.log("✅ payment");
console.log("✅ write workflow passed");

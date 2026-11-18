import { prisma, sql } from "../src/infrastructure/database/prisma";

// ============================================
// HELPER: ID generator
// ============================================
const uuid = () => crypto.randomUUID();
const now = new Date();

async function main() {
  console.log("🌱 Starting Comprehensive HMS Database Seeding...\n");

  try {
    // ============================================
    // 1. TENANTS
    // ============================================
    console.log("➡️  [1/15] Seeding Tenants...");
    const tenant = await prisma.orm.public.Tenant.create({
      id: uuid(),
      code: "TENANT_MAIN",
      name: "Central Healthcare Network",
      legal_name: "Central Health Services Co., Ltd.",
      email: "contact@centralhealth.local",
      phone: "+95912345678",
      timezone: "Asia/Yangon",
      currency: "MMK",
      is_active: true,
    });
    console.log(`   ✅ Tenant: ${tenant.name}`);

    // ============================================
    // 2. HOSPITALS
    // ============================================
    console.log("➡️  [2/15] Seeding Hospitals...");
    const hospital = await prisma.orm.public.Hospital.create({
      id: uuid(),
      tenant_id: tenant.id,
      code: "MAIN_HOSPITAL",
      name: "Central General Hospital",
      legal_name: "Central General Hospital Ltd.",
      email: "info@centralhospital.local",
      phone: "+95998765432",
      timezone: "Asia/Yangon",
      currency: "MMK",
      is_active: true,
    });

    const branch = await prisma.orm.public.Branch.create({
      id: uuid(),
      tenant_id: tenant.id,
      hospital_id: hospital.id,
      code: "BR_MAIN",
      name: "Main Campus",
      phone: "+95998765432",
      email: "main@centralhospital.local",
      is_active: true,
    });
    console.log(`   ✅ Hospital: ${hospital.name}`);
    console.log(`   ✅ Branch: ${branch.name}`);

    // ============================================
    // 3. DEPARTMENTS
    // ============================================
    console.log("➡️  [3/15] Seeding Departments...");
    const deptData = [
      { code: "OPD", name: "Outpatient Department" },
      { code: "ER", name: "Emergency Room" },
      { code: "IPD", name: "Inpatient Ward" },
      { code: "SURG", name: "Surgery Department" },
      { code: "PED", name: "Pediatrics" },
      { code: "OBGYN", name: "Obstetrics & Gynecology" },
      { code: "CARD", name: "Cardiology" },
      { code: "ORTHO", name: "Orthopedics" },
      { code: "PHARM", name: "Pharmacy Services" },
      { code: "LAB", name: "Diagnostic Laboratory" },
      { code: "RAD", name: "Radiology" },
      { code: "BILL", name: "Billing & Finance" },
    ];
    const departments: Record<string, any> = {};
    for (const d of deptData) {
      departments[d.code] = await prisma.orm.public.Department.create({
        id: uuid(),
        tenant_id: tenant.id,
        hospital_id: hospital.id,
        branch_id: branch.id,
        code: d.code,
        name: d.name,
        is_active: true,
      });
    }
    console.log(`   ✅ ${deptData.length} departments created`);

    // ============================================
    // 4. ROLES
    // ============================================
    console.log("➡️  [4/15] Seeding Roles...");
    const roleNames = [
      "SUPER_ADMIN",
      "ADMIN",
      "DOCTOR",
      "NURSE",
      "PHARMACIST",
      "LAB_TECH",
      "CASHIER",
      "RECEPTIONIST",
      "STAFF",
    ];
    const roles: Record<string, any> = {};
    for (const name of roleNames) {
      roles[name] = await prisma.orm.public.Role.create({
        id: uuid(),
        tenant_id: tenant.id,
        name,
        description: `${name} system role`,
        is_system: true,
      });
    }
    console.log(`   ✅ ${roleNames.length} roles created`);

    // ============================================
    // 5. USERS
    // ============================================
    console.log("➡️  [5/15] Seeding Users...");
    const userSpecs = [
      {
        email: "admin@clinic.local",
        username: "admin",
        password: "AdminPassword123!",
        first: "System",
        last: "Administrator",
        role: "ADMIN",
        phone: "+95911100001",
      },
      {
        email: "doctor@clinic.local",
        username: "drthura",
        password: "DoctorPassword123!",
        first: "Thura",
        last: "Aung",
        role: "DOCTOR",
        phone: "+95911100002",
      },
      {
        email: "doctor2@clinic.local",
        username: "drsu",
        password: "DoctorPassword123!",
        first: "Su",
        last: "Myat",
        role: "DOCTOR",
        phone: "+95911100003",
      },
      {
        email: "nurse@clinic.local",
        username: "nurse_khine",
        password: "NursePassword123!",
        first: "Khine",
        last: "Zar",
        role: "NURSE",
        phone: "+95911100004",
      },
      {
        email: "pharmacist@clinic.local",
        username: "pharm_moe",
        password: "PharmPassword123!",
        first: "Moe",
        last: "Kyaw",
        role: "PHARMACIST",
        phone: "+95911100005",
      },
      {
        email: "lab@clinic.local",
        username: "lab_tech",
        password: "LabPassword123!",
        first: "Aye",
        last: "Chan",
        role: "LAB_TECH",
        phone: "+95911100006",
      },
      {
        email: "cashier@clinic.local",
        username: "cashier_nyi",
        password: "CashierPassword123!",
        first: "Nyi",
        last: "Nyi",
        role: "CASHIER",
        phone: "+95911100007",
      },
      {
        email: "reception@clinic.local",
        username: "reception",
        password: "ReceptPassword123!",
        first: "Hla",
        last: "Hla",
        role: "RECEPTIONIST",
        phone: "+95911100008",
      },
    ];

    const users: Record<string, any> = {};
    for (const u of userSpecs) {
      const password_hash = await Bun.password.hash(u.password);
      const created = await prisma.orm.public.User.create({
        id: uuid(),
        tenant_id: tenant.id,
        hospital_id: hospital.id,
        email: u.email,
        username: u.username,
        password_hash,
        first_name: u.first,
        last_name: u.last,
        phone: u.phone,
        status: "ACTIVE",
      });
      users[u.username] = created;
      await prisma.orm.public.UserRole.create({
        id: uuid(),
        tenant_id: tenant.id,
        user_id: created.id,
        role_id: roles[u.role].id,
      });
    }
    console.log(`   ✅ ${userSpecs.length} users created with roles`);

    // ============================================
    // 6. DOCTOR PROFILES
    // ============================================
    console.log("➡️  [6/15] Seeding Doctor Profiles...");
    const staff1 = await prisma.orm.public.Staff.create({
      id: uuid(),
      user_id: users["drthura"].id,
      department_id: departments["OPD"].id,
      employee_no: "DOC-0001",
      job_title: "Consultant Physician",
      is_active: true,
    });
    const staff2 = await prisma.orm.public.Staff.create({
      id: uuid(),
      user_id: users["drsu"].id,
      department_id: departments["CARD"].id,
      employee_no: "DOC-0002",
      job_title: "Cardiologist",
      is_active: true,
    });
    const doctor1 = await prisma.orm.public.Doctor.create({
      id: uuid(),
      staff_id: staff1.id,
      license_no: "MM-LIC-0001",
      qualification: "MBBS, MMedSc (Internal Medicine)",
      consultation_fee: 15000,
    });
    const doctor2 = await prisma.orm.public.Doctor.create({
      id: uuid(),
      staff_id: staff2.id,
      license_no: "MM-LIC-0002",
      qualification: "MBBS, MRCP (Cardiology)",
      consultation_fee: 25000,
    });
    console.log(`   ✅ 2 doctor profiles created`);

    // ============================================
    // 7. PATIENTS
    // ============================================
    console.log("➡️  [7/15] Seeding Patients...");
    const patientSpecs = [
      {
        mrn: "MRN-0001",
        first: "Aung",
        last: "Kyaw",
        gender: "MALE",
        dob: "1985-03-15",
        blood: "O+",
        phone: "+95977100001",
      },
      {
        mrn: "MRN-0002",
        first: "Su",
        last: "Su",
        gender: "FEMALE",
        dob: "1992-07-22",
        blood: "A+",
        phone: "+95977100002",
      },
      {
        mrn: "MRN-0003",
        first: "Ko",
        last: "Min",
        gender: "MALE",
        dob: "1978-11-08",
        blood: "B+",
        phone: "+95977100003",
      },
      {
        mrn: "MRN-0004",
        first: "Ei",
        last: "Phyu",
        gender: "FEMALE",
        dob: "2000-01-30",
        blood: "AB+",
        phone: "+95977100004",
      },
      {
        mrn: "MRN-0005",
        first: "Zaw",
        last: "Win",
        gender: "MALE",
        dob: "1965-05-12",
        blood: "O-",
        phone: "+95977100005",
      },
    ];
    const patients: any[] = [];
    const bloodGroupMap: Record<string, string> = {
      "A+": "A_POS",
      "A-": "A_NEG",
      "B+": "B_POS",
      "B-": "B_NEG",
      "AB+": "AB_POS",
      "AB-": "AB_NEG",
      "O+": "O_POS",
      "O-": "O_NEG",
    };
    for (const p of patientSpecs) {
      const patient = await prisma.orm.public.Patient.create({
        id: uuid(),
        tenant_id: tenant.id,
        hospital_id: hospital.id,
        branch_id: branch.id,
        mrn: p.mrn,
        first_name: p.first,
        last_name: p.last,
        gender: p.gender,
        date_of_birth: new Date(p.dob),
        blood_group: bloodGroupMap[p.blood] || "UNKNOWN",
        phone: p.phone,
        is_active: true,
      });
      patients.push(patient);
    }
    console.log(`   ✅ ${patients.length} patients created`);

    // ============================================
    // 8. PATIENT ALLERGIES & CONDITIONS
    // ============================================
    console.log("➡️  [8/15] Seeding Allergies & Conditions...");
    await prisma.orm.public.PatientAllergy.create({
      id: uuid(),
      tenant_id: tenant.id,
      patient_id: patients[0].id,
      substance: "Penicillin",
      reaction: "Rash, swelling",
      severity: "MODERATE",
      status: "ACTIVE",
    });
    await prisma.orm.public.PatientAllergy.create({
      id: uuid(),
      tenant_id: tenant.id,
      patient_id: patients[2].id,
      substance: "Peanuts",
      reaction: "Anaphylaxis",
      severity: "SEVERE",
      status: "ACTIVE",
    });

    await prisma.orm.public.Condition.create({
      id: uuid(),
      tenant_id: tenant.id,
      patient_id: patients[4].id,
      display: "Hypertension",
      code: "I10",
      clinical_status: "ACTIVE",
      onset_at: new Date("2020-06-01"),
      notes: "Managed with medication",
    });
    await prisma.orm.public.Condition.create({
      id: uuid(),
      tenant_id: tenant.id,
      patient_id: patients[2].id,
      display: "Type 2 Diabetes Mellitus",
      code: "E11",
      clinical_status: "ACTIVE",
      onset_at: new Date("2018-03-15"),
    });
    console.log(`   ✅ Allergies & conditions seeded`);

    // ============================================
    // 9. APPOINTMENTS
    // ============================================
    console.log("➡️  [9/15] Seeding Appointments...");
    const apptSpecs = [
      {
        patient: patients[0],
        doctor: doctor1,
        start: "2026-11-20T09:00:00Z",
        end: "2026-11-20T09:30:00Z",
        status: "BOOKED",
        reason: "Routine checkup",
      },
      {
        patient: patients[1],
        doctor: doctor2,
        start: "2026-11-20T10:00:00Z",
        end: "2026-11-20T10:30:00Z",
        status: "CONFIRMED",
        reason: "Chest pain",
      },
      {
        patient: patients[3],
        doctor: doctor1,
        start: "2026-11-21T14:00:00Z",
        end: "2026-11-21T14:30:00Z",
        status: "REQUESTED",
        reason: "Follow-up",
      },
    ];
    const appointments: any[] = [];
    for (const [index, a] of apptSpecs.entries()) {
      const appt = await prisma.orm.public.Appointment.create({
        id: uuid(),
        tenant_id: tenant.id,
        hospital_id: hospital.id,
        branch_id: branch.id,
        patient_id: a.patient.id,
        doctor_id: a.doctor.id,
        department_id: a.patient === patients[1] ? departments["CARD"].id : departments["OPD"].id,
        appointment_no: `APT-2026-${String(index + 1).padStart(4, "0")}`,
        start_at: new Date(a.start),
        end_at: new Date(a.end),
        status: a.status,
        reason: a.reason,
      });
      appointments.push(appt);
    }
    console.log(`   ✅ ${appointments.length} appointments created`);

    // ============================================
    // 10. ENCOUNTERS
    // ============================================
    console.log("➡️  [10/15] Seeding Encounters...");
    const encounter = await prisma.orm.public.Encounter.create({
      id: uuid(),
      tenant_id: tenant.id,
      hospital_id: hospital.id,
      branch_id: branch.id,
      patient_id: patients[0].id,
      appointment_id: appointments[0].id,
      doctor_id: doctor1.id,
      encounter_no: "ENC-2026-0001",
      type: "OPD",
      priority: "ROUTINE",
      status: "IN_PROGRESS",
      chief_complaint: "Headache and mild fever for 3 days",
      started_at: new Date("2026-11-18T08:30:00Z"),
    });

    // Diagnoses
    await prisma.orm.public.EncounterDiagnosis.create({
      id: uuid(),
      tenant_id: tenant.id,
      encounter_id: encounter.id,
      code: "R51",
      code_system: "ICD-10",
      description: "Headache",
      is_primary: true,
    });

    // Observation
    await prisma.orm.public.Observation.create({
      id: uuid(),
      tenant_id: tenant.id,
      encounter_id: encounter.id,
      patient_id: patients[0].id,
      code: "8310-5",
      display: "Body temperature",
      category: "vital-signs",
      value_number: 38.2,
      unit: "°C",
    });

    // Clinical Note (SOAP)
    await prisma.orm.public.ClinicalNote.create({
      id: uuid(),
      tenant_id: tenant.id,
      encounter_id: encounter.id,
      author_id: users["drthura"].id,
      note_type: "SOAP",
      subjective: "Patient reports headache and fever for 3 days",
      objective: "Temp 38.2°C, BP 120/80, HR 88",
      assessment: "Likely viral upper respiratory infection",
      plan: "Rest, hydration, Paracetamol PRN",
    });
    console.log(`   ✅ Encounter with diagnosis, observation, note`);

    // ============================================
    // 11. WARDS / ROOMS / BEDS
    // ============================================
    console.log("➡️  [11/15] Seeding Wards, Rooms, Beds...");
    const ward = await prisma.orm.public.Ward.create({
      id: uuid(),
      tenant_id: tenant.id,
      hospital_id: hospital.id,
      code: "WARD-GEN",
      name: "General Ward",
      ward_type: "GENERAL",
      floor: "2",
      is_active: true,
    });

    const room = await prisma.orm.public.Room.create({
      id: uuid(),
      tenant_id: tenant.id,
      hospital_id: hospital.id,
      ward_id: ward.id,
      room_no: "201",
      room_type: "SHARED",
      is_active: true,
    });

    const beds: any[] = [];
    for (let i = 1; i <= 4; i++) {
      const bed = await prisma.orm.public.Bed.create({
        id: uuid(),
        tenant_id: tenant.id,
        hospital_id: hospital.id,
        ward_id: ward.id,
        room_id: room.id,
        bed_no: `201-${String.fromCharCode(64 + i)}`,
        bed_type: "STANDARD",
        daily_rate: 25000,
        status: "AVAILABLE",
        is_active: true,
      });
      beds.push(bed);
    }
    console.log(`   ✅ 1 ward, 1 room, ${beds.length} beds`);

    // ============================================
    // 12. ADMISSION
    // ============================================
    console.log("➡️  [12/15] Seeding Admission...");
    const admission = await prisma.orm.public.Admission.create({
      id: uuid(),
      tenant_id: tenant.id,
      hospital_id: hospital.id,
      patient_id: patients[4].id,
      encounter_id: encounter.id,
      bed_id: beds[0].id,
      admission_no: "ADM-2026-0001",
      admission_reason: "Chest pain observation",
      attending_doctor_name: "Dr. Thura Aung",
      admitted_at: new Date("2026-11-17T10:00:00Z"),
      status: "ADMITTED",
    });
    await prisma.orm.public.Bed.update({
      where: { id: beds[0].id },
      data: { status: "OCCUPIED" },
    });
    console.log(`   ✅ Admission created (bed occupied)`);

    // ============================================
    // 13. PHARMACY / MEDICINES / INVENTORY
    // ============================================
    console.log("➡️  [13/15] Seeding Pharmacy...");
    const pharmacy = await prisma.orm.public.Pharmacy.create({
      id: uuid(),
      tenant_id: tenant.id,
      hospital_id: hospital.id,
      code: "MAIN_PHARMACY",
      name: "Central Dispensary & Pharmacy",
      location: "Ground Floor, Block A",
      is_active: true,
    });

    const inventoryLocation = await prisma.orm.public.InventoryLocation.create({
      id: uuid(),
      hospital_id: hospital.id,
      code: "MAIN_PHARMACY",
      name: "Central Pharmacy Stock",
      location_type: "PHARMACY",
    });

    const medSpecs = [
      {
        code: "MED001",
        name: "Paracetamol",
        generic: "Acetaminophen",
        strength: "500mg",
        form: "Tablet",
        unit: "tablet",
        reorder: 100,
        controlled: false,
      },
      {
        code: "MED002",
        name: "Amoxicillin",
        generic: "Amoxicillin Trihydrate",
        strength: "500mg",
        form: "Capsule",
        unit: "capsule",
        reorder: 100,
        controlled: false,
      },
      {
        code: "MED003",
        name: "Omeprazole",
        generic: "Omeprazole",
        strength: "20mg",
        form: "Capsule",
        unit: "capsule",
        reorder: 100,
        controlled: false,
      },
      {
        code: "MED004",
        name: "Cetirizine",
        generic: "Cetirizine Dihydrochloride",
        strength: "10mg",
        form: "Tablet",
        unit: "tablet",
        reorder: 100,
        controlled: false,
      },
      {
        code: "MED005",
        name: "Metformin",
        generic: "Metformin HCl",
        strength: "500mg",
        form: "Tablet",
        unit: "tablet",
        reorder: 200,
        controlled: false,
      },
      {
        code: "MED006",
        name: "Morphine",
        generic: "Morphine Sulfate",
        strength: "10mg",
        form: "Tablet",
        unit: "tablet",
        reorder: 20,
        controlled: true,
      },
      {
        code: "MED007",
        name: "Atenolol",
        generic: "Atenolol",
        strength: "50mg",
        form: "Tablet",
        unit: "tablet",
        reorder: 100,
        controlled: false,
      },
      {
        code: "MED008",
        name: "Salbutamol",
        generic: "Salbutamol",
        strength: "100mcg",
        form: "Inhaler",
        unit: "inhaler",
        reorder: 30,
        controlled: false,
      },
    ];

    const medicines: any[] = [];
    for (const m of medSpecs) {
      const med = await prisma.orm.public.Medicine.create({
        id: uuid(),
        tenant_id: tenant.id,
        pharmacy_id: pharmacy.id,
        code: m.code,
        name: m.name,
        generic_name: m.generic,
        strength: m.strength,
        dosage_form: m.form,
        unit: m.unit,
        reorder_level: m.reorder,
        is_controlled: m.controlled,
        is_active: true,
      });
      medicines.push(med);
      await prisma.orm.public.StockItem.create({
        id: uuid(),
        location_id: inventoryLocation.id,
        medicine_id: med.id,
        batch_no: "OPENING-2026",
        quantity: 500,
        unit_cost: 100,
      });
    }

    // Stock movements (opening stock)
    for (const med of medicines) {
      await prisma.orm.public.StockMovement.create({
        id: uuid(),
        location_id: inventoryLocation.id,
        medicine_code: med.code,
        movement_type: "OPENING",
        quantity: 500,
        unit_cost: 100,
        reference_no: "OPENING-STOCK",
      });
    }
    console.log(
      `   ✅ Pharmacy + ${medicines.length} medicines + opening stock`,
    );

    // ============================================
    // 14. LABORATORY
    // ============================================
    console.log("➡️  [14/15] Seeding Laboratory...");
    const laboratory = await prisma.orm.public.Laboratory.create({
      id: uuid(),
      tenant_id: tenant.id,
      hospital_id: hospital.id,
      code: "MAIN_LAB",
      name: "Central Diagnostic Laboratory",
      is_active: true,
    });

    const testSpecs = [
      {
        code: "CBC",
        name: "Complete Blood Count",
        loinc: "58410-2",
        specimen: "Blood",
        price: 8000,
      },
      {
        code: "FBS",
        name: "Fasting Blood Sugar",
        loinc: "1558-6",
        specimen: "Blood",
        price: 5000,
      },
      {
        code: "LIPID",
        name: "Lipid Profile",
        loinc: "24331-1",
        specimen: "Blood",
        price: 12000,
      },
      {
        code: "URINE",
        name: "Urinalysis",
        loinc: "24357-6",
        specimen: "Urine",
        price: 4000,
      },
      {
        code: "HBA1C",
        name: "HbA1c",
        loinc: "4548-4",
        specimen: "Blood",
        price: 15000,
      },
      {
        code: "LFT",
        name: "Liver Function Test",
        loinc: "24325-3",
        specimen: "Blood",
        price: 18000,
      },
    ];
    const tests: any[] = [];
    for (const t of testSpecs) {
      const test = await prisma.orm.public.LabTest.create({
        id: uuid(),
        tenant_id: tenant.id,
        laboratory_id: laboratory.id,
        code: t.code,
        name: t.name,
        loinc_code: t.loinc,
        specimen_type: t.specimen,
        price: t.price,
        is_active: true,
      });
      tests.push(test);
    }
    console.log(`   ✅ Laboratory + ${tests.length} tests`);

    // ============================================
    // 15. BILLING / INSURANCE / SUPPLIERS
    // ============================================
    console.log("➡️  [15/15] Seeding Billing, Insurance, Suppliers...");

    // Insurance provider
    await prisma.orm.public.InsuranceProvider.create({
      id: uuid(),
      tenant_id: tenant.id,
      name: "Myanmar Insurance",
      code: "MIG",
      phone: "+95922200001",
      email: "claims@myanmarinsurance.local",
      is_active: true,
    });
    await prisma.orm.public.InsuranceProvider.create({
      id: uuid(),
      tenant_id: tenant.id,
      name: "Grand Guardian Insurance",
      code: "GGI",
      phone: "+95922200002",
      email: "claims@ggi.local",
      is_active: true,
    });

    // Supplier
    await prisma.orm.public.Supplier.create({
      id: uuid(),
      tenant_id: tenant.id,
      code: "SUP001",
      name: "MedSupply Co., Ltd.",
      contact_name: "Ko Naing",
      phone: "+95933300001",
      email: "orders@medsupply.local",
      is_active: true,
    });
    await prisma.orm.public.Supplier.create({
      id: uuid(),
      tenant_id: tenant.id,
      code: "SUP002",
      name: "Healthcare Distributors",
      contact_name: "Ma Thet",
      phone: "+95933300002",
      email: "sales@hcdist.local",
      is_active: true,
    });

    // Invoice with items
    const invoice = await prisma.orm.public.Invoice.create({
      id: uuid(),
      tenant_id: tenant.id,
      hospital_id: hospital.id,
      patient_id: patients[0].id,
      invoice_no: "INV-2026-0001",
      currency: "MMK",
      status: "ISSUED",
      issued_at: new Date(),
    });

    const invoiceItems = [
      {
        description: "Consultation Fee - Dr. Thura Aung",
        quantity: 1,
        unit_price: 15000,
        discount: 0,
        tax: 0,
      },
      {
        description: "CBC Test",
        quantity: 1,
        unit_price: 8000,
        discount: 0,
        tax: 400,
      },
      {
        description: "Paracetamol 500mg (10 tablets)",
        quantity: 10,
        unit_price: 100,
        discount: 0,
        tax: 50,
      },
    ];
    let subtotal = 0;
    let taxTotal = 0;
    for (const item of invoiceItems) {
      const lineTotal =
        item.quantity * item.unit_price - item.discount + item.tax;
      subtotal += item.quantity * item.unit_price - item.discount;
      taxTotal += item.tax;
      await prisma.orm.public.InvoiceItem.create({
        id: uuid(),
        tenant_id: tenant.id,
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        tax: item.tax,
        line_total: lineTotal,
      });
    }
    const totalAmount = subtotal + taxTotal;
    await prisma.orm.public.Invoice.update({
      where: { id: invoice.id },
      data: {
        subtotal,
        tax: taxTotal,
        total: totalAmount,
        balanceDue: totalAmount,
      },
    });

    // Payment (partial)
    await prisma.orm.public.Payment.create({
      id: uuid(),
      tenant_id: tenant.id,
      invoice_id: invoice.id,
      payment_no: "PAY-2026-0001",
      method: "CASH",
      amount: 20000,
      currency: "MMK",
      status: "COMPLETED",
      paid_at: new Date(),
    });
    await prisma.orm.public.Invoice.update({
      where: { id: invoice.id },
      data: { balanceDue: totalAmount - 20000 },
    });

    console.log(`   ✅ Insurance providers, suppliers, invoice + payment`);

    // ============================================
    // ✅ DONE
    // ============================================
    console.log("\n🎉 ======================================");
    console.log("🎉 Database Seeding Completed Successfully!");
    console.log("🎉 ======================================\n");
    console.log("📝 Login Credentials:");
    console.log("   Admin:    admin@clinic.local       / AdminPassword123!");
    console.log("   Doctor:   doctor@clinic.local      / DoctorPassword123!");
    console.log("   Nurse:    nurse@clinic.local       / NursePassword123!");
    console.log("   Pharmacist: pharmacist@clinic.local / PharmPassword123!");
    console.log("   Cashier:  cashier@clinic.local     / CashierPassword123!");
    console.log();
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    if (sql && typeof sql.end === "function") {
      await sql.end({ timeout: 5 });
    }
  }
}

main();

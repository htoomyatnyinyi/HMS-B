import { prisma, sql } from "../src/infrastructure/database/prisma";

async function main() {
  console.log("🌱 Starting Database Seeding...");

  try {
    // 1. Seed Default Tenant
    const tenantId = crypto.randomUUID();
    console.log("➡️ Seeding Default Tenant...");
    const tenant = await prisma.orm.public.Tenant.create({
      id: tenantId,
      code: "TENANT_MAIN",
      name: "Central Healthcare Network",
      legalName: "Central Health Services Co., Ltd.",
      email: "contact@centralhealth.local",
      phone: "+95912345678",
      timezone: "Asia/Yangon",
      currency: "MMK",
      isActive: true,
    });
    console.log(`✅ Tenant created: ${tenant.name} (${tenant.code})`);

    // 2. Seed Default Hospital
    const hospitalId = crypto.randomUUID();
    console.log("➡️ Seeding Default Hospital...");
    const hospital = await prisma.orm.public.Hospital.create({
      id: hospitalId,
      tenantId: tenant.id,
      code: "MAIN_HOSPITAL",
      name: "Central General Hospital & Specialist Clinic",
      email: "info@centralclinic.local",
      phone: "+95998765432",
      timezone: "Asia/Yangon",
      currency: "MMK",
      isActive: true,
    });
    console.log(`✅ Hospital created: ${hospital.name} (${hospital.code})`);

    // 3. Seed Roles
    console.log("➡️ Seeding Roles...");
    const roles = [
      "SUPER_ADMIN",
      "ADMIN",
      "DOCTOR",
      "NURSE",
      "PHARMACIST",
      "CASHIER",
      "STAFF",
    ];
    for (const roleName of roles) {
      await prisma.orm.public.Role.create({
        tenantId: tenant.id,
        name: roleName,
        description: `${roleName} system role`,
        isSystem: true,
      });
    }
    console.log(`✅ Roles created: ${roles.join(", ")}`);

    // 4. Seed Admin User
    console.log("➡️ Seeding Admin User...");
    const adminPasswordHash = await Bun.password.hash("AdminPassword123!");
    const adminUser = await prisma.orm.public.User.create({
      tenantId: tenant.id,
      hospitalId: hospital.id,
      email: "admin@clinic.local",
      username: "admin",
      passwordHash: adminPasswordHash,
      firstName: "System",
      lastName: "Administrator",
      status: "ACTIVE",
    });
    console.log(
      `✅ Admin User created: ${adminUser.email} / AdminPassword123!`,
    );

    // 5. Seed Doctor User
    console.log("➡️ Seeding Doctor User...");
    const doctorPasswordHash = await Bun.password.hash("DoctorPassword123!");
    const doctorUser = await prisma.orm.public.User.create({
      tenantId: tenant.id,
      hospitalId: hospital.id,
      email: "doctor@clinic.local",
      username: "drthura",
      passwordHash: doctorPasswordHash,
      firstName: "Thura",
      lastName: "Aung",
      phone: "+95911122233",
      status: "ACTIVE",
    });
    console.log(
      `✅ Doctor User created: ${doctorUser.email} / DoctorPassword123!`,
    );

    // 6. Seed Default Departments
    console.log("➡️ Seeding Departments...");
    const departments = [
      { code: "OPD", name: "Outpatient Department" },
      { code: "ER", name: "Emergency Room" },
      { code: "IPD", name: "Inpatient Ward" },
      { code: "PHARM", name: "Pharmacy Services" },
      { code: "LAB", name: "Diagnostic Laboratory" },
    ];
    for (const dept of departments) {
      await prisma.orm.public.Department.create({
        hospitalId: hospital.id,
        code: dept.code,
        name: dept.name,
        isActive: true,
      });
    }
    console.log(
      `✅ Departments created: ${departments.map((d) => d.code).join(", ")}`,
    );

    // 7. Seed Default Pharmacy & Medicines
    console.log("➡️ Seeding Pharmacy & Medicines...");
    const pharmacy = await prisma.orm.public.Pharmacy.create({
      hospitalId: hospital.id,
      code: "MAIN_PHARMACY",
      name: "Central Dispensary & Pharmacy",
      location: "Ground Floor, Block A",
    });

    const sampleMeds = [
      {
        code: "MED001",
        name: "Paracetamol",
        genericName: "Acetaminophen",
        strength: "500mg",
        dosageForm: "Tablet",
        unit: "tablet",
      },
      {
        code: "MED002",
        name: "Amoxicillin",
        genericName: "Amoxicillin Trihydrate",
        strength: "500mg",
        dosageForm: "Capsule",
        unit: "capsule",
      },
      {
        code: "MED003",
        name: "Omeprazole",
        genericName: "Omeprazole",
        strength: "20mg",
        dosageForm: "Capsule",
        unit: "capsule",
      },
      {
        code: "MED004",
        name: "Cetirizine",
        genericName: "Cetirizine Dihydrochloride",
        strength: "10mg",
        dosageForm: "Tablet",
        unit: "tablet",
      },
      {
        code: "MED005",
        name: "Metformin",
        genericName: "Metformin HCl",
        strength: "500mg",
        dosageForm: "Tablet",
        unit: "tablet",
      },
    ];

    for (const med of sampleMeds) {
      await prisma.orm.public.Medicine.create({
        pharmacyId: pharmacy.id,
        code: med.code,
        name: med.name,
        genericName: med.genericName,
        strength: med.strength,
        dosageForm: med.dosageForm,
        unit: med.unit,
        isActive: true,
      });
    }
    console.log(`✅ Medicines catalog seeded: ${sampleMeds.length} items`);

    console.log("\n🎉 Database Seeding Completed Successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main();

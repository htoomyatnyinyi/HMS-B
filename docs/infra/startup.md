Hospital Management System အတွက် PostgreSQL + Prisma ORM ကို အခြေခံပြီး **production-oriented database schema** တည်ဆောက်ပေးနိုင်ပါတယ်။

ပေးထားတဲ့ API documentation — [Care API Swagger](https://careapi.ohc.network/swagger/?utm_source=chatgpt.com) ကို အခြေခံရပါမယ်။ Swagger UI ကို ဖွင့်ကြည့်နိုင်ပေမယ့် လက်ရှိရရှိတဲ့ page မှာ API endpoint နဲ့ request/response schema တွေကို တိုက်ရိုက်ဖတ်လို့မရသေးပါဘူး။ ဒါကြောင့် API နဲ့ ကိုက်ညီမှုရှိတယ်လို့ မစစ်ဆေးရသေးတဲ့ field တွေကို အတည်ပြုပြီးသားအဖြစ် မသတ်မှတ်ပါဘူး။

Database ကို ရိုးရိုး Patient Management သာမက Hospital ERP/HMS အဆင့်အထိ စဉ်းစားပါမယ်။

## **1. Proposed database modules**

အောက်ပါ module တွေပါဝင်အောင် တည်ဆောက်ဖို့ အကြံပြုပါတယ်။

| Module         | ပါဝင်မည့် Features                          |
| -------------- | ------------------------------------------- |
| Authentication | Users, Roles, Permissions, Sessions         |
| Hospital       | Hospitals, Branches, Departments, Wards     |
| Staff          | Doctors, Nurses, Employees, Specialties     |
| Patient        | Registration, Demographics, Medical History |
| OPD            | Appointments, Queues, Consultations         |
| IPD            | Admissions, Beds, Transfers, Discharges     |
| Emergency      | Emergency Cases, Triage                     |
| Clinical       | Encounters, Diagnoses, Clinical Notes       |
| Vitals         | Blood Pressure, Pulse, Temperature, SpO2    |
| Laboratory     | Lab Tests, Samples, Results                 |
| Radiology      | Imaging Orders, Reports                     |
| Pharmacy       | Medicines, Prescriptions, Dispensing        |
| Inventory      | Suppliers, Purchases, Stock Movements       |
| Billing        | Invoices, Payments, Refunds                 |
| Insurance      | Providers, Policies, Claims                 |
| Operation      | Surgery, Anesthesia, Operating Rooms        |
| Nursing        | Nursing Notes, Care Plans                   |
| Documents      | Medical Documents, Attachments              |
| Notification   | Email, SMS, In-app Notifications            |
| Reports        | Financial, Clinical, Operational Reports    |
| System         | Audit Logs, Settings, Integrations          |

## **2. Database architecture**

[تصميم وتنفيذ قاعدة بيانات كاملة من ERD إلى SQL إلى Dashboard - خمسات](https://images.openai.com/static-rsc-4/yjjjQxJ5rAqCxH4vmuKJGmYGJZf7ydmhRqrEh0HvIADCpPwNIySlhLhwBMqX0WIJ0EKFy5YYTs0OI2PiU1Snb78WIJ7nfNglXcKV6zI_6_3PsEZH3p7fGXGRpmUpuEE8eF4lMoXGxrPNE8mvgur3nR_0QaxwFTo3pQ3r7kPEirc?purpose=inline)

[khamsat.com](https://khamsat.com/data/databases/4224984-%D8%AA%D8%B5%D9%85%D9%8A%D9%85-%D9%88%D8%AA%D9%86%D9%81%D9%8A%D8%B0-%D9%82%D8%A7%D8%B9%D8%AF%D8%A9-%D8%A8%D9%8A%D8%A7%D9%86%D8%A7%D8%AA-%D9%83%D8%A7%D9%85%D9%84%D8%A9-%D9%85%D9%86-erd-%D8%A5%D9%84%D9%89-sql-%D8%A5%D9%84%D9%89-dashboard?utm_source=chatgpt.com)

အဓိက relationship တွေကတော့ -

```
Hospital
 ├── Branch
 │    ├── Department
 │    │    ├── Doctor
 │    │    ├── Nurse
 │    │    └── Staff
 │    ├── Ward
 │    │    └── Bed
 │    └── Patient
 │         ├── Appointment
 │         ├── Encounter
 │         │    ├── Diagnosis
 │         │    ├── Vitals
 │         │    ├── Prescription
 │         │    ├── Lab Order
 │         │    └── Clinical Notes
 │         ├── Admission
 │         ├── Invoice
 │         └── Medical Documents
 ├── Pharmacy
 ├── Laboratory
 ├── Radiology
 └── Billing
```

## **3. အရေးကြီးတဲ့အချက် — API နဲ့ Database ကိုက်ညီမှု**

Care API ဟာ OHC Network ရဲ့ open-source healthcare platform ဖြစ်ပြီး Patient Management, Facility Management, Clinical Records, Telemedicine, Triage နဲ့ Hospital Resources စတဲ့ capabilities တွေ ပါဝင်ပါတယ်။&#x20;

[image](https://www.google.com/s2/favicons?domain=https://github.com&sz=32)

GitHub+1

လက်ရှိ CARE documentation မှာလည်း FHIR R5, Encounters, Observations, Orders, Scheduling, Pharmacy နဲ့ Billing စတဲ့ architecture ကို ဖော်ပြထားပါတယ်။&#x20;

[image](https://www.google.com/s2/favicons?domain=https://docs.ohc.network&sz=32)

Care+1

ဒါကြောင့် သာမန် CRUD database တစ်ခုအဖြစ်မဟုတ်ဘဲ FHIR-compatible ဖြစ်နိုင်တဲ့ structure ကိုလည်း ထည့်သွင်းစဉ်းစားသင့်ပါတယ်။

## **4. Prisma Schema အတိအကျရေးရန်**

လိုအပ်နေသေးသော input

Swagger UI ကနေ OpenAPI JSON ကို export လုပ်ပြီး ဒီမှာ upload ပေးပါ။

Swagger page ထဲက `Download` / `JSON` ရှိရင် အသုံးပြုနိုင်ပါတယ်။ မရှိရင် API specification JSON ကို ရယူပြီး ပေးပါ။

**တစ်ခုသာ အတည်ပြုပေးပါ။**

**ဘယ်ပုံစံနဲ့ Database တည်ဆောက်ချင်ပါသလဲ။**

Care API ကို အတတ်နိုင်ဆုံး တိတိကျကျ Prisma နဲ့ ပြန်လည်တည်ဆောက်မယ်

Care API ကို အခြေခံပြီး Full Hospital Management System အဖြစ် Features တိုးချဲ့မယ်

သီးခြား Hospital SaaS System အသစ်တည်ဆောက်မယ်

Confirm

အပြီးသတ် deliverable မှာ `schema.prisma` တစ်ဖိုင်တည်းမဟုတ်ဘဲ အောက်ပါတွေပါ ထည့်ပေးပါမယ်။

- Complete Prisma Models, Enums and Relations
- PostgreSQL Indexes, Unique Constraints
- Proper Decimal, DateTime and JSON Fields
- Multi-hospital / Multi-branch Architecture
- RBAC (Roles & Permissions)
- Soft Delete and Audit Logging
- Medical Data Security Considerations
- Migration and Seed Structure
- `npx prisma validate` နဲ့ စစ်ဆေးနိုင်တဲ့ schema

**အဓိကက API နဲ့ Database schema ကိုက်ညီမှုရှိဖို့ပါ။** Swagger JSON ရရှိတာနဲ့ actual API models တွေကို စစ်ပြီး schema ကို အပြည့်အစုံရေးနိုင်ပါတယ်။
ရွေးချယ်ထားတဲ့ Architecture က **CARE-based Extended Hospital SaaS** ဖြစ်ပါတယ်။

CARE ရဲ့ Backend က Django REST Framework ဖြစ်ပြီး၊ ဒီ project မှာတော့ PostgreSQL + Prisma ORM + TypeScript Backend အတွက် data model ကို ပြန်လည်ဒီဇိုင်းလုပ်ပါမယ်။ CARE ရဲ့ Patient, Facility, Encounter, Observation, Orders, Scheduling, Forms, RBAC နဲ့ Audit concepts တွေကို အခြေခံပြီး Hospital-specific modules တွေ တိုးချဲ့ပါမယ်။&#x20;

[image](https://www.google.com/s2/favicons?domain=https://github.com&sz=32)

GitHub+2

အရေးကြီးတာတစ်ခုက ဒီ schema ဟာ CARE API ရဲ့ မူရင်း database ကို တိုက်ရိုက်ဘာသာပြန်ထားတာမဟုတ်ဘဲ CARE architecture ကို အခြေခံတဲ့ extended implementation ဖြစ်ပါတယ်။

## **Architecture ဆုံးဖြတ်ချက်များ**

- Multi-tenant: Hospital တစ်ခုချင်းစီ သီးခြား data isolation
- Multi-branch: Hospital တစ်ခုအောက်မှာ Branch အများအပြား
- PostgreSQL: UUID primary keys, Decimal money, JSONB
- FHIR-inspired: Patient, Encounter, Observation, ServiceRequest
- RBAC: Roles, Permissions, User assignments
- Clinical: OPD, IPD, Emergency, ICU, Surgery
- Operations: Laboratory, Radiology, Pharmacy, Inventory
- Finance: Billing, Payments, Insurance, Accounting
- Security: Audit trail, access logs, soft delete

## **5. Complete Prisma schema**

Generated

PostgreSQL · Prisma · 1,116 lines

**care_hospital_prisma_schema.prisma**

67 models · 30 enums · Full schema file

Download Prisma Schema

Included database models:

| Area         | Models                                                                  |
| ------------ | ----------------------------------------------------------------------- |
| Organization | Tenant, Hospital, Branch, Department                                    |
| Security     | User, UserSession, Role, Permission                                     |
| HR           | Staff, Doctor, Nurse, Specialty                                         |
| Patient      | Patient, PatientAllergy, PatientDocument                                |
| Clinical     | Appointment, Encounter, ClinicalNote, Observation, Condition, Diagnosis |
| Inpatient    | Ward, Room, Bed, Admission, BedTransfer                                 |
| Laboratory   | Laboratory, LabTest, LabOrder, Specimen, LabResult                      |
| Imaging      | ImagingOrder, ImagingReport                                             |
| Pharmacy     | Medicine, Prescription, Dispensation                                    |
| Inventory    | Supplier, StockItem, StockMovement, PurchaseOrder                       |
| Finance      | Invoice, Payment, Refund, Insurance, Claims                             |
| Surgery      | OperatingRoom, Surgery                                                  |
| Platform     | CareTask, Notifications, AuditLog, FHIR resources                       |

## **6. Project setup**

Recommended project structure:

```
hospital-management/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── patients/
│   │   ├── appointments/
│   │   ├── encounters/
│   │   ├── admissions/
│   │   ├── laboratory/
│   │   ├── radiology/
│   │   ├── pharmacy/
│   │   ├── inventory/
│   │   ├── billing/
│   │   └── reports/
│   ├── common/
│   └── main.ts
├── .env
└── package.json
```

Install dependencies:

```
npm install @prisma/client
npm install -D prisma

npx prisma init
```

Copy the downloaded schema into `prisma/schema.prisma`.

Configure PostgreSQL:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/hospital_db?schema=public"
```

Run:

```
npx prisma format
npx prisma validate
npx prisma migrate dev --name init_hospital
npx prisma generate
```

## **7. Important production requirements**

ဒီ schema ကို production မှာ အသုံးပြုမယ်ဆိုရင် အောက်ပါအချက်တွေကို ထပ်မံဖြည့်ဆည်းသင့်ပါတယ်။

1. **Tenant isolation:** Every query must enforce tenant and hospital ownership. PostgreSQL Row-Level Security (RLS) should be considered.
2. **Patient privacy:** Encrypt sensitive identifiers and protect medical documents.
3. **Bed management:** Use database transactions to prevent two patients from occupying the same bed.
4. **Inventory:** Every stock change should create an immutable stock movement record.
5. **Billing:** Use transactions for invoice, payment, refund and accounting operations.
6. **Clinical audit:** Track who viewed or changed sensitive medical records.
7. **FHIR compatibility:** The included `FhirResource` is an extensible JSON resource store, not a complete FHIR R5 implementation.
8. **Validation:** The generated file has not yet been run through Prisma CLI validation. Run `npx prisma validate` before migration and resolve any version-specific issues.

CARE references:

- [CARE Documentation](https://docs.ohc.network/?utm_source=chatgpt.com)
- [CARE Developer Documentation](https://docs.ohc.network/intro/?utm_source=chatgpt.com)
- [CARE Backend GitHub](https://github.com/ohcnetwork/care?utm_source=chatgpt.com)
- [CARE HMIS Architecture](https://ohc.network/solutions/hospital-management?utm_source=chatgpt.com)

## **8. Recommended next development stage**

I recommend implementing the following in this order:

1. **Prisma Schema Validation & Refinement**

   Validate relations, add missing constraints and tenant consistency checks.

2. **Complete Seed System**

   Super Admin, Hospital, Branch, Departments, Roles, Permissions, Doctors and sample patients.

3. **Authentication & RBAC**

   JWT, refresh tokens, role permissions and hospital-level access.

4. **Hospital Core APIs**

   Patient registration, OPD, appointments, encounters, IPD and bed management.

5. **Clinical & Operational APIs**

   Laboratory, pharmacy, radiology, inventory, billing and insurance.

**My recommendation:** Don't build all modules at once. First establish a reliable Patient → Appointment → Encounter → Admission → Billing workflow. Then extend the system.

I can continue by building the complete `seed.ts` with realistic hospital master data, RBAC permissions and initial Super Admin setup to match this schema.

hospital-management/
│
├── prisma/
│ ├── schema.prisma
│ ├── migrations/
│ ├── seed.ts
│ └── rls/
│ ├── 001_enable_rls.sql
│ ├── 002_tenant_policies.sql
│ └── 003_force_rls.sql
│
├── src/
│ ├── modules/
│ │ ├── auth/
│ │ ├── tenants/
│ │ ├── subscriptions/
│ │ ├── hospitals/
│ │ ├── branches/
│ │ ├── users/
│ │ ├── patients/
│ │ ├── appointments/
│ │ ├── encounters/
│ │ ├── admissions/
│ │ ├── laboratory/
│ │ ├── radiology/
│ │ ├── pharmacy/
│ │ ├── inventory/
│ │ ├── billing/
│ │ ├── insurance/
│ │ ├── surgery/
│ │ ├── notifications/
│ │ └── reports/
│ │
│ ├── common/
│ │ ├── middleware/
│ │ ├── guards/
│ │ ├── decorators/
│ │ ├── validators/
│ │ ├── errors/
│ │ └── logger/
│ │
│ ├── jobs/
│ ├── config/
│ ├── database/
│ └── main.ts
│
├── tests/
│ ├── unit/
│ ├── integration/
│ └── e2e/
│
├── docker/
├── docs/
├── .github/workflows/
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── package.json

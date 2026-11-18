Architecture ဖွဲ့စည်းပုံ (Microservice Monolith / Modular Monolith)

Monolith တစ်ခုတည်းအနေဖြင့် deploy လုပ်နိုင်သော်လည်း အတွင်းပိုင်းတွင် Microservice တစ်ခုစီကဲ့သို့ Domain တစ်ခုချင်းစီ (Bounded Context) သီးသန့်ခွဲထုတ်ထားပါသည်။ နောင်တစ်ချိန်တွင် မည်သည့် module ကိုမဆို သီးခြား Microservice Container အဖြစ် အလွယ်တကူ ခွဲထုတ်နိုင်စေရန် ရေးဆွဲထားပါသည်။

backend/src/
├── index.ts # Central Gateway & API Route Aggregator
├── config/
│ └── env.ts # Environment Variables (Database, JWT, Ports)
├── shared/
│ ├── middleware/
│ │ └── auth.middleware.ts # JWT Authentication & RBAC Guard
│ ├── utils/
│ │ └── response.ts # Standardized API Responses (Success, Error, Pagination)
│ └── types/
│ └── common.types.ts # Shared Context & DTO Types
├── infrastructure/
│ └── database/
│ └── prisma.ts # Database Connection & Safe Client
└── modules/ # Isolated Microservice Domain Modules
├── auth/ # Authentication, Login, Register, Profile, Roles
├── tenants/ # Multi-tenant, Hospitals, Branches, Departments
├── patients/ # Patient Registration, MRN, Demographics, Allergies
├── appointments/ # Doctor Scheduling, Bookings, Status Check-in
├── encounters/ # Consultations (OPD/IPD), SOAP Notes, Diagnoses, Vitals
├── admissions/ # Inpatient Wards, Rooms, Beds, Admission & Transfers
├── prescriptions/ # E-Prescriptions, Medication Orders
├── pharmacy/ # Medicine Catalog, Dispensations, Stock Movements
├── laboratory/ # Lab Tests Catalog, Orders, Specimen & Results
├── billing/ # Invoices, Payments, Insurance Claims
└── health/ # Liveness, Readiness & System Diagnostics

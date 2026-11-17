import { Elysia } from "elysia";
import { config } from "./config/env";
import { closeDatabase } from "./infrastructure/database/prisma";
import {
  admissionRoutes,
  wardRoutes,
} from "./modules/admissions/admission.routes";
import { appointmentRoutes } from "./modules/appointments/appointment.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { billingRoutes } from "./modules/billing/billing.routes";
import { encounterRoutes } from "./modules/encounters/encounter.routes";
import { healthRoutes } from "./modules/health/health.routes";
import { laboratoryRoutes } from "./modules/laboratory/laboratory.routes";
import { patientRoutes } from "./modules/patients/patient.routes";
import { pharmacyRoutes } from "./modules/pharmacy/pharmacy.routes";
import { prescriptionRoutes } from "./modules/prescriptions/prescription.routes";
import { hospitalRoutes, tenantRoutes } from "./modules/tenants/tenant.routes";
import swagger from "@elysiajs/swagger";

// Modular Monolith API Gateway
const apiV1 = new Elysia({ prefix: "/api/v1" })
  .use(authRoutes)
  .use(tenantRoutes)
  .use(hospitalRoutes)
  .use(patientRoutes)
  .use(appointmentRoutes)
  .use(encounterRoutes)
  .use(admissionRoutes)
  .use(wardRoutes)
  .use(prescriptionRoutes)
  .use(pharmacyRoutes)
  .use(laboratoryRoutes)
  .use(billingRoutes);

const app = new Elysia()
  // Swagger Interactive API Docs
  .use(
    swagger({
      documentation: {
        info: {
          title: "Extended Hospital Management System (HMS) API",
          version: "1.0.0",
          description: "CARE-based Modular Monolith Healthcare Backend API",
        },
      },
    }),
  )
  // CORS support for Client / Frontend
  .onRequest(({ request, set }) => {
    set.headers["access-control-allow-origin"] = "*";
    set.headers["access-control-allow-methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
    set.headers["access-control-allow-headers"] = "Content-Type, Authorization, Idempotency-Key";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }
  })
  // Global error handler
  .onError(({ code, error, set }) => {
    console.error(`[API Error] [${code}]:`, error);
    if (code === "VALIDATION") {
      set.status = 400;
      return {
        success: false,
        error: "Validation error",
        message: error.message,
      };
    }
    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        success: false,
        error: "Endpoint not found",
      };
    }
    set.status = 500;
    return {
      success: false,
      error: "Internal Server Error",
    };
  })
  // Health & diagnostics
  .use(healthRoutes)

  // Base index
  .get("/", () => ({
    name: "Extended Hospital Management System (HMS)",
    architecture: "Microservice Monolith (Modular Monolith)",
    version: "1.0.0",
    status: "running",
    apiPrefix: "/api/v1",
    modules: [
      {
        name: "auth",
        path: "/api/v1/auth",
        description: "Authentication, RBAC & user management",
      },
      {
        name: "tenants",
        path: "/api/v1/tenants",
        description: "Multi-tenant organizations & clinics",
      },
      {
        name: "hospitals",
        path: "/api/v1/hospitals",
        description: "Hospitals, branches & departments",
      },
      {
        name: "patients",
        path: "/api/v1/patients",
        description: "Patient demographic, MRN & medical records",
      },
      {
        name: "appointments",
        path: "/api/v1/appointments",
        description: "Doctor scheduling & appointments",
      },
      {
        name: "encounters",
        path: "/api/v1/encounters",
        description: "OPD/IPD consultations, notes & diagnosis",
      },
      {
        name: "admissions",
        path: "/api/v1/admissions",
        description: "Inpatient admission, ward & bed transfer",
      },
      {
        name: "prescriptions",
        path: "/api/v1/prescriptions",
        description: "Doctor e-prescribing",
      },
      {
        name: "pharmacy",
        path: "/api/v1/pharmacy",
        description: "Medicine catalog, inventory & dispensing",
      },
      {
        name: "laboratory",
        path: "/api/v1/laboratory",
        description: "Lab tests, orders, specimens & results",
      },
      {
        name: "billing",
        path: "/api/v1/billing",
        description: "Invoices, payments & insurance claims",
      },
      {
        name: "health",
        path: "/health",
        description: "System health & readiness probes",
      },
    ],
  }))
  // Mount v1 API
  .use(apiV1)
  .listen(config.port);

console.log(
  `🏥 Extended Hospital System (Modular Monolith) running at http://${app.server?.hostname}:${app.server?.port}`,
);

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  await closeDatabase();
  app.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down gracefully...");
  await closeDatabase();
  app.stop();
  process.exit(0);
});

export { app };
export default app;
export type App = typeof app;

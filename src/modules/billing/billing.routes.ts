import { Elysia, t } from "elysia";
import { authMiddleware, requireAuth } from "../../shared/middleware/auth.middleware";
import { errorResponse, successResponse } from "../../shared/utils/response";
import {
  createInvoice,
  getInvoiceById,
  listInvoices,
  recordPayment,
  submitInsuranceClaim,
} from "./billing.service";
import type { PaymentMethod } from "./billing.types";

export const billingRoutes = new Elysia({ prefix: "/billing" })
  .use(authMiddleware)
  .get("/invoices", async ({ query, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const hospitalId = query.hospitalId || user?.hospitalId;
    const invoices = await listInvoices(hospitalId, query.patientId, query.status);
    return successResponse(invoices);
  })
  .post(
    "/invoices",
    async ({ body, user, set }) => {
      const auth = requireAuth(user, ["ACCOUNTANT", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden: Accountant or Admin role required");
      }

      const hospitalId = body.hospitalId || user?.hospitalId;
      if (!hospitalId) {
        set.status = 400;
        return errorResponse("hospitalId is required");
      }

      try {
        const invoice = await createInvoice({
          ...body,
          hospitalId,
        });
        return successResponse(invoice, "Invoice created successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to create invoice");
      }
    },
    {
      body: t.Object({
        hospitalId: t.Optional(t.String()),
        patientId: t.String({ minLength: 1 }),
        currency: t.Optional(t.String()),
        items: t.Array(
          t.Object({
            serviceCode: t.Optional(t.String()),
            description: t.String({ minLength: 1 }),
            quantity: t.Number({ minimum: 1 }),
            unitPrice: t.Number({ minimum: 0 }),
            discount: t.Optional(t.Number()),
            tax: t.Optional(t.Number()),
          }),
        ),
      }),
    },
  )
  .get("/invoices/:id", async ({ params, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const invoice = await getInvoiceById(params.id);
    if (!invoice) {
      set.status = 404;
      return errorResponse("Invoice not found");
    }
    return successResponse(invoice);
  })
  .post(
    "/invoices/:id/payments",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user, ["ACCOUNTANT", "CASHIER", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }

      try {
        const payment = await recordPayment({
          invoiceId: params.id,
          method: body.method as PaymentMethod,
          amount: body.amount,
          currency: body.currency,
          transactionRef: body.transactionRef,
          notes: body.notes,
          receivedBy: user?.email,
        });
        return successResponse(payment, "Payment recorded successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to record payment");
      }
    },
    {
      body: t.Object({
        method: t.Union([
          t.Literal("CASH"),
          t.Literal("CARD"),
          t.Literal("BANK_TRANSFER"),
          t.Literal("MOBILE_WALLET"),
          t.Literal("INSURANCE"),
          t.Literal("OTHER"),
        ]),
        amount: t.Number({ minimum: 0.01 }),
        currency: t.Optional(t.String()),
        transactionRef: t.Optional(t.String()),
        notes: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/claims",
    async ({ body, user, set }) => {
      const auth = requireAuth(user, ["ACCOUNTANT", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }

      try {
        const claim = await submitInsuranceClaim(body);
        return successResponse(claim, "Insurance claim submitted successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to submit insurance claim");
      }
    },
    {
      body: t.Object({
        invoiceId: t.String({ minLength: 1 }),
        coverageId: t.String({ minLength: 1 }),
        providerId: t.String({ minLength: 1 }),
        claimedAmount: t.Number({ minimum: 0.01 }),
        remarks: t.Optional(t.String()),
      }),
    },
  );

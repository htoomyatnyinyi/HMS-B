import { Elysia, t } from "elysia";
import { authMiddleware, requireAuth } from "../../shared/middleware/auth.middleware";
import { errorResponse, successResponse } from "../../shared/utils/response";
import {
  createDispensation,
  createMedicine,
  listInventory,
  listMedicines,
  recordStockMovement,
} from "./pharmacy.service";

export const pharmacyRoutes = new Elysia({ prefix: "/pharmacy" })
  .use(authMiddleware)
  .get("/medicines", async ({ query, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const medicines = await listMedicines(query.pharmacyId, query.search);
    return successResponse(medicines);
  })
  .post(
    "/medicines",
    async ({ body, user, set }) => {
      const auth = requireAuth(user, ["PHARMACIST", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden: Pharmacist or Admin role required");
      }

      try {
        const medicine = await createMedicine(body);
        return successResponse(medicine, "Medicine created successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to create medicine");
      }
    },
    {
      body: t.Object({
        pharmacyId: t.String({ minLength: 1 }),
        code: t.String({ minLength: 1 }),
        name: t.String({ minLength: 1 }),
        genericName: t.Optional(t.String()),
        strength: t.Optional(t.String()),
        dosageForm: t.Optional(t.String()),
        route: t.Optional(t.String()),
        manufacturer: t.Optional(t.String()),
        barcode: t.Optional(t.String()),
        unit: t.Optional(t.String()),
        reorderLevel: t.Optional(t.Number()),
        isControlled: t.Optional(t.Boolean()),
      }),
    },
  )
  .get("/inventory", async ({ query, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const items = await listInventory(query.locationId);
    return successResponse(items);
  })
  .post(
    "/dispensations",
    async ({ body, user, set }) => {
      const auth = requireAuth(user, ["PHARMACIST", "NURSE", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden: Only pharmacy staff can dispense");
      }

      try {
        const dispensation = await createDispensation({
          ...body,
          pharmacistName: user?.email,
        });
        return successResponse(dispensation, "Medicines dispensed successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to dispense prescription");
      }
    },
    {
      body: t.Object({
        pharmacyId: t.String({ minLength: 1 }),
        prescriptionId: t.String({ minLength: 1 }),
        items: t.Array(
          t.Object({
            prescriptionItemId: t.String({ minLength: 1 }),
            quantity: t.Number({ minimum: 1 }),
          }),
        ),
      }),
    },
  )
  .post(
    "/movements",
    async ({ body, user, set }) => {
      const auth = requireAuth(user, ["PHARMACIST", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }

      try {
        const movement = await recordStockMovement(body);
        return successResponse(movement, "Stock movement recorded successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to record stock movement");
      }
    },
    {
      body: t.Object({
        locationId: t.String({ minLength: 1 }),
        medicineCode: t.String({ minLength: 1 }),
        batchNo: t.Optional(t.String()),
        movementType: t.Union([
          t.Literal("OPENING"),
          t.Literal("PURCHASE"),
          t.Literal("SALE"),
          t.Literal("DISPENSE"),
          t.Literal("RETURN"),
          t.Literal("TRANSFER"),
          t.Literal("ADJUSTMENT"),
          t.Literal("DAMAGE"),
          t.Literal("EXPIRED"),
        ]),
        quantity: t.Number(),
        unitCost: t.Optional(t.Number()),
        referenceNo: t.Optional(t.String()),
        notes: t.Optional(t.String()),
      }),
    },
  );

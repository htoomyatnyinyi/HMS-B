import { Elysia, t } from "elysia";
import { authMiddleware, requireAuth } from "../../shared/middleware/auth.middleware";
import { errorResponse, successResponse } from "../../shared/utils/response";
import { audit } from "../../shared/audit";
import {
  createDispensation,
  createMedicine,
  getDefaultPharmacy,
  createPurchaseOrder,
  createSupplier,
  getDispensationById,
  getMedicineById,
  listDispensations,
  listInventory,
  listMedicines,
  listPurchaseOrders,
  listSuppliers,
  receivePurchaseOrder,
  recordStockMovement,
  updateMedicine,
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
  .get("/medicines/:id", async ({ params, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const medicine = await getMedicineById(params.id);
    if (!medicine) {
      set.status = 404;
      return errorResponse("Medicine not found");
    }
    return successResponse(medicine);
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
        const pharmacy = body.pharmacyId
          ? { id: body.pharmacyId }
          : await getDefaultPharmacy(user?.hospitalId);
        if (!pharmacy) {
          set.status = 400;
          return errorResponse("No pharmacy is configured for this hospital");
        }
        const medicine = await createMedicine({ ...body, pharmacyId: pharmacy.id });
        return successResponse(medicine, "Medicine created successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to create medicine");
      }
    },
    {
      body: t.Object({
        pharmacyId: t.Optional(t.String()),
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
  .put(
    "/medicines/:id",
    async ({ params, body, user, set }) => {
      const auth = requireAuth(user, ["PHARMACIST", "ADMIN"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }

      try {
        const updated = await updateMedicine(params.id, body);
        return successResponse(updated, "Medicine updated successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to update medicine");
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        genericName: t.Optional(t.String()),
        strength: t.Optional(t.String()),
        dosageForm: t.Optional(t.String()),
        route: t.Optional(t.String()),
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
  .get("/dispensations", async ({ query, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const list = await listDispensations(query.pharmacyId);
    return successResponse(list);
  })
  .get("/dispensations/:id", async ({ params, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const dispensation = await getDispensationById(params.id);
    if (!dispensation) {
      set.status = 404;
      return errorResponse("Dispensation not found");
    }
    return successResponse(dispensation);
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
        const pharmacy = body.pharmacyId
          ? { id: body.pharmacyId }
          : await getDefaultPharmacy(user?.hospitalId);
        if (!pharmacy) {
          set.status = 400;
          return errorResponse("No pharmacy is configured for this hospital");
        }
        const dispensation = await createDispensation({
          ...body,
          pharmacyId: pharmacy.id,
          pharmacistName: user?.email,
        });
        await audit(user, "CREATE", "Dispensation", dispensation.id);
        return successResponse(dispensation, "Medicines dispensed successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to dispense prescription");
      }
    },
    {
      body: t.Object({
        pharmacyId: t.Optional(t.String()),
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
  )
  .get("/suppliers", async ({ user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const suppliers = await listSuppliers(user?.tenantId);
    return successResponse(suppliers);
  })
  .post(
    "/suppliers",
    async ({ body, user, set }) => {
      const auth = requireAuth(user, ["ADMIN", "PHARMACIST"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }

      const tenantId = body.tenantId || user?.tenantId;
      if (!tenantId) {
        set.status = 400;
        return errorResponse("tenantId is required");
      }

      try {
        const supplier = await createSupplier(tenantId, body);
        return successResponse(supplier, "Supplier added successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to add supplier");
      }
    },
    {
      body: t.Object({
        tenantId: t.Optional(t.String()),
        code: t.String({ minLength: 1 }),
        name: t.String({ minLength: 1 }),
        contactName: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        email: t.Optional(t.String({ format: "email" })),
      }),
    },
  )
  .get("/purchase-orders", async ({ query, user, set }) => {
    const auth = requireAuth(user);
    if (!auth.authorized) {
      set.status = 401;
      return errorResponse(auth.reason || "Unauthorized");
    }

    const orders = await listPurchaseOrders(query.supplierId);
    return successResponse(orders);
  })
  .post(
    "/purchase-orders",
    async ({ body, user, set }) => {
      const auth = requireAuth(user, ["ADMIN", "PHARMACIST"]);
      if (!auth.authorized) {
        set.status = 403;
        return errorResponse(auth.reason || "Forbidden");
      }

      try {
        const po = await createPurchaseOrder(body.supplierId, body.items);
        return successResponse(po, "Purchase order submitted successfully");
      } catch (err: any) {
        set.status = 400;
        return errorResponse(err.message || "Failed to create purchase order");
      }
    },
    {
      body: t.Object({
        supplierId: t.String({ minLength: 1 }),
        items: t.Array(
          t.Object({
            itemCode: t.String({ minLength: 1 }),
            description: t.String({ minLength: 1 }),
            quantity: t.Number({ minimum: 1 }),
            unitCost: t.Number({ minimum: 0 }),
          }),
        ),
      }),
    },
  )
  .patch("/purchase-orders/:id/receive", async ({ params, user, set }) => {
    const auth = requireAuth(user, ["ADMIN", "PHARMACIST"]);
    if (!auth.authorized) {
      set.status = 403;
      return errorResponse(auth.reason || "Forbidden");
    }

    try {
      const received = await receivePurchaseOrder(params.id);
      return successResponse(received, "Purchase order received & inventory updated");
    } catch (err: any) {
      set.status = 400;
      return errorResponse(err.message || "Failed to receive purchase order");
    }
  });

export interface CreateMedicineInput {
  pharmacyId: string;
  code: string;
  name: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  route?: string;
  manufacturer?: string;
  barcode?: string;
  unit?: string;
  reorderLevel?: number;
  isControlled?: boolean;
}

export interface DispenseItemInput {
  prescriptionItemId: string;
  quantity: number;
}

export interface CreateDispensationInput {
  pharmacyId: string;
  prescriptionId: string;
  pharmacistName?: string;
  items: DispenseItemInput[];
}

export interface StockMovementInput {
  locationId: string;
  medicineCode: string;
  batchNo?: string;
  movementType: "OPENING" | "PURCHASE" | "SALE" | "DISPENSE" | "RETURN" | "TRANSFER" | "ADJUSTMENT" | "DAMAGE" | "EXPIRED";
  quantity: number;
  unitCost?: number;
  referenceNo?: string;
  notes?: string;
}

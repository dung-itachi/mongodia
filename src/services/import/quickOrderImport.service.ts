/**
 * ==================================================
 * QUICK ORDER IMPORT SERVICE
 * ==================================================
 *
 * Sprint 9.x - Quick Order Import
 *
 * Service for importing quick orders into the database.
 * Creates Orders from validated editable rows.
 *
 * Pipeline:
 *   EditableQuickOrderRow[]
 *     |
 *     | (filter valid rows only)
 *     v
 *   For each row:
 *     | If new customer → create Customer
 *     | If existing customer → reuse
 *     v
 *   Create Order via orderService
 *     |
 *     v
 *   QuickOrderImportResult
 */

import mongoose, { ClientSession } from "mongoose";
import { Types } from "mongoose";

import Counter from "@/models/Counter";
import Customer, { ICustomer } from "@/models/Customer";
import Setting from "@/models/Setting";

import { OrderSource } from "@/constants/orderStatus";
import { CustomerStatus } from "@/types/customer";
import { orderService } from "@/services/order.service";

import type { QuickOrderImportContext } from "@/types/quickOrder";
import type { EditableQuickOrderRow } from "@/types/quickOrder";

// ==================================================
// Result types
// ==================================================

export interface QuickOrderImportResult {
  createdOrders: number;
  createdCustomers: number;
  skippedRows: number;
  errors: Array<{ rowNumber: number; message: string }>;
  elapsedTime: number;
}

/**
 * Thrown when simulation is required but not done.
 */
export class QuickOrderImportNotReadyError extends Error {
  constructor() {
    super(
      "QuickOrderImport: phải chạy simulate trước khi import thật."
    );
    this.name = "QuickOrderImportNotReadyError";
  }
}

// ==================================================
// Simulation
// ==================================================

export interface SimulationResult {
  readyToImport: boolean;
  validRows: number;
  invalidRows: number;
  newCustomers: number;
  existingCustomers: number;
  totalPrice: number;
  errors: Array<{ rowNumber: number; message: string }>;
}

/**
 * Simulate import without actually creating records.
 * Used to check if import is possible before doing it.
 */
export function simulateQuickOrderImport(
  rows: EditableQuickOrderRow[]
): SimulationResult {
  const errors: Array<{ rowNumber: number; message: string }> = [];
  let validRows = 0;
  let invalidRows = 0;
  let newCustomers = 0;
  let existingCustomers = 0;
  let totalPrice = 0;

  for (const row of rows) {
    if (row.status === "INVALID") {
      invalidRows++;
      for (const error of row.errors) {
        errors.push({
          rowNumber: row.rowNumber,
          message: error.message,
        });
      }
    } else {
      validRows++;
      totalPrice += row.editablePrice * row.editableQuantity;

      if (row.isNewCustomer) {
        newCustomers++;
      } else {
        existingCustomers++;
      }
    }
  }

  return {
    readyToImport: validRows > 0 && invalidRows === 0,
    validRows,
    invalidRows,
    newCustomers,
    existingCustomers,
    totalPrice,
    errors,
  };
}

// ==================================================
// Customer creation
// ==================================================

async function createCustomerForQuickOrder(
  customerName: string,
  phone: string,
  address: string,
  session: ClientSession
): Promise<{ id: Types.ObjectId; code: string }> {
  // Generate customer code
  const COUNTER_KEY = "CUSTOMER";
  const counter = await Counter.findOneAndUpdate(
    { key: COUNTER_KEY },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  )
    .session(session)
    .exec();

  const seq = (counter as unknown as { seq?: number }).seq ?? 1;
  const customerCode = `KH${String(seq).padStart(6, "0")}`;

  // Parse address into components
  const addressParts = address.split(",").map((p) => p.trim());

  const customer = new Customer({
    customerCode,
    fullName: customerName.trim(),
    phone: phone.trim(),
    address: {
      street: addressParts[0] || "",
      district: addressParts[1] || "",
      province: addressParts[2] || "",
    },
    status: CustomerStatus.ACTIVE,
    isActive: true,
  });

  const saved = await customer.save({ session });
  return { id: saved._id as Types.ObjectId, code: customerCode };
}

// ==================================================
// Main import function
// ==================================================

/**
 * Import validated quick orders into the database.
 *
 * @param rows - Validated editable rows from the preview
 * @param context - Import context with reference data
 * @param employeeId - ID of the employee performing the import
 */
export async function importQuickOrders(
  rows: EditableQuickOrderRow[],
  context: QuickOrderImportContext,
  employeeId: string
): Promise<QuickOrderImportResult> {
  if (!employeeId) {
    throw new Error("QuickOrderImport: employeeId là bắt buộc");
  }

  // Filter valid rows
  const validRows = rows.filter((row) => row.status === "VALID");
  const invalidRows = rows.filter((row) => row.status === "INVALID");

  if (validRows.length === 0) {
    return {
      createdOrders: 0,
      createdCustomers: 0,
      skippedRows: invalidRows.length,
      errors: invalidRows.flatMap((row) =>
        row.errors.map((e) => ({
          rowNumber: row.rowNumber,
          message: e.message,
        }))
      ),
      elapsedTime: 0,
    };
  }

  const started = Date.now();
  let createdOrders = 0;
  let createdCustomers = 0;

  const errors: Array<{ rowNumber: number; message: string }> = [];

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      for (const row of validRows) {
        try {
          // Determine customer ID
          let customerId: Types.ObjectId;

          if (row.customerId) {
            // Use existing customer
            customerId = new Types.ObjectId(row.customerId);
          } else {
            // Create new customer
            const newCustomer = await createCustomerForQuickOrder(
              row.editableCustomerName,
              row.editablePhone,
              row.editableAddress,
              session
            );
            customerId = newCustomer.id;
            createdCustomers++;
          }

          // Get combo and product info for snapshot
          const combo = row.editableComboId
            ? [...context.combosByCode.values()].find((c) => c.id === row.editableComboId)
            : undefined;

          const product = row.editableProductId
            ? context.productsByCode.get(
                [...context.productsByCode.entries()].find(
                  ([, p]) => p.id === row.editableProductId
                )?.[0] || ""
              )
            : undefined;

          // Create order using orderService
          const order = await orderService.create(
            {
              customerId: customerId.toString(),
              customerName: row.editableCustomerName,
              customerPhone: row.editablePhone,
              productId: row.editableProductId,
              comboId: row.editableComboId,
              productSnapshot: product
                ? { code: product.code, name: product.name }
                : undefined,
              comboSnapshot: combo
                ? { code: combo.code, name: combo.name }
                : undefined,
              quantity: row.editableQuantity,
              unitPrice: row.editablePrice,
              totalAmount: row.editablePrice * row.editableQuantity,
              currency: "MNT",
              orderSource: OrderSource.IMPORT,
              note: row.editableNote || `Quick Import - Row #${row.rowNumber}`,
              orderItems: [
                {
                  comboId: row.editableComboId,
                  productId: row.editableProductId,
                  comboName: combo?.name || row.editableProductId || "",
                  comboCode: combo?.code || "",
                  comboQuantity: row.editableQuantity,
                  packageQuantity: 1,
                  giftQuantity: combo?.giftQuantity || 0,
                  sellingPrice: row.editablePrice,
                  discount: 0,
                  subtotal: row.editablePrice * row.editableQuantity,
                  details: [],
                  giftMode: combo?.giftQuantity ? "RANDOM" : "RANDOM",
                  giftSelections: [],
                  productName: product?.name || row.editableProductId || "",
                  quantity: row.editableQuantity,
                  unitPrice: row.editablePrice,
                },
              ],
            },
            employeeId
          );

          createdOrders++;
        } catch (error) {
          // Log error but continue with other rows
          const message =
            error instanceof Error ? error.message : "Unknown error";
          errors.push({
            rowNumber: row.rowNumber,
            message: `Lỗi khi tạo đơn: ${message}`,
          });
        }
      }
    });
  } finally {
    await session.endSession();
  }

  return {
    createdOrders,
    createdCustomers,
    skippedRows: invalidRows.length + errors.length,
    errors,
    elapsedTime: Date.now() - started,
  };
}

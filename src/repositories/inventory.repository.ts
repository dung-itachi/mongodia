/**
 * ==================================================
 * INVENTORY REPOSITORY — READ-ONLY LEGACY READS
 * ==================================================
 *
 * Phase 8D-3: All mutation methods removed (decreaseStock, increaseStock,
 * createMovement, findProductStock, findProductVariant).
 *
 * Only the two read methods remain because they have ACTIVE PRODUCTION
 * callers (via the read methods of inventory.service.ts):
 *   - findMovements     → /api/inventory/movements
 *                         /api/warehouse/tasks/[id]/inventory
 *   - findMovementById  → /api/inventory/movements/[id]
 *
 * They read from the legacy `InventoryMovement` collection.
 */

import mongoose from "mongoose";
import { InventoryMovement, type IInventoryMovement } from "@/models/InventoryMovement";

// ============================================================================
// Mapper
// ============================================================================

function mapMovement(doc: IInventoryMovement) {
  return {
    _id: doc._id.toString(),
    warehouseId: doc.warehouseId.toString(),
    orderId: doc.orderId.toString(),
    warehouseTaskId: doc.warehouseTaskId.toString(),
    productVariantId: doc.productVariantId?.toString() ?? null,
    sku: doc.sku,
    productName: doc.productName,
    quantity: doc.quantity,
    type: doc.type,
    employeeId: doc.employeeId.toString(),
    note: doc.note ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

// ============================================================================
// Inventory Repository
// ============================================================================

export class InventoryRepository {
  /**
   * Find movements by warehouse ID with pagination
   */
  async findMovements(options?: {
    warehouseId?: string;
    orderId?: string;
    warehouseTaskId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ movements: Array<ReturnType<typeof mapMovement>>; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (options?.warehouseId) filter.warehouseId = new mongoose.Types.ObjectId(options.warehouseId);
    if (options?.orderId) filter.orderId = new mongoose.Types.ObjectId(options.orderId);
    if (options?.warehouseTaskId) filter.warehouseTaskId = new mongoose.Types.ObjectId(options.warehouseTaskId);

    const [docs, total] = await Promise.all([
      InventoryMovement.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InventoryMovement.countDocuments(filter),
    ]);

    return {
      movements: docs.map((doc) => mapMovement(doc as IInventoryMovement)),
      total,
    };
  }

  /**
   * Find movement by ID
   */
  async findMovementById(id: string): Promise<ReturnType<typeof mapMovement> | null> {
    const doc = await InventoryMovement.findById(id).lean();
    if (!doc) return null;
    return mapMovement(doc as IInventoryMovement);
  }
}

// Singleton instance
export const inventoryRepository = new InventoryRepository();

/**
 * ==================================================
 * INVENTORY REPOSITORY (DEPRECATED)
 * ==================================================
 *
 * @deprecated
 * This repository is DEPRECATED. It writes to the legacy
 * Inventory collection instead of WarehouseInventory (SoT).
 *
 * Replacement mapping:
 *   decreaseStock → NOT NEEDED (use orderShipmentService or stockEngine)
 *   increaseStock → NOT NEEDED (use warehouseWorkflowService)
 *
 * Phase 5 Audit: These methods are only called by deprecated
 * inventoryService methods, which are themselves unused.
 *
 * This repository is kept for backward compatibility and should
 * NOT be used for new stock operations.
 */

import mongoose from "mongoose";
import Inventory from "@/models/Inventory";
import ProductVariant from "@/models/ProductVariant";
import { InventoryMovement, type IInventoryMovement, MovementType } from "@/models/InventoryMovement";

// ============================================================================
// Types
// ============================================================================

export interface StockItem {
  warehouseId: string;
  productVariantId: string;
  quantity: number;
  availableQuantity: number;
}

export interface MovementData {
  warehouseId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  warehouseTaskId: mongoose.Types.ObjectId;
  productVariantId?: mongoose.Types.ObjectId;
  sku: string;
  productName: string;
  quantity: number;
  type: MovementType;
  employeeId: mongoose.Types.ObjectId;
  note?: string;
}

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
   * Find product stock in a warehouse
   */
  async findProductStock(
    warehouseId: string,
    productVariantId: string
  ): Promise<StockItem | null> {
    const doc = await Inventory.findOne({
      warehouseId: new mongoose.Types.ObjectId(warehouseId),
      productVariantId: new mongoose.Types.ObjectId(productVariantId),
    }).lean();

    if (!doc) return null;

    return {
      warehouseId: doc.warehouseId.toString(),
      productVariantId: doc.productVariantId.toString(),
      quantity: doc.quantity,
      availableQuantity: doc.availableQuantity,
    };
  }

  /**
   * Decrease stock quantity (called within a transaction)
   *
   * @deprecated Write to WarehouseInventory instead using stockEngine or orderShipmentService.
   * This method writes to legacy Inventory collection instead of WarehouseInventory (SoT).
   * Phase 5 Audit: Only called by deprecated inventoryService methods.
   */
  async decreaseStock(
    warehouseId: string,
    productVariantId: string,
    quantity: number,
    session?: mongoose.ClientSession
  ): Promise<StockItem | null> {
    const doc = await Inventory.findOneAndUpdate(
      {
        warehouseId: new mongoose.Types.ObjectId(warehouseId),
        productVariantId: new mongoose.Types.ObjectId(productVariantId),
        availableQuantity: { $gte: quantity },
      },
      {
        $inc: {
          quantity: -quantity,
          availableQuantity: -quantity,
        },
      },
      { new: true, session }
    ).lean();

    if (!doc) return null;

    return {
      warehouseId: doc.warehouseId.toString(),
      productVariantId: doc.productVariantId.toString(),
      quantity: doc.quantity,
      availableQuantity: doc.availableQuantity,
    };
  }

  /**
   * Increase stock quantity (called within a transaction)
   *
   * @deprecated Write to WarehouseInventory instead using warehouseWorkflowService.
   * This method writes to legacy Inventory collection instead of WarehouseInventory (SoT).
   * Phase 5 Audit: Only called by deprecated inventoryService methods.
   */
  async increaseStock(
    warehouseId: string,
    productVariantId: string,
    quantity: number,
    session?: mongoose.ClientSession
  ): Promise<StockItem | null> {
    const doc = await Inventory.findOneAndUpdate(
      {
        warehouseId: new mongoose.Types.ObjectId(warehouseId),
        productVariantId: new mongoose.Types.ObjectId(productVariantId),
      },
      {
        $inc: {
          quantity: quantity,
          availableQuantity: quantity,
        },
      },
      { new: true, session }
    ).lean();

    if (!doc) return null;

    return {
      warehouseId: doc.warehouseId.toString(),
      productVariantId: doc.productVariantId.toString(),
      quantity: doc.quantity,
      availableQuantity: doc.availableQuantity,
    };
  }

  /**
   * Create a movement record (called within a transaction)
   */
  async createMovement(
    data: MovementData,
    session?: mongoose.ClientSession
  ) {
    const movement = new InventoryMovement(data);
    const doc = await movement.save({ session });
    return mapMovement(doc);
  }

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

  /**
   * Find product variant by ID
   */
  async findProductVariant(id: string) {
    return ProductVariant.findById(id)
      .populate("productId", "_id code name")
      .lean();
  }
}

// Singleton instance
export const inventoryRepository = new InventoryRepository();

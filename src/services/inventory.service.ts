/**
 * ==================================================
 * INVENTORY SERVICE (DEPRECATED)
 * ==================================================
 *
 * @deprecated
 * This service is DEPRECATED. All methods write to the legacy
 * Inventory collection instead of WarehouseInventory (SoT).
 *
 * Replacement mapping:
 *   exportOrder()    → orderShipmentService.shipOrder()
 *   reserveStock()  → stockEngine.reserveStock()
 *   releaseStock()  → stockEngine.releaseReservedStock()
 *   rollbackExport()→ Not needed (use orderShipmentService)
 *   checkStock()    → warehouseInventoryQueryService
 *
 * Phase 5 Audit: All mutation methods are NOT CALLED by any
 * production code. Only read methods (checkStock) are used.
 *
 * This service is kept for backward compatibility and should
 * NOT be used for new stock operations.
 */

import mongoose from "mongoose";
import { inventoryRepository } from "@/repositories/inventory.repository";
import { MovementType } from "@/models/InventoryMovement";
import { InventoryAction, InventoryReason, InventorySource, InventoryReferenceType, InventoryTransactionType } from "@/constants/inventoryStatus";
import Inventory from "@/models/Inventory";
import { InventoryHistory } from "@/models/InventoryHistory";

// ============================================================================
// Types
// ============================================================================

export interface ExportOrderItem {
  productVariantId?: string;
  sku: string;
  productName: string;
  quantity: number;
}

export interface ExportOrderData {
  orderId: string;
  warehouseTaskId: string;
  warehouseId: string;
  items: ExportOrderItem[];
  employeeId: string;
  note?: string;
}

export interface ExportOrderResult {
  success: true;
  movements: Array<{
    _id: string;
    productVariantId: string | null;
    sku: string;
    productName: string;
    quantity: number;
    type: string;
  }>;
}

export interface ExportOrderError {
  success: false;
  error: string;
  insufficientItems?: Array<{
    sku: string;
    productName: string;
    requested: number;
    available: number;
  }>;
}

export interface RollbackExportData {
  warehouseTaskId: string;
  employeeId: string;
  note?: string;
}

export interface RollbackResult {
  success: true;
  message: string;
}

export interface RollbackError {
  success: false;
  error: string;
}

export interface CheckStockData {
  warehouseId: string;
  items: ExportOrderItem[];
}

export interface CheckStockResult {
  success: true;
  allAvailable: boolean;
  items: Array<{
    productVariantId: string | null;
    sku: string;
    productName: string;
    requested: number;
    available: number;
    sufficient: boolean;
  }>;
}

// ============================================================================
// Inventory Service
// ============================================================================

export class InventoryService {
  /**
   * Check stock availability for order items
   */
  async checkStock(data: CheckStockData): Promise<CheckStockResult> {
    const { warehouseId, items } = data;

    const itemsWithStock = await Promise.all(
      items.map(async (item) => {
        if (!item.productVariantId) {
          return {
            productVariantId: null,
            sku: item.sku,
            productName: item.productName,
            requested: item.quantity,
            available: 0,
            sufficient: false,
          };
        }

        const stock = await inventoryRepository.findProductStock(
          warehouseId,
          item.productVariantId
        );

        const available = stock?.availableQuantity ?? 0;

        return {
          productVariantId: item.productVariantId,
          sku: item.sku,
          productName: item.productName,
          requested: item.quantity,
          available,
          sufficient: available >= item.quantity,
        };
      })
    );

    const allAvailable = itemsWithStock.every((item) => item.sufficient);

    return {
      success: true,
      allAvailable,
      items: itemsWithStock,
    };
  }

  /**
   * Export order items from warehouse
   *
   * @deprecated Use orderShipmentService.shipOrder() instead.
   * This method writes to legacy Inventory collection instead of WarehouseInventory (SoT).
   * Phase 5 Audit: NOT CALLED by any production code.
   */
  async exportOrder(
    data: ExportOrderData
  ): Promise<ExportOrderResult | ExportOrderError> {
    const { orderId, warehouseTaskId, warehouseId, items, employeeId, note } = data;

    // Check stock first
    const stockCheck = await this.checkStock({ warehouseId, items });

    if (!stockCheck.allAvailable) {
      const insufficientItems = stockCheck.items
        .filter((item) => !item.sufficient)
        .map((item) => ({
          sku: item.sku,
          productName: item.productName,
          requested: item.requested,
          available: item.available,
        }));

      return {
        success: false,
        error: "Một số sản phẩm không đủ tồn kho",
        insufficientItems,
      };
    }

    // Start transaction
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const movements: Array<{
        _id: string;
        productVariantId: string | null;
        sku: string;
        productName: string;
        quantity: number;
        type: string;
      }> = [];

      const warehouseObjId = new mongoose.Types.ObjectId(warehouseId);
      const orderObjId = new mongoose.Types.ObjectId(orderId);
      const taskObjId = new mongoose.Types.ObjectId(warehouseTaskId);
      const employeeObjId = new mongoose.Types.ObjectId(employeeId);

      // Process each item
      for (const item of items) {
        if (!item.productVariantId) continue;

        const productVariantObjId = new mongoose.Types.ObjectId(item.productVariantId);

        // Get current stock
        const stock = await Inventory.findOne({
          warehouseId: warehouseObjId,
          productVariantId: productVariantObjId,
        }).session(session);

        if (!stock) {
          await session.abortTransaction();
          return {
            success: false,
            error: `Không tìm thấy tồn kho cho SKU: ${item.sku}`,
          };
        }

        const beforeQuantity = stock.quantity;
        const beforeAvailable = stock.availableQuantity;

        // Decrease stock (OUT action: reduces both quantity and reservedQuantity)
        const updatedStock = await Inventory.findOneAndUpdate(
          {
            warehouseId: warehouseObjId,
            productVariantId: productVariantObjId,
            availableQuantity: { $gte: item.quantity },
          },
          {
            $inc: {
              quantity: -item.quantity,
              reservedQuantity: -item.quantity,
              availableQuantity: -item.quantity,
            },
          },
          { new: true, session }
        ).session(session);

        if (!updatedStock) {
          await session.abortTransaction();
          return {
            success: false,
            error: `Không thể trừ tồn cho SKU: ${item.sku}`,
          };
        }

        // Create InventoryMovement
        const movement = await inventoryRepository.createMovement(
          {
            warehouseId: warehouseObjId,
            orderId: orderObjId,
            warehouseTaskId: taskObjId,
            productVariantId: productVariantObjId,
            sku: item.sku,
            productName: item.productName,
            quantity: item.quantity,
            type: MovementType.EXPORT,
            employeeId: employeeObjId,
            note: note || "Xuất kho khi WarehouseTask SHIPPED",
          },
          session
        );

        movements.push({
          _id: movement._id,
          productVariantId: movement.productVariantId,
          sku: movement.sku,
          productName: movement.productName,
          quantity: movement.quantity,
          type: movement.type,
        });

        // Create InventoryHistory for audit trail
        await InventoryHistory.create(
          [
            {
              warehouseId: warehouseObjId,
              productVariantId: productVariantObjId,
              orderId: orderObjId,
              employeeId: employeeObjId,
              transactionType: InventoryTransactionType.OUTBOUND,
              action: InventoryAction.OUT,
              reason: InventoryReason.ORDER_OUT,
              source: InventorySource.ORDER,
              referenceType: InventoryReferenceType.ORDER,
              referenceCode: orderId.slice(-12).toUpperCase(),
              beforeQuantity: beforeQuantity,
              changeQuantity: -item.quantity,
              afterQuantity: updatedStock.quantity,
              reservedChange: 0,
              note: note || "Xuất kho khi WarehouseTask SHIPPED",
            },
          ],
          { session }
        );
      }

      await session.commitTransaction();

      return {
        success: true,
        movements,
      };
    } catch (err) {
      await session.abortTransaction();
      console.error("InventoryService.exportOrder error:", err);
      return {
        success: false,
        error: "Lỗi khi xuất kho",
      };
    } finally {
      session.endSession();
    }
  }

  /**
   * Rollback export by restoring stock
   * Used when order is cancelled or returned
   *
   * @deprecated Use orderShipmentService.returnOrder() instead.
   * This method writes to legacy Inventory collection instead of WarehouseInventory (SoT).
   * Phase 5 Audit: NOT CALLED by any production code.
   */
  async rollbackExport(
    data: RollbackExportData
  ): Promise<RollbackResult | RollbackError> {
    const { warehouseTaskId, employeeId, note } = data;

    // Find all movements for this warehouse task
    const { movements } = await inventoryRepository.findMovements({
      warehouseTaskId,
      page: 1,
      limit: 1000,
    });

    if (movements.length === 0) {
      return {
        success: false,
        error: "Không tìm thấy movement nào để rollback",
      };
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const employeeObjId = new mongoose.Types.ObjectId(employeeId);

      for (const movement of movements) {
        if (!movement.productVariantId) continue;

        const productVariantObjId = new mongoose.Types.ObjectId(movement.productVariantId);
        const warehouseObjId = new mongoose.Types.ObjectId(movement.warehouseId);

        // Get current stock
        const stock = await Inventory.findOne({
          warehouseId: warehouseObjId,
          productVariantId: productVariantObjId,
        }).session(session);

        if (!stock) continue;

        const beforeQuantity = stock.quantity;

        // Restore stock
        await Inventory.findOneAndUpdate(
          {
            warehouseId: warehouseObjId,
            productVariantId: productVariantObjId,
          },
          {
            $inc: {
              quantity: movement.quantity,
              availableQuantity: movement.quantity,
            },
          },
          { session }
        ).session(session);

        const updatedStock = await Inventory.findOne({
          warehouseId: warehouseObjId,
          productVariantId: productVariantObjId,
        }).session(session);

        // Create rollback movement
        await inventoryRepository.createMovement(
          {
            warehouseId: warehouseObjId,
            orderId: new mongoose.Types.ObjectId(movement.orderId),
            warehouseTaskId: new mongoose.Types.ObjectId(movement.warehouseTaskId),
            productVariantId: productVariantObjId,
            sku: movement.sku,
            productName: movement.productName,
            quantity: movement.quantity,
            type: MovementType.IMPORT,
            employeeId: employeeObjId,
            note: note || "Rollback xuất kho",
          },
          session
        );

        // Create InventoryHistory for audit trail
        await InventoryHistory.create(
          [
            {
              warehouseId: warehouseObjId,
              productVariantId: productVariantObjId,
              orderId: new mongoose.Types.ObjectId(movement.orderId),
              employeeId: employeeObjId,
              transactionType: InventoryTransactionType.INBOUND,
              action: InventoryAction.RETURN,
              reason: InventoryReason.ORDER_RETURNED,
              source: InventorySource.ORDER,
              referenceType: InventoryReferenceType.ORDER,
              referenceCode: movement.orderId.slice(-12).toUpperCase(),
              beforeQuantity,
              changeQuantity: movement.quantity,
              afterQuantity: updatedStock?.quantity ?? beforeQuantity + movement.quantity,
              reservedChange: 0,
              note: note || "Rollback xuất kho",
            },
          ],
          { session }
        );
      }

      await session.commitTransaction();

      return {
        success: true,
        message: `Đã rollback ${movements.length} movement(s)`,
      };
    } catch (err) {
      await session.abortTransaction();
      console.error("InventoryService.rollbackExport error:", err);
      return {
        success: false,
        error: "Lỗi khi rollback xuất kho",
      };
    } finally {
      session.endSession();
    }
  }

  /**
   * Get movements with pagination
   */
  async getMovements(options?: {
    warehouseId?: string;
    orderId?: string;
    warehouseTaskId?: string;
    page?: number;
    limit?: number;
  }) {
    return inventoryRepository.findMovements(options);
  }

  /**
   * Get movement by ID
   */
  async getMovementById(id: string) {
    return inventoryRepository.findMovementById(id);
  }

  /**
   * Reserve stock for an order (Phase 4.3 compatible)
   *
   * @deprecated Use stockEngine.reserveStock() instead.
   * This method writes to legacy Inventory collection instead of WarehouseInventory (SoT).
   * Phase 5 Audit: NOT CALLED by any production code.
   */
  async reserveStock(
    warehouseId: string,
    productVariantId: string,
    quantity: number,
    orderId: string,
    employeeId: string,
    session?: mongoose.ClientSession
  ): Promise<boolean> {
    const result = await Inventory.findOneAndUpdate(
      {
        warehouseId: new mongoose.Types.ObjectId(warehouseId),
        productVariantId: new mongoose.Types.ObjectId(productVariantId),
        availableQuantity: { $gte: quantity },
      },
      {
        $inc: {
          availableQuantity: -quantity,
          reservedQuantity: quantity,
        },
      },
      { new: true, session }
    ).session(session ?? null);

    return !!result;
  }

  /**
   * Release reserved stock
   *
   * @deprecated Use stockEngine.releaseReservedStock() instead.
   * This method writes to legacy Inventory collection instead of WarehouseInventory (SoT).
   * Phase 5 Audit: NOT CALLED by any production code.
   */
  async releaseStock(
    warehouseId: string,
    productVariantId: string,
    quantity: number,
    session?: mongoose.ClientSession
  ): Promise<boolean> {
    const result = await Inventory.findOneAndUpdate(
      {
        warehouseId: new mongoose.Types.ObjectId(warehouseId),
        productVariantId: new mongoose.Types.ObjectId(productVariantId),
        reservedQuantity: { $gte: quantity },
      },
      {
        $inc: {
          availableQuantity: quantity,
          reservedQuantity: -quantity,
        },
      },
      { new: true, session }
    ).session(session ?? null);

    return !!result;
  }
}

// Singleton instance
export const inventoryService = new InventoryService();

/**
 * ==================================================
 * INVENTORY MOVEMENT MODEL
 * ==================================================
 *
 * Sprint 6.4 — Inventory Movement
 *
 * Log bất biến cho mỗi lần xuất/nhập/điều chỉnh kho.
 * Được tạo khi WarehouseTask chuyển sang SHIPPED.
 *
 * KHÔNG tự thay đổi dữ liệu tồn kho.
 * Mọi service sẽ INSERT row mới thay vì UPDATE.
 */

import mongoose, { Schema, Document } from "mongoose";

/**
 * Loại movement
 */
export enum MovementType {
  /** Xuất kho (khi WarehouseTask SHIPPED) */
  EXPORT = "EXPORT",
  /** Nhập kho (hoàn hàng, điều chỉnh tăng) */
  IMPORT = "IMPORT",
  /** Điều chỉnh tồn kho */
  ADJUSTMENT = "ADJUSTMENT",
}

export interface IInventoryMovement extends Document {
  /** Warehouse thực hiện movement */
  warehouseId: mongoose.Types.ObjectId;
  /** Order liên quan */
  orderId: mongoose.Types.ObjectId;
  /** WarehouseTask liên quan */
  warehouseTaskId: mongoose.Types.ObjectId;
  /** Biến thể sản phẩm */
  productVariantId?: mongoose.Types.ObjectId;
  /** SKU sản phẩm */
  sku: string;
  /** Tên sản phẩm */
  productName: string;
  /** Số lượng xuất/nhập */
  quantity: number;
  /** Loại movement */
  type: MovementType;
  /** Nhân viên thực hiện */
  employeeId: mongoose.Types.ObjectId;
  /** Ghi chú */
  note?: string;
  createdAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    warehouseTaskId: {
      type: Schema.Types.ObjectId,
      ref: "WarehouseTask",
      required: true,
      index: true,
    },
    productVariantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      index: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(MovementType),
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    note: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ==================================================
// Indexes
// ==================================================

// Theo warehouse + thời gian (danh sách movements trong kho)
InventoryMovementSchema.index({ warehouseId: 1, createdAt: -1 });

// Theo order (lịch sử movements của 1 order)
InventoryMovementSchema.index({ orderId: 1, createdAt: -1 });

// Theo warehouse task
InventoryMovementSchema.index({ warehouseTaskId: 1, createdAt: -1 });

// Theo product variant (cross-warehouse)
InventoryMovementSchema.index({ productVariantId: 1, createdAt: -1 });

export const InventoryMovement =
  mongoose.models.InventoryMovement ||
  mongoose.model<IInventoryMovement>(
    "InventoryMovement",
    InventoryMovementSchema
  );

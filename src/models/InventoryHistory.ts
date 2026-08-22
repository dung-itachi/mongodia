/**
 * ==================================================
 * InventoryHistory Model
 * ==================================================
 *
 * Log bất biến cho mọi thay đổi tồn kho (foundation, Phase 4.1).
 *
 * Phase tiếp theo (4.2+) sẽ dùng model này để:
 *  - Audit trail.
 *  - Reverse transaction (RETURN).
 *  - Build Stock Engine (compute current state từ history).
 *
 * KHÔNG tự thay đổi dữ liệu tồn kho.
 * Mọi service (Rule + Engine) sẽ INSERT row mới thay vì UPDATE row cũ.
 * ==================================================
 */

import mongoose, { Schema, Document } from "mongoose";

import {
  InventoryTransactionType,
  InventoryAction,
  InventoryReason,
  InventorySource,
  InventoryReferenceType,
} from "@/constants/inventoryStatus";

export interface IInventoryHistory extends Document {
  warehouseId: mongoose.Types.ObjectId;
  /**
   * Biến thể sản phẩm cụ thể (variant = color × size × ...).
   * Bắt buộc khi gắn với product; null khi gắn với combo.
   */
  productVariantId?: mongoose.Types.ObjectId;
  /**
   * Combo gắn với transaction.
   * Bắt buộc khi không có productVariantId.
   */
  comboId?: mongoose.Types.ObjectId;
  /** Order liên quan (nếu trigger từ Order flow). */
  orderId?: mongoose.Types.ObjectId;
  /** Nhân viên thao tác. */
  employeeId: mongoose.Types.ObjectId;
  /** Loại nghiệp vụ cấp cao. */
  transactionType: InventoryTransactionType;
  /** Hành vi cụ thể. */
  action: InventoryAction;
  /** Lý do khởi tạo (audit). */
  reason: InventoryReason;
  /** Nguồn dữ liệu (Manual / Order / ...). */
  source: InventorySource;
  /**
   * Loại tài liệu nguồn (Order / Lead / Purchase / Transfer / Adjustment / …).
   * Dùng để map ngược về entity cha mà không phải đoán từ `reason`.
   */
  referenceType?: InventoryReferenceType;
  /**
   * Mã tham chiếu dạng người-đọc được, vd: `OD250801001`, `LD250801001`,
   * `WH250801001`. Timeline UI sẽ hiển thị mã này làm anchor chính.
   */
  referenceCode?: string;
  /** Snapshot tồn kho trước giao dịch. */
  beforeQuantity: number;
  /** Số lượng thay đổi (âm hoặc dương). */
  changeQuantity: number;
  /** Snapshot tồn kho sau giao dịch (sẽ = beforeQuantity + changeQuantity). */
  afterQuantity: number;
  /**
   * Phase 4.3 refactor — reserved delta (signed) cho RESERVE / UNRESERVE.
   *
   * - RESERVE    → +quantity (input StockLineItem)
   * - UNRESERVE  → −quantity
   * - OUT / RETURN / INBOUND / ADJUST / TRANSFER_* → 0
   *
   * Append-only log cho phép query `netReserved(orderId, productVariantId)`
   * bằng aggregate `Σ reservedChange` theo `orderId`. Đây là source of truth
   * duy nhất để biết Order có đang giữ chỗ tồn kho không — KHÔNG dựa vào
   * `Inventory.reservedQuantity` (cộng dồn nhiều Order cùng variant) cũng
   * KHÔNG dựa vào cờ boolean trên Order (dễ lệch).
   *
   * Mặc định 0 cho backward-compat với history rows cũ (nếu có).
   */
  reservedChange: number;
  note?: string;
  createdAt: Date;
}

const InventoryHistorySchema = new Schema<IInventoryHistory>(
  {
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    productVariantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      index: true,
    },
    comboId: {
      type: Schema.Types.ObjectId,
      ref: "Combo",
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    transactionType: {
      type: String,
      required: true,
      enum: Object.values(InventoryTransactionType),
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: Object.values(InventoryAction),
      index: true,
    },
    reason: {
      type: String,
      required: true,
      enum: Object.values(InventoryReason),
    },
    source: {
      type: String,
      required: true,
      enum: Object.values(InventorySource),
      default: InventorySource.SYSTEM,
    },
    referenceType: {
      type: String,
      enum: Object.values(InventoryReferenceType),
      index: true,
    },
    referenceCode: {
      type: String,
      trim: true,
      index: true,
    },
    beforeQuantity: { type: Number, required: true, default: 0 },
    changeQuantity: { type: Number, required: true },
    afterQuantity: { type: Number, required: true, default: 0 },
    reservedChange: { type: Number, default: 0 },
    note: { type: String, default: "" },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ==================================================
// Indexes — phục vụ query phổ biến từ Foundation trở đi
// ==================================================

// Lấy lịch sử của 1 kho theo thời gian (UI inventory timeline).
InventoryHistorySchema.index({ warehouseId: 1, createdAt: -1 });

// Lấy lịch sử của 1 biến thể sản phẩm trong 1 kho.
InventoryHistorySchema.index({
  warehouseId: 1,
  productVariantId: 1,
  createdAt: -1,
});

// Lấy lịch sử của 1 combo trong 1 kho.
InventoryHistorySchema.index({
  warehouseId: 1,
  comboId: 1,
  createdAt: -1,
});

// Truy vết theo Order.
InventoryHistorySchema.index({ orderId: 1, createdAt: -1 });

// Truy vết theo ProductVariant (cross-warehouse).
InventoryHistorySchema.index({ productVariantId: 1, createdAt: -1 });

// Truy vết theo mã tham chiếu + kho (vd: tìm lịch sử kho từ 1 Order).
InventoryHistorySchema.index({ referenceCode: 1, warehouseId: 1 });

// Truy vết theo loại tham chiếu + thời gian (vd: tất cả transaction từ PURCHASE trong 30 ngày).
InventoryHistorySchema.index({ referenceType: 1, createdAt: -1 });

// Global "last N inventory events" cho dashboard activities — trước đây phải COLLSCAN
// + in-memory sort vì không có index nào đứng đầu bởi createdAt.
InventoryHistorySchema.index({ createdAt: -1 });

export const InventoryHistory =
  (mongoose.models.InventoryHistory as mongoose.Model<IInventoryHistory>) ||
  mongoose.model<IInventoryHistory>("InventoryHistory", InventoryHistorySchema);

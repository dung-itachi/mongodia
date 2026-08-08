/**
 * ==================================================
 * GIFT MODEL
 * ==================================================
 *
 * Sprint 8.x - Gift Management
 *
 * Quà tặng KHÔNG phải Product:
 * - Không bán
 * - Không có giá bán
 * - Không có giá vốn
 * - Không có SKU / barcode
 * - Không có category / variant
 * - Không tham gia ProductVariant
 *
 * Gift chỉ cần:
 * - Tên quà
 * - Số lượng tồn kho
 * - Trạng thái active
 */

import mongoose, { Model, Schema } from "mongoose";

export interface IGift {
  /** Tên quà tặng */
  name: string;
  /** Số lượng tồn kho */
  stockQuantity: number;
  /** Trạng thái hoạt động (soft delete) */
  isActive: boolean;
  /** createdAt - auto */
  createdAt?: Date;
  /** updatedAt - auto */
  updatedAt?: Date;
}

const GiftSchema = new Schema<IGift>(
  {
    name: {
      type: String,
      required: [true, "Tên quà tặng là bắt buộc"],
      trim: true,
      minlength: [2, "Tên quà tặng phải có ít nhất 2 ký tự"],
      maxlength: [100, "Tên quà tặng tối đa 100 ký tự"],
    },
    stockQuantity: {
      type: Number,
      required: [true, "Số lượng tồn kho là bắt buộc"],
      min: [0, "Số lượng tồn kho không được âm"],
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "gifts",
  }
);

// ============================================================================
// Indexes
// ============================================================================

// Unique index cho name (case-insensitive) - chống trùng lặp
GiftSchema.index(
  { name: 1 },
  {
    unique: true,
    collation: { locale: "vi", strength: 2 },
  }
);

// Query index
GiftSchema.index({ isActive: 1, name: 1 });

const Gift: Model<IGift> =
  mongoose.models.Gift || mongoose.model<IGift>("Gift", GiftSchema);

export default Gift;

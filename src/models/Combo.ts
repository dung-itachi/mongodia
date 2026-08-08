import mongoose, { Model, Schema, Types } from "mongoose";

/**
 * ==================================================
 * COMBO MODEL
 * ==================================================
 *
 * Sprint 8.x - Refactor: Combo theo Product
 *
 * Combo là cấu hình bán hàng của MỘT Product.
 *
 * Quan hệ:
 *   Product 1 ── n Combo
 *
 * Combo chỉ lưu:
 *   - productId
 *   - packageQuantity (số SP / combo)
 *   - sellingPrice
 *   - giftQuantity (số quà / combo)
 *
 * Combo KHÔNG lưu:
 *   - variantId / ProductVariant
 *   - variantValues / COLOR / SIZE
 *   - giftProductId (Gift collection)
 *   - categoryId riêng (lấy từ Product.categoryId khi hiển thị)
 *
 * Variant và quà cụ thể sẽ được Sale tư vấn khách rồi ghi vào Order.
 */

export interface ICombo {
  code: string;
  name: string;
  /** Sản phẩm mà combo này thuộc về (bắt buộc). */
  productId: Types.ObjectId;
  /** Số sản phẩm có trong 1 combo (> 0). */
  packageQuantity: number;
  /** Giá bán combo (>= 0). */
  sellingPrice: number;
  /** Số quà tặng cho mỗi combo (>= 0). */
  giftQuantity: number;
  displayOrder: number;
  image?: string;
  description?: string;
  isActive: boolean;
}

const ComboSchema = new Schema<ICombo>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    packageQuantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    giftQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    displayOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    image: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique (productId, name) để không trùng tên combo trong cùng 1 product.
ComboSchema.index({ productId: 1, name: 1 }, { unique: true });

// Query indexes
ComboSchema.index({ isActive: 1, productId: 1, displayOrder: 1 });
ComboSchema.index({ productId: 1, displayOrder: 1 });

const Combo: Model<ICombo> =
  mongoose.models.Combo || mongoose.model<ICombo>("Combo", ComboSchema);

export default Combo;

import mongoose, { Model, Schema, Types } from "mongoose";

export interface IProduct {
  code: string;

  name: string;

  categoryId: Types.ObjectId;

  image?: string;

  description?: string;

  isActive: boolean;

  /** Account ID để phân quyền xem sản phẩm theo tài khoản */
  accountId?: Types.ObjectId;

  /** Danh sách ID của các thuộc tính biến thể (VariantOption) thuộc về sản phẩm này */
  variantOptionIds?: Types.ObjectId[];
}

const ProductSchema = new Schema<IProduct>(
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

    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
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

    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      default: null,
      index: true,
    },

    variantOptionIds: {
      type: [Schema.Types.ObjectId],
      ref: "VariantOption",
      default: [],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for filtering by accountId and isActive
ProductSchema.index({ accountId: 1, isActive: 1 });

const Product: Model<IProduct> =
  mongoose.models.Product ||
  mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
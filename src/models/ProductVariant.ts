import mongoose, { Model, Schema, Types } from "mongoose";

export interface IProductVariant {
  productId: Types.ObjectId;

  sku: string;

  barcode?: string;

  image?: string;

  variantValues: Types.ObjectId[];

  price: number;

  cost?: number;

  weight?: number;

  sortOrder?: number;

  isActive: boolean;
}

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    barcode: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    variantValues: {
      type: [Schema.Types.ObjectId],
      ref: "VariantValue",
      required: true,
      default: [],
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    cost: {
      type: Number,
      default: 0,
    },

    weight: {
      type: Number,
      default: 0,
    },

    sortOrder: {
      type: Number,
      default: 0,
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

ProductVariantSchema.index({ productId: 1 });
ProductVariantSchema.index({ variantValues: 1 });

const ProductVariant: Model<IProductVariant> =
  mongoose.models.ProductVariant ||
  mongoose.model<IProductVariant>(
    "ProductVariant",
    ProductVariantSchema
  );

export default ProductVariant;

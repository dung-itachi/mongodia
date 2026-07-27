import mongoose, { Model, Schema, Types } from "mongoose";

export interface IVariantAttribute {
  name: string;

  value: string;
}

export interface IProductVariant {
  productId: Types.ObjectId;

  name: string;

  sku: string;

  barcode?: string;

  attributes: IVariantAttribute[];

  price: number;

  cost: number;

  weight: number;

  image?: string;

  isDefault: boolean;

  isActive: boolean;
}

const VariantAttributeSchema =
  new Schema<IVariantAttribute>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      value: {
        type: String,
        required: true,
        trim: true,
      },
    },
    {
      _id: false,
    }
  );

const ProductVariantSchema =
  new Schema<IProductVariant>(
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
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

      attributes: {
        type: [VariantAttributeSchema],
        default: [],
      },

      price: {
        type: Number,
        default: 0,
        min: 0,
      },

      cost: {
        type: Number,
        default: 0,
        min: 0,
      },

      weight: {
        type: Number,
        default: 0,
        min: 0,
      },

      image: {
        type: String,
        default: "",
      },

      isDefault: {
        type: Boolean,
        default: false,
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

const ProductVariant: Model<IProductVariant> =
  mongoose.models.ProductVariant ||
  mongoose.model<IProductVariant>(
    "ProductVariant",
    ProductVariantSchema
  );

export default ProductVariant;
import mongoose, { Model, Schema, Types } from "mongoose";

export interface IComboItem {
  productVariantId: Types.ObjectId;
  quantity: number;
  isGift: boolean;
}

export interface ICombo {
  code: string;
  name: string;
  productId: Types.ObjectId;
  categoryId: Types.ObjectId;
  comboItems: IComboItem[];
  sellingPrice: number;
  packageSize: number;
  displayOrder: number;
  image?: string;
  description?: string;
  isActive: boolean;
}

const ComboItemSchema = new Schema<IComboItem>(
  {
    productVariantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    isGift: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

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
    },

    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    comboItems: {
      type: [ComboItemSchema],
      required: true,
      validate: {
        validator: function (items: IComboItem[]) {
          return items.length > 0;
        },
        message: "Combo phải có ít nhất 1 ComboItem",
      },
    },

    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    packageSize: {
      type: Number,
      required: true,
      min: 1,
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

// Unique indexes
ComboSchema.index({ productId: 1, name: 1 }, { unique: true });

// Query indexes
ComboSchema.index({ isActive: 1, categoryId: 1, displayOrder: 1 });
ComboSchema.index({ productId: 1, displayOrder: 1 });
ComboSchema.index({ "comboItems.productVariantId": 1 });

const Combo: Model<ICombo> =
  mongoose.models.Combo || mongoose.model<ICombo>("Combo", ComboSchema);

export default Combo;

import mongoose, { Model, Schema, Types } from "mongoose";

export interface IVariantValue {
  code: string;
  name: string;
  variantOptionId: Types.ObjectId;
  sortOrder: number;
  isActive: boolean;
}

const VariantValueSchema = new Schema<IVariantValue>(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    variantOptionId: {
      type: Schema.Types.ObjectId,
      ref: "VariantOption",
      required: true,
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

VariantValueSchema.index(
  {
    variantOptionId: 1,
    code: 1,
  },
  {
    unique: true,
  }
);

VariantValueSchema.index(
  {
    variantOptionId: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

const VariantValue: Model<IVariantValue> =
  mongoose.models.VariantValue ||
  mongoose.model<IVariantValue>("VariantValue", VariantValueSchema);

export default VariantValue;

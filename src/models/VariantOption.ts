import mongoose, { Model, Schema } from "mongoose";

export interface IVariantOption {
  code: string;

  name: string;

  sortOrder: number;

  isActive: boolean;
}

const VariantOptionSchema =
  new Schema<IVariantOption>(
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

const VariantOption: Model<IVariantOption> =
  mongoose.models.VariantOption ||
  mongoose.model<IVariantOption>(
    "VariantOption",
    VariantOptionSchema
  );

export default VariantOption;
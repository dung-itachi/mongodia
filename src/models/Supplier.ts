import mongoose, { Model, Schema, Types } from "mongoose";

export interface ISupplier {
  code: string;

  name: string;

  phone: string;

  email?: string;

  contactPerson?: string;

  address?: string;

  areaId: Types.ObjectId;

  note?: string;

  isActive: boolean;
}

const SupplierSchema = new Schema<ISupplier>(
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

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      default: "",
    },

    contactPerson: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    areaId: {
      type: Schema.Types.ObjectId,
      ref: "Area",
      required: true,
    },

    note: {
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

SupplierSchema.index({ areaId: 1 });

const Supplier: Model<ISupplier> =
  mongoose.models.Supplier ||
  mongoose.model<ISupplier>("Supplier", SupplierSchema);

export default Supplier;

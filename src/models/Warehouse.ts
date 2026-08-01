import mongoose, { Model, Schema, Types } from "mongoose";

export interface IWarehouse {
  code: string;

  name: string;

  areaId: Types.ObjectId;

  address?: string;

  managerId?: Types.ObjectId | null;

  note?: string;

  isActive: boolean;
}

const WarehouseSchema = new Schema<IWarehouse>(
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

    areaId: {
      type: Schema.Types.ObjectId,
      ref: "Area",
      required: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    managerId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
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

// `code` đã được đánh unique ở field def — không cần khai báo lại ở đây.
WarehouseSchema.index({ areaId: 1 });
WarehouseSchema.index({ managerId: 1 });

const Warehouse: Model<IWarehouse> =
  mongoose.models.Warehouse ||
  mongoose.model<IWarehouse>("Warehouse", WarehouseSchema);

export default Warehouse;

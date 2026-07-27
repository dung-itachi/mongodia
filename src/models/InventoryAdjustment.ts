import mongoose, { Model, Schema, Types } from "mongoose";

export type InventoryAdjustmentType = "IN" | "OUT" | "ADJUST";

export interface IInventoryAdjustment {
  inventoryId: Types.ObjectId;

  type: InventoryAdjustmentType;

  quantity: number;

  reason: string;

  employeeId: Types.ObjectId;

  note?: string;
}

const InventoryAdjustmentSchema =
  new Schema<IInventoryAdjustment>(
    {
      inventoryId: {
        type: Schema.Types.ObjectId,
        ref: "Inventory",
        required: true,
      },

      type: {
        type: String,
        required: true,
        enum: ["IN", "OUT", "ADJUST"],
      },

      quantity: {
        type: Number,
        required: true,
        min: 1,
      },

      reason: {
        type: String,
        required: true,
        trim: true,
      },

      employeeId: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
      },

      note: {
        type: String,
        default: "",
      },
    },
    {
      timestamps: true,
    }
  );

InventoryAdjustmentSchema.index({ inventoryId: 1 });
InventoryAdjustmentSchema.index({ employeeId: 1 });
InventoryAdjustmentSchema.index({ type: 1 });
InventoryAdjustmentSchema.index({ createdAt: 1 });

const InventoryAdjustment: Model<IInventoryAdjustment> =
  mongoose.models.InventoryAdjustment ||
  mongoose.model<IInventoryAdjustment>(
    "InventoryAdjustment",
    InventoryAdjustmentSchema
  );

export default InventoryAdjustment;

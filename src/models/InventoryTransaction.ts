import mongoose, { Model, Schema, Types } from "mongoose";

export type InventoryTransactionType =
  | "IN"
  | "OUT"
  | "ADJUST"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "RETURN";

export interface IInventoryTransaction {
  inventoryId: Types.ObjectId;

  adjustmentId?: Types.ObjectId | null;

  type: InventoryTransactionType;

  quantity: number;

  beforeQuantity: number;

  afterQuantity: number;

  employeeId: Types.ObjectId;

  referenceNo?: string;

  note?: string;
}

const InventoryTransactionSchema =
  new Schema<IInventoryTransaction>(
    {
      inventoryId: {
        type: Schema.Types.ObjectId,
        ref: "Inventory",
        required: true,
      },

      adjustmentId: {
        type: Schema.Types.ObjectId,
        ref: "InventoryAdjustment",
        default: null,
      },

      type: {
        type: String,
        required: true,
        enum: [
          "IN",
          "OUT",
          "ADJUST",
          "TRANSFER_IN",
          "TRANSFER_OUT",
          "RETURN",
        ],
      },

      quantity: {
        type: Number,
        required: true,
      },

      beforeQuantity: {
        type: Number,
        required: true,
      },

      afterQuantity: {
        type: Number,
        required: true,
      },

      employeeId: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
      },

      referenceNo: {
        type: String,
        default: "",
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

InventoryTransactionSchema.index({ inventoryId: 1 });
InventoryTransactionSchema.index({ employeeId: 1 });
InventoryTransactionSchema.index({ type: 1 });
InventoryTransactionSchema.index({ createdAt: 1 });
InventoryTransactionSchema.index({ referenceNo: 1 });

const InventoryTransaction: Model<IInventoryTransaction> =
  mongoose.models.InventoryTransaction ||
  mongoose.model<IInventoryTransaction>(
    "InventoryTransaction",
    InventoryTransactionSchema
  );

export default InventoryTransaction;

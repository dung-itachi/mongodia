import mongoose, { Model, Schema, Types } from "mongoose";

export enum GiftInventoryHistoryType {
  INITIAL = "INITIAL",
  IMPORT = "IMPORT",
  ADJUSTMENT = "ADJUSTMENT",
}

export interface IGiftInventoryHistory {
  giftId: Types.ObjectId;
  type: GiftInventoryHistoryType;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  createdBy: Types.ObjectId;
  note?: string;
  createdAt?: Date;
}

const GiftInventoryHistorySchema = new Schema<IGiftInventoryHistory>(
  {
    giftId: {
      type: Schema.Types.ObjectId,
      ref: "Gift",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(GiftInventoryHistoryType),
      required: true,
    },
    quantityBefore: { type: Number, required: true, min: 0 },
    quantityChange: { type: Number, required: true },
    quantityAfter: { type: Number, required: true, min: 0 },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    note: { type: String, trim: true, maxlength: 1000 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "gift_inventory_histories",
  }
);

GiftInventoryHistorySchema.index({ giftId: 1, createdAt: -1 });

const GiftInventoryHistory: Model<IGiftInventoryHistory> =
  mongoose.models.GiftInventoryHistory ||
  mongoose.model<IGiftInventoryHistory>(
    "GiftInventoryHistory",
    GiftInventoryHistorySchema
  );

export default GiftInventoryHistory;

import mongoose, { Model, Schema, Types } from "mongoose";

export type WarehouseTransferStatus = "DRAFT" | "SENT" | "RECEIVED" | "COMPLETED" | "CANCELLED";

export interface IWarehouseTransferItem {
  productId?: Types.ObjectId | null;
  variantId?: Types.ObjectId | null;
  giftId?: Types.ObjectId | null;
  sentQuantity: number;
  receivedQuantity: number;
  difference: number;
}

export interface IWarehouseTransfer {
  transferCode: string;
  sourceWarehouseId: Types.ObjectId;
  destinationWarehouseId: Types.ObjectId;
  items: IWarehouseTransferItem[];
  status: WarehouseTransferStatus;
  note?: string;
  createdBy: Types.ObjectId;
  sentAt?: Date;
  receivedAt?: Date;
  receivedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<IWarehouseTransferItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", default: null },
    giftId: { type: Schema.Types.ObjectId, ref: "Gift", default: null },
    sentQuantity: { type: Number, min: 1, required: true },
    receivedQuantity: { type: Number, min: 0, default: 0 },
    difference: { type: Number, default: 0 },
  },
  { _id: false }
);

const schema = new Schema<IWarehouseTransfer>(
  {
    transferCode: { type: String, unique: true, required: true, trim: true },
    sourceWarehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    destinationWarehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    items: { type: [itemSchema], required: true, validate: (items: unknown[]) => items.length > 0 },
    status: { type: String, enum: ["DRAFT", "SENT", "RECEIVED", "COMPLETED", "CANCELLED"], default: "DRAFT" },
    note: { type: String, default: "", maxlength: 1000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    sentAt: { type: Date },
    receivedAt: { type: Date },
    receivedBy: { type: Schema.Types.ObjectId, ref: "Employee" },
  },
  { timestamps: true, collection: "warehouse_transfers" }
);

schema.index({ sourceWarehouseId: 1, createdAt: -1 });
schema.index({ destinationWarehouseId: 1, createdAt: -1 });
schema.index({ status: 1, createdAt: -1 });

const WarehouseTransfer: Model<IWarehouseTransfer> =
  mongoose.models.WarehouseTransfer || mongoose.model<IWarehouseTransfer>("WarehouseTransfer", schema);

export default WarehouseTransfer;

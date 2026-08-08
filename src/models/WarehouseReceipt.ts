import mongoose, { Model, Schema, Types } from "mongoose";

export interface IWarehouseReceiptItem {
  productId?: Types.ObjectId | null;
  variantId?: Types.ObjectId | null;
  giftId?: Types.ObjectId | null;
  orderedQuantity: number;
  receivedQuantity: number;
  difference: number;
}

export interface IWarehouseReceipt {
  receiptCode: string;
  warehouseId: Types.ObjectId;
  items: IWarehouseReceiptItem[];
  note?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<IWarehouseReceiptItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", default: null },
    giftId: { type: Schema.Types.ObjectId, ref: "Gift", default: null },
    orderedQuantity: { type: Number, min: 0, required: true },
    receivedQuantity: { type: Number, min: 0, required: true },
    difference: { type: Number, required: true },
  },
  { _id: false }
);

const schema = new Schema<IWarehouseReceipt>(
  {
    receiptCode: { type: String, unique: true, required: true, trim: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    items: { type: [itemSchema], required: true, validate: (items: unknown[]) => items.length > 0 },
    note: { type: String, default: "", maxlength: 1000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
  },
  { timestamps: true, collection: "warehouse_receipts" }
);

schema.index({ warehouseId: 1, createdAt: -1 });

const WarehouseReceipt: Model<IWarehouseReceipt> =
  mongoose.models.WarehouseReceipt || mongoose.model<IWarehouseReceipt>("WarehouseReceipt", schema);

export default WarehouseReceipt;

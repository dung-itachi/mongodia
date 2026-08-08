import mongoose, { Model, Schema, Types } from "mongoose";

export type WarehouseStockMovementType = "IMPORT" | "TRANSFER_OUT" | "TRANSFER_IN" | "ORDER_OUT" | "ORDER_RETURN" | "ADJUSTMENT";
export type WarehouseStockReferenceType = "RECEIPT" | "TRANSFER" | "ORDER" | "ADJUSTMENT";
export type WarehouseStockItemType = "PRODUCT" | "GIFT";

export interface IWarehouseStockMovement {
  warehouseId: Types.ObjectId;
  itemType: WarehouseStockItemType;
  productId?: Types.ObjectId | null;
  variantId?: Types.ObjectId | null;
  giftId?: Types.ObjectId | null;
  type: WarehouseStockMovementType;
  quantity: number;
  referenceType: WarehouseStockReferenceType;
  referenceId?: Types.ObjectId | null;
  referenceCode?: string;
  createdBy: Types.ObjectId;
  note?: string;
  createdAt: Date;
}

const schema = new Schema<IWarehouseStockMovement>(
  {
    warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true, index: true },
    itemType: { type: String, enum: ["PRODUCT", "GIFT"], required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", default: null },
    giftId: { type: Schema.Types.ObjectId, ref: "Gift", default: null },
    type: { type: String, enum: ["IMPORT", "TRANSFER_OUT", "TRANSFER_IN", "ORDER_OUT", "ORDER_RETURN", "ADJUSTMENT"], required: true, index: true },
    quantity: { type: Number, required: true, min: 1 },
    referenceType: { type: String, enum: ["RECEIPT", "TRANSFER", "ORDER", "ADJUSTMENT"], required: true },
    referenceId: { type: Schema.Types.ObjectId, default: null },
    referenceCode: { type: String, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    note: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "warehouse_stock_movements" }
);

schema.index({ warehouseId: 1, createdAt: -1 });
schema.index({ variantId: 1, warehouseId: 1, createdAt: -1 });
schema.index({ giftId: 1, warehouseId: 1, createdAt: -1 });
schema.index({ referenceType: 1, referenceId: 1 });

const WarehouseStockMovement: Model<IWarehouseStockMovement> =
  mongoose.models.WarehouseStockMovement || mongoose.model<IWarehouseStockMovement>("WarehouseStockMovement", schema);

export default WarehouseStockMovement;

import mongoose, { Model, Schema, Types } from "mongoose";

export type WarehouseInventoryItemType = "PRODUCT" | "GIFT";

export interface IWarehouseInventory {
  warehouseId: Types.ObjectId;
  itemType: WarehouseInventoryItemType;
  productId?: Types.ObjectId | null;
  variantId?: Types.ObjectId | null;
  giftId?: Types.ObjectId | null;
  /** Tổng số lượng tồn kho vật lý tại warehouse */
  quantity: number;
  /** Số lượng khả dụng = quantity - inTransitQuantity - reservedQuantity */
  availableQuantity: number;
  /** Số lượng đang chuyển đến kho khác (đã SENT, chưa RECEIVED) */
  inTransitQuantity: number;
  /** Số lượng đã xuất - CHỈ dùng thống kê/lịch sử, KHÔNG ảnh hưởng availableQuantity */
  shippedQuantity: number;
  /** Số lượng đã giữ cho đơn hàng đang xử lý */
  reservedQuantity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseInventorySchema = new Schema<IWarehouseInventory>(
  {
    warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    itemType: { type: String, enum: ["PRODUCT", "GIFT"], required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", default: null },
    giftId: { type: Schema.Types.ObjectId, ref: "Gift", default: null },
    quantity: { type: Number, min: 0, default: 0 },
    /** availableQuantity = quantity - inTransitQuantity - reservedQuantity */
    availableQuantity: { type: Number, min: 0, default: 0 },
    inTransitQuantity: { type: Number, min: 0, default: 0 },
    shippedQuantity: { type: Number, min: 0, default: 0 },
    reservedQuantity: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "warehouse_inventory" }
);

WarehouseInventorySchema.index({ warehouseId: 1, itemType: 1, productId: 1, variantId: 1, giftId: 1 }, { unique: true });
WarehouseInventorySchema.index({ warehouseId: 1, updatedAt: -1 });
WarehouseInventorySchema.index({ variantId: 1, warehouseId: 1 });
WarehouseInventorySchema.index({ giftId: 1, warehouseId: 1 });

const WarehouseInventory: Model<IWarehouseInventory> =
  mongoose.models.WarehouseInventory || mongoose.model<IWarehouseInventory>("WarehouseInventory", WarehouseInventorySchema);

export default WarehouseInventory;

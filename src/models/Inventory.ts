import mongoose, { Model, Schema, Types } from "mongoose";

export interface IInventory {
  warehouseId: Types.ObjectId;

  productVariantId: Types.ObjectId;

  quantity: number;

  reservedQuantity: number;

  availableQuantity: number;

  isActive: boolean;
}

const InventorySchema = new Schema<IInventory>(
  {
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },

    productVariantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    reservedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    availableQuantity: {
      type: Number,
      default: 0,
      min: 0,
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

InventorySchema.index({ warehouseId: 1 });
InventorySchema.index({ productVariantId: 1 });
InventorySchema.index(
  { warehouseId: 1, productVariantId: 1 },
  { unique: true }
);

const Inventory: Model<IInventory> =
  mongoose.models.Inventory ||
  mongoose.model<IInventory>("Inventory", InventorySchema);

export default Inventory;

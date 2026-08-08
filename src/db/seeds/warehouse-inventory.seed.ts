import Gift from "@/models/Gift";
import ProductVariant from "@/models/ProductVariant";
import Warehouse from "@/models/Warehouse";
import WarehouseInventory from "@/models/WarehouseInventory";

export async function seedWarehouseInventory() {
  const kho1 = await Warehouse.findOne({ code: "KHO1", isActive: true });
  const kho2 = await Warehouse.findOne({ code: "KHO2", isActive: true });
  if (!kho1 || !kho2) throw new Error("Cần seed KHO1/KHO2 trước khi seed inventory");

  const variants = await ProductVariant.find({ isActive: true }).sort({ sku: 1 }).limit(2).lean();
  for (let index = 0; index < variants.length; index++) {
    const variant = variants[index];
    await WarehouseInventory.updateOne(
      { warehouseId: kho1._id, itemType: "PRODUCT", productId: variant.productId, variantId: variant._id, giftId: null },
      { $setOnInsert: { quantity: index === 0 ? 100 : 80, inTransitQuantity: 0, shippedQuantity: 0, isActive: true } },
      { upsert: true }
    );
    await WarehouseInventory.updateOne(
      { warehouseId: kho2._id, itemType: "PRODUCT", productId: variant.productId, variantId: variant._id, giftId: null },
      { $setOnInsert: { quantity: index === 0 ? 20 : 15, inTransitQuantity: 0, shippedQuantity: 0, isActive: true } },
      { upsert: true }
    );
  }

  const gifts = await Gift.find({ isActive: true }).sort({ name: 1 }).limit(3).lean();
  for (const gift of gifts) {
    for (const warehouse of [kho1, kho2]) {
      await WarehouseInventory.updateOne(
        { warehouseId: warehouse._id, itemType: "GIFT", productId: null, variantId: null, giftId: gift._id },
        { $setOnInsert: { quantity: 100, inTransitQuantity: 0, shippedQuantity: 0, isActive: true } },
        { upsert: true }
      );
    }
  }
  console.log("[OK] Warehouse inventory");
}

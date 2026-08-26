import Gift from "@/models/Gift";
import ProductVariant from "@/models/ProductVariant";
import Warehouse from "@/models/Warehouse";
import WarehouseInventory from "@/models/WarehouseInventory";

export async function seedWarehouseInventory() {
  const kho1 = await Warehouse.findOne({ code: "KHO1", isActive: true });
  const kho2 = await Warehouse.findOne({ code: "KHO2", isActive: true });
  if (!kho1 || !kho2) throw new Error("Cần seed KHO1/KHO2 trước khi seed inventory");

  // Insert inventory cho TẤT CẢ active variants (không chỉ 2 variant đầu).
  // KHO1 (Trung Quốc): giữ nhiều (nguồn nhập).
  // KHO2 (Mông Cổ): vừa đủ để demo reserve/ship.
  const variants = await ProductVariant.find({ isActive: true }).sort({ sku: 1 }).lean();
  for (const variant of variants) {
    await WarehouseInventory.updateOne(
      { warehouseId: kho1._id, itemType: "PRODUCT", productId: variant.productId, variantId: variant._id, giftId: null },
      { $setOnInsert: { quantity: 500, availableQuantity: 500, inTransitQuantity: 0, shippedQuantity: 0, reservedQuantity: 0, isActive: true } },
      { upsert: true }
    );
    await WarehouseInventory.updateOne(
      { warehouseId: kho2._id, itemType: "PRODUCT", productId: variant.productId, variantId: variant._id, giftId: null },
      { $setOnInsert: { quantity: 200, availableQuantity: 200, inTransitQuantity: 0, shippedQuantity: 0, reservedQuantity: 0, isActive: true } },
      { upsert: true }
    );
  }

  const gifts = await Gift.find({ isActive: true }).sort({ name: 1 }).lean();
  for (const gift of gifts) {
    for (const warehouse of [kho1, kho2]) {
      await WarehouseInventory.updateOne(
        { warehouseId: warehouse._id, itemType: "GIFT", productId: null, variantId: null, giftId: gift._id },
        { $setOnInsert: { quantity: 100, availableQuantity: 100, inTransitQuantity: 0, shippedQuantity: 0, reservedQuantity: 0, isActive: true } },
        { upsert: true }
      );
    }
  }
  console.log("[OK] Warehouse inventory");
}

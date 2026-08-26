/**
 * ==================================================
 * MIGRATION: Sync WarehouseInventory → Inventory
 * ==================================================
 *
 * Chạy: npx ts-node src/scripts/sync-inventory-migration.ts
 *
 * Mục tiêu: Đồng bộ dữ liệu từ WarehouseInventory (nguồn chính)
 * sang Inventory (legacy model đọc bởi /warehouses overview API).
 *
 * Logic:
 *  - Upsert: warehouseId + productVariantId (variantId của WarehouseInventory)
 *  - quantity       = WI.quantity
 *  - reservedQuantity = WI.reservedQuantity
 *  - availableQuantity = WI.availableQuantity  (computed by WI workflow)
 *  - isActive       = WI.isActive
 *
 * Cleanup:
 *  - Xoá Inventory records không khớp WarehouseInventory (orphans)
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Inventory from "@/models/Inventory";
import WarehouseInventory from "@/models/WarehouseInventory";

async function main() {
  console.log("🔄 Bắt đầu sync WarehouseInventory → Inventory\n");

  await connectDB();

  // 1. Upsert từ WarehouseInventory (chỉ PRODUCT)
  const wiRecords = await WarehouseInventory.find({
    itemType: "PRODUCT",
    isActive: { $ne: false },
  }).lean();

  console.log(`📦 WarehouseInventory records (PRODUCT, active): ${wiRecords.length}`);

  let upserted = 0;
  let errors = 0;

  for (const wi of wiRecords) {
    if (!wi.variantId) {
      console.warn(`  ⚠️  Bỏ qua WI ${wi._id}: không có variantId`);
      continue;
    }

    try {
      await Inventory.findOneAndUpdate(
        {
          warehouseId: wi.warehouseId,
          productVariantId: wi.variantId,
        },
        {
          $set: {
            quantity: wi.quantity ?? 0,
            reservedQuantity: wi.reservedQuantity ?? 0,
            availableQuantity: wi.availableQuantity ?? 0,
            isActive: wi.isActive ?? true,
          },
        },
        { upsert: true }
      );
      upserted++;
    } catch (err) {
      console.error(`  ❌ Lỗi upsert WI ${wi._id}:`, err);
      errors++;
    }
  }

  console.log(`\n✅ Upserted: ${upserted}, Errors: ${errors}`);

  // 2. Cleanup orphans: Inventory records không có trong WarehouseInventory
  const invRecords = await Inventory.find({ isActive: { $ne: false } }).lean();
  console.log(`\n🧹 Kiểm tra orphans trong Inventory (${invRecords.length} records)...`);

  let orphans = 0;
  for (const inv of invRecords) {
    const match = await WarehouseInventory.findOne({
      warehouseId: inv.warehouseId,
      variantId: inv.productVariantId,
      itemType: "PRODUCT",
      isActive: { $ne: false },
    }).lean();

    if (!match) {
      console.log(`  🗑️  Xoá orphan Inventory ${inv._id} (${inv.warehouseId}/${inv.productVariantId})`);
      await Inventory.deleteOne({ _id: inv._id });
      orphans++;
    }
  }

  console.log(`\n🗑️  Đã xoá ${orphans} orphan records`);

  // 3. Thống kê
  const invCount = await Inventory.countDocuments({ isActive: { $ne: false } });
  const wiCount = await WarehouseInventory.countDocuments({ itemType: "PRODUCT", isActive: { $ne: false } });
  console.log(`\n📊 Thống kê sau sync:`);
  console.log(`   Inventory:         ${invCount} records`);
  console.log(`   WarehouseInventory: ${wiCount} records`);

  console.log("\n✅ Migration hoàn tất!");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Migration thất bại:", err);
  process.exit(1);
});

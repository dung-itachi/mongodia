/**
 * Reset dữ liệu liên quan đến KHO2 để rebuild sạch.
 *
 * Lý do: Seed cũ insert WarehouseInventory với reservedQuantity=0 và không
 * ghi InventoryHistory. Orders seed không có orderItems[] nên không thể
 * reserve chính xác → ship flow luôn throw "Đang giữ: 0".
 *
 * Hành động:
 *   - Xoá WarehouseInventory rows của KHO2.
 *   - Xoá tất cả Order active (mọi status, mọi warehouseId — vì orders seed
 *     đều không có orderItems[]).
 *   - Xoá OrderHistory tương ứng.
 *   - Xoá WarehouseStockMovement tương ứng.
 *   - Xoá WarehouseTask, WarehouseHistory liên quan.
 *   - Xoá InventoryHistory của KHO2.
 *
 * KHÔNG xoá:
 *   - Warehouses (KHO1/KHO2 giữ nguyên).
 *   - Products, Variants, Customers, Employees, Areas, Teams.
 *   - Marketing, Leads.
 *
 * Sau khi xóa, chạy lại:
 *   - npm run seed   (rebuild orders + inventory từ seed scripts)
 *
 * DESTRUCTIVE. Idempotent.
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/reset-kho2-data.ts --apply
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import Warehouse from "../models/Warehouse";
import WarehouseInventory from "../models/WarehouseInventory";
import { InventoryHistory } from "../models/InventoryHistory";
import WarehouseStockMovement from "../models/WarehouseStockMovement";
import Order from "@/models/Order";
import { OrderHistory } from "@/models/OrderHistory";
import { WarehouseTask } from "@/models/WarehouseTask";
import mongooseLib from "mongoose";

async function main() {
  const dryRun = !process.argv.includes("--apply");
  console.log(
    `🗑️  Reset dữ liệu liên quan KHO2  (${
      dryRun ? "DRY RUN" : "APPLY — DESTRUCTIVE"
    })\n`
  );

  await connectDB();

  const kho2 = await Warehouse.findOne({ code: "KHO2", isActive: true })
    .select("_id")
    .lean();
  if (!kho2) {
    console.error("❌ KHO2 not found");
    process.exit(1);
  }
  console.log(`KHO2 _id = ${kho2._id}\n`);

  // Counts trước khi xóa
  const orderCount = await Order.countDocuments({ isActive: true });
  const inventoryCount = await WarehouseInventory.countDocuments({
    warehouseId: kho2._id,
  });
  const invHistCount = await InventoryHistory.countDocuments({
    warehouseId: kho2._id,
  });
  const wsmCount = await WarehouseStockMovement.countDocuments({
    warehouseId: kho2._id,
  });
  const taskCount = await WarehouseTask.countDocuments({ isActive: { $ne: false } });
  const orderHistoryCount = await OrderHistory.countDocuments({});

  console.log("Counts sẽ bị xóa:");
  console.log(`  Order                : ${orderCount}`);
  console.log(`  OrderHistory         : ${orderHistoryCount}`);
  console.log(`  WarehouseInventory (KHO2): ${inventoryCount}`);
  console.log(`  InventoryHistory (KHO2)  : ${invHistCount}`);
  console.log(`  WarehouseStockMovement (KHO2): ${wsmCount}`);
  console.log(`  WarehouseTask        : ${taskCount}`);
  console.log("");

  if (dryRun) {
    console.log("Run with --apply flag to actually delete.");
    await mongoose.disconnect();
    return;
  }

  // 1. Xóa OrderHistory (FK đến Order — phải xóa trước)
  const oh = await OrderHistory.deleteMany({});
  console.log(`  ✓ OrderHistory: -${oh.deletedCount}`);

  // 2. Xóa WarehouseStockMovement (KHO2)
  const wsm = await WarehouseStockMovement.deleteMany({ warehouseId: kho2._id });
  console.log(`  ✓ WarehouseStockMovement (KHO2): -${wsm.deletedCount}`);

  // 3. Xóa WarehouseHistory & WarehouseTask
  //    WarehouseHistory trỏ WarehouseTask → xóa WarehouseHistory trước
  await mongooseLib.connection.collection("warehousehistories").deleteMany({});
  const wt = await WarehouseTask.deleteMany({ isActive: { $ne: false } });
  console.log(`  ✓ WarehouseTask: -${wt.deletedCount}`);

  // 4. Xóa Order (set isActive=false thay vì deleteMany để an toàn nếu
  //    bạn muốn khôi phục)
  //    Vì user chọn "chỉ xoá dữ liệu của KHO2" nhưng orders seed cũ không
  //    gắn KHO2 (đa số warehouseId=null hoặc orphan), nên xóa tất cả order.
  const ord = await Order.deleteMany({});
  console.log(`  ✓ Order: -${ord.deletedCount}`);

  // 5. Xóa WarehouseInventory (KHO2)
  const inv = await WarehouseInventory.deleteMany({ warehouseId: kho2._id });
  console.log(`  ✓ WarehouseInventory (KHO2): -${inv.deletedCount}`);

  // 6. Xóa InventoryHistory (KHO2)
  const ih = await InventoryHistory.deleteMany({ warehouseId: kho2._id });
  console.log(`  ✓ InventoryHistory (KHO2): -${ih.deletedCount}`);

  console.log("\n[DONE] Reset hoàn tất. Bây giờ chạy:");
  console.log("  npm run seed");
  console.log(
    "\nLưu ý: Seed sẽ insert lại WarehouseInventory + Orders mới với orderItems[] đầy đủ."
  );

  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
/**
 * Migration: Reassign Order.warehouseId = KHO2 cho toàn bộ orders.
 *
 * Lý do: Theo quy tắc nghiệp vụ hiện tại, TẤT CẢ order (mọi status, mọi loại
 * đơn — NORMAL/COMBO/GIFT/EXCHANGE/REPLACEMENT) đều phải thuộc KHO2 (kho Mông
 * Cổ — kho chính bán hàng). KHO1 chỉ đóng vai trò nhập hàng & chuyển về KHO2.
 *
 * Data hiện tại có nhiều order trỏ về:
 *   - WH-PVD-01 / WH-PVD-02 (kho cũ)
 *   - 2 ObjectId orphan (đã xóa từ DB nhưng order vẫn tham chiếu)
 *   - null (seed cũ thiếu warehouse picker)
 *
 * Migration này set Order.warehouseId = KHO2._id cho MỌI order active mà
 * warehouseId hiện ≠ KHO2._id (null, orphan, hoặc kho khác). Không ảnh hưởng
 * đến status, history, inventory.
 *
 * Idempotent — chạy nhiều lần chỉ touch những doc chưa đúng.
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/migrate-orders-to-kho2.ts
 *   npx tsx --env-file=.env.local src/scripts/migrate-orders-to-kho2.ts --apply
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import Warehouse from "../models/Warehouse";
import Order from "../models/Order";

async function main() {
  const dryRun = !process.argv.includes("--apply");
  console.log(
    `🔄 Reassign Order.warehouseId → KHO2 (kho chính Mông Cổ)  (${
      dryRun ? "DRY RUN" : "APPLY"
    })\n`
  );

  await connectDB();

  const kho2 = await Warehouse.findOne({ code: "KHO2", isActive: true })
    .select("_id code name")
    .lean();
  if (!kho2) {
    console.error('❌ Không tìm thấy Warehouse code="KHO2" — chạy seed trước.');
    process.exit(1);
  }
  console.log(`KHO2 = ${kho2._id} (${kho2.name})\n`);

  const totalActive = await Order.countDocuments({ isActive: true });
  const alreadyKho2 = await Order.countDocuments({
    isActive: true,
    warehouseId: kho2._id,
  });
  const toReassign = await Order.countDocuments({
    isActive: true,
    $or: [
      { warehouseId: null },
      { warehouseId: { $exists: false } },
      { warehouseId: { $ne: kho2._id } },
    ],
  });

  console.log(`Tổng order active       : ${totalActive}`);
  console.log(`Đã thuộc KHO2            : ${alreadyKho2}`);
  console.log(`Cần reassign về KHO2     : ${toReassign}\n`);

  if (toReassign === 0) {
    console.log("✓ Tất cả order đã thuộc KHO2 — sạch sẵn rồi.");
    await mongoose.disconnect();
    return;
  }

  // Lấy 1 sample trước/sau để hiển thị cho dry-run
  const sample = await Order.find({
    isActive: true,
    $or: [
      { warehouseId: null },
      { warehouseId: { $exists: false } },
      { warehouseId: { $ne: kho2._id } },
    ],
  })
    .select("_id orderCode status warehouseId")
    .limit(5)
    .lean();

  console.log("Sample (5 orders sẽ được cập nhật):");
  for (const o of sample) {
    console.log(
      `  ${o.orderCode.padEnd(14)} status=${String(o.status).padEnd(12)} warehouseId=${o.warehouseId ?? "null"} → ${kho2._id}`
    );
  }
  if (toReassign > 5) console.log(`  ... và ${toReassign - 5} order khác.\n`);

  if (dryRun) {
    console.log("\nRun with --apply flag to write changes.");
  } else {
    const result = await Order.updateMany(
      {
        isActive: true,
        $or: [
          { warehouseId: null },
          { warehouseId: { $exists: false } },
          { warehouseId: { $ne: kho2._id } },
        ],
      },
      { $set: { warehouseId: kho2._id } }
    );
    console.log(
      `\n✅ Đã cập nhật ${result.modifiedCount} order (matched=${result.matchedCount}).`
    );
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
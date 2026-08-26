/**
 * Verify: Tất cả order đều gắn với KHO2 (kho Mông Cổ).
 *
 * Đếm số order theo warehouseId → confirm 100% là KHO2.
 * Nếu phát hiện order nào có warehouseId khác KHO2 (đặc biệt là null hoặc KHO1),
 * báo cáo chi tiết để xử lý.
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/verify-all-orders-kho2.ts
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import Warehouse from "../models/Warehouse";
import Order from "../models/Order";

async function main() {
  await connectDB();

  const kho1 = await Warehouse.findOne({ code: "KHO1", isActive: true })
    .select("_id")
    .lean();
  const kho2 = await Warehouse.findOne({ code: "KHO2", isActive: true })
    .select("_id")
    .lean();

  if (!kho1 || !kho2) {
    console.error("❌ Không tìm thấy KHO1/KHO2 — chạy seed trước.");
    process.exit(1);
  }

  console.log(`KHO1 _id = ${kho1._id.toString()}`);
  console.log(`KHO2 _id = ${kho2._id.toString()}\n`);

  const total = await Order.countDocuments({ isActive: true });

  const grouped = await Order.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$warehouseId",
        count: { $sum: 1 },
      },
    },
  ]);

  console.log(`Tổng order active: ${total}\n`);
  console.log("=== Phân bổ theo warehouseId ===\n");

  let kho2Count = 0;
  let otherCount = 0;
  let nullCount = 0;

  for (const row of grouped) {
    const wid = row._id ? String(row._id) : null;
    if (!wid) {
      nullCount = row.count;
      console.log(`  NULL          : ${row.count} order`);
    } else if (wid === kho1._id.toString()) {
      otherCount += row.count;
      console.log(`  ⚠️  KHO1 (Trung Quốc): ${row.count} order  ← cần xem xét`);
    } else if (wid === kho2._id.toString()) {
      kho2Count = row.count;
      console.log(`  ✓ KHO2 (Mông Cổ)   : ${row.count} order`);
    } else {
      otherCount += row.count;
      console.log(`  ❓ ${wid}: ${row.count} order  ← warehouse lạ/không active`);
    }
  }

  console.log("\n=== Kết luận ===\n");
  if (nullCount === 0 && otherCount === 0) {
    console.log(
      `✅ 100% order active (${total}) đều thuộc KHO2 — đúng theo quy tắc kho chính.`
    );
  } else {
    console.log(
      `⚠️ Có ${otherCount} order không thuộc KHO2 và ${nullCount} order thiếu warehouseId.`
    );
  }

  // Phân tích chi tiết per status
  console.log("\n=== Phân bổ theo status × warehouse ===\n");
  const byStatus = await Order.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: { warehouseId: "$warehouseId", status: "$status" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.status": 1 } },
  ]);
  for (const row of byStatus) {
    const wid = row._id.warehouseId ? String(row._id.warehouseId) : "NULL";
    const tag =
      wid === kho2._id.toString()
        ? "KHO2"
        : wid === kho1._id.toString()
          ? "KHO1"
          : wid;
    console.log(`  [${tag}] ${row._id.status.padEnd(12)} : ${row.count}`);
  }

  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
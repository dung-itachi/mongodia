/**
 * Diagnose: Xem InventoryHistory cho KHO2 để biết:
 *   - Có RESERVE nào đã ghi cho orders không?
 *   - reservedQuantity có đang lệch với các order CONFIRMED không?
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/diagnose-inventory-history-kho2.ts
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import Warehouse from "../models/Warehouse";
import { InventoryHistory } from "../models/InventoryHistory";
import Order from "@/models/Order";

async function main() {
  await connectDB();

  const kho2 = await Warehouse.findOne({ code: "KHO2", isActive: true })
    .select("_id")
    .lean();
  if (!kho2) {
    console.error("❌ KHO2 not found");
    process.exit(1);
  }

  // 1. Tổng lịch sử theo transactionType
  const byType = await InventoryHistory.aggregate([
    { $match: { warehouseId: kho2._id } },
    { $group: { _id: "$transactionType", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  console.log("=== Lịch sử theo transactionType ===\n");
  for (const row of byType) {
    console.log(`  ${String(row._id).padEnd(12)} : ${row.count}`);
  }

  // 2. RESERVE/UNRESERVE có ghi cho KHO2 không?
  // Scan toàn bộ (không filter theo enum vì RESERVE/UNRESERVE có thể không
    // nằm trong InventoryTransactionType enum hiện tại).
  const allHistory = await InventoryHistory.find({ warehouseId: kho2._id })
    .select("_id transactionType referenceType orderId createdAt")
    .lean();
  const reserveHistory = allHistory.filter((h) =>
    ["RESERVE", "UNRESERVE"].includes(String(h.transactionType))
  ).slice(0, 5);
  console.log(`\n=== Sample RESERVE/UNRESERVE history ===\n`);
  if (reserveHistory.length === 0) {
    console.log("  (không có)");
  } else {
    for (const r of reserveHistory) {
      console.log(
        `  ${r.transactionType} refType=${r.referenceType ?? "?"} orderId=${r.orderId ?? "?"} ${r.createdAt?.toISOString?.() ?? ""}`
      );
    }
  }

  // 3. CONFIRMED orders của KHO2 — tính tổng qty cần reserve
  const confirmed = await Order.find({
    warehouseId: kho2._id,
    status: "CONFIRMED",
    isActive: true,
  })
    .select("_id orderCode orderItems")
    .lean();
  console.log(`\n=== CONFIRMED orders trên KHO2: ${confirmed.length} ===\n`);
  for (const o of confirmed.slice(0, 5)) {
    const items = (o as unknown as { orderItems?: unknown[] }).orderItems ?? [];
    const totalItems = items.length;
    console.log(
      `  ${o.orderCode} items=${totalItems}`
    );
  }

  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
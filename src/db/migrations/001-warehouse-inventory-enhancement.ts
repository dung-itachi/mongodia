/**
 * ==================================================
 * MIGRATION: WarehouseInventory Schema Enhancement
 * ==================================================
 *
 * Migration này thêm các field mới cho WarehouseInventory:
 * - availableQuantity: số lượng khả dụng (không bị lock bởi transfer/ship/reserved)
 * - reservedQuantity: số lượng đã giữ cho đơn hàng
 *
 * Semantics:
 * availableQuantity = quantity - inTransitQuantity - shippedQuantity - reservedQuantity
 *
 * Migration idempotent: chạy nhiều lần an toàn.
 * - Nếu field đã có giá trị: giữ nguyên
 * - Nếu field chưa có: tính từ quantity (với giả định ban đầu không có lock)
 *
 * Chạy: npx ts-node --esm src/db/migrations/001-warehouse-inventory-enhancement.ts
 */

import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";

async function migrate() {
  console.log("[MIGRATION] Starting WarehouseInventory enhancement...");

  await connectDB();

  const db = mongoose.connection.db;
  if (!db) throw new Error("No DB connection");

  const collection = db.collection("warehouse_inventory");

  // 1. Thêm availableQuantity nếu chưa có
  const result1 = await collection.updateMany(
    { availableQuantity: { $exists: false } },
    [
      {
        $set: {
          availableQuantity: {
            $cond: {
              if: { $gte: ["$quantity", 0] },
              then: "$quantity",
              else: 0,
            },
          },
        },
      },
    ]
  );
  console.log(`[MIGRATION] added availableQuantity to ${result1.modifiedCount} documents`);

  // 2. Thêm reservedQuantity nếu chưa có
  const result2 = await collection.updateMany(
    { reservedQuantity: { $exists: false } },
    [{ $set: { reservedQuantity: 0 } }]
  );
  console.log(`[MIGRATION] added reservedQuantity to ${result2.modifiedCount} documents`);

  // 3. Thêm inTransitQuantity nếu chưa có
  const result3 = await collection.updateMany(
    { inTransitQuantity: { $exists: false } },
    [{ $set: { inTransitQuantity: 0 } }]
  );
  console.log(`[MIGRATION] added inTransitQuantity to ${result3.modifiedCount} documents`);

  // 4. Thêm shippedQuantity nếu chưa có
  const result4 = await collection.updateMany(
    { shippedQuantity: { $exists: false } },
    [{ $set: { shippedQuantity: 0 } }]
  );
  console.log(`[MIGRATION] added shippedQuantity to ${result4.modifiedCount} documents`);

  // 5. Recalculate availableQuantity cho các document đã có
  // Công thức: availableQuantity = quantity - inTransitQuantity - reservedQuantity
  // shippedQuantity là tracking counter, KHÔNG ảnh hưởng availableQuantity
  const recalculate = await collection.find({
    $expr: {
      $ne: [
        {
          $subtract: [
            {
              $subtract: ["$quantity", { $ifNull: ["$inTransitQuantity", 0] }],
            },
            { $ifNull: ["$reservedQuantity", 0] },
          ],
        },
        { $ifNull: ["$availableQuantity", 0] },
      ],
    },
  }).toArray();

  if (recalculate.length > 0) {
    console.log(`[MIGRATION] recalculating availableQuantity for ${recalculate.length} documents...`);
    for (const doc of recalculate) {
      const newAvailable = Math.max(0,
        (doc.quantity || 0) -
        (doc.inTransitQuantity || 0) -
        (doc.reservedQuantity || 0)
      );
      await collection.updateOne(
        { _id: doc._id },
        { $set: { availableQuantity: newAvailable } }
      );
    }
    console.log(`[MIGRATION] recalculated ${recalculate.length} documents`);
  }

  // 6. Thêm isActive nếu chưa có
  const result6 = await collection.updateMany(
    { isActive: { $exists: false } },
    [{ $set: { isActive: true } }]
  );
  console.log(`[MIGRATION] added isActive to ${result6.modifiedCount} documents`);

  // Verify
  const sample = await collection.findOne({});
  if (sample) {
    console.log("\n[MIGRATION] Sample document after migration:");
    console.log({
      _id: sample._id,
      quantity: sample.quantity,
      availableQuantity: sample.availableQuantity,
      inTransitQuantity: sample.inTransitQuantity,
      shippedQuantity: sample.shippedQuantity,
      reservedQuantity: sample.reservedQuantity,
      isActive: sample.isActive,
    });

    // Verify invariant
    // availableQuantity = quantity - inTransitQuantity - reservedQuantity
    // shippedQuantity là tracking counter, KHÔNG ảnh hưởng invariant
    const expected = Math.max(0,
      (sample.quantity || 0) -
      (sample.inTransitQuantity || 0) -
      (sample.reservedQuantity || 0)
    );
    const actual = sample.availableQuantity || 0;
    if (expected === actual) {
      console.log(`[MIGRATION] ✓ Invariant verified: availableQuantity = ${actual}`);
    } else {
      console.log(`[MIGRATION] ✗ Invariant mismatch: expected ${expected}, got ${actual}`);
    }
  }

  console.log("\n[MIGRATION] WarehouseInventory enhancement completed!");
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("[MIGRATION] Error:", err);
  mongoose.disconnect();
  process.exit(1);
});

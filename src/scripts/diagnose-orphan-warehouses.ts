/**
 * Diagnose: Liệt kê các warehouse "orphan" (có order tham chiếu nhưng không có
 * trong collection `warehouses`) để quyết định migration về KHO2.
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/diagnose-orphan-warehouses.ts
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import Warehouse from "../models/Warehouse";
import Order from "../models/Order";

async function main() {
  await connectDB();

  // Distinct warehouseIds trong orders
  const ids = await Order.distinct("warehouseId", { isActive: true });
  const validIds = ids.filter((id) => !!id);

  console.log(`Distinct warehouseId trong orders: ${ids.length}`);
  console.log(`  Hợp lệ (ObjectId): ${validIds.length}`);
  console.log(`  Null/undefined    : ${ids.length - validIds.length}\n`);

  // Lookup warehouses hiện có
  const existing = await Warehouse.find({ _id: { $in: validIds } })
    .select("_id code name isActive")
    .lean();
  const existingIds = new Set(existing.map((w) => String(w._id)));

  console.log("=== Warehouse mapping ===\n");
  for (const id of validIds) {
    const sid = String(id);
    const wh = existing.find((w) => String(w._id) === sid);
    if (wh) {
      console.log(`  ${sid} → ${wh.code} (${wh.name}) active=${wh.isActive}`);
    } else {
      console.log(`  ${sid} → ❌ KHÔNG CÓ TRONG DB (orphan)`);
    }
  }

  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
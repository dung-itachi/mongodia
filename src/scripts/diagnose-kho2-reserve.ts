/**
 * Diagnose: So sánh reservedQuantity vs availableQuantity vs quantity
 * cho toàn bộ WarehouseInventory của KHO2, để xác định lý do "Đang giữ: 0"
 * khi xuất kho.
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/diagnose-kho2-reserve.ts
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import Warehouse from "../models/Warehouse";
import WarehouseInventory from "../models/WarehouseInventory";

async function main() {
  await connectDB();

  const kho2 = await Warehouse.findOne({ code: "KHO2", isActive: true })
    .select("_id")
    .lean();
  if (!kho2) {
    console.error("❌ KHO2 not found");
    process.exit(1);
  }
  console.log(`KHO2 _id = ${kho2._id}\n`);

  const inv = await WarehouseInventory.find({
    warehouseId: kho2._id,
    itemType: "PRODUCT",
    isActive: { $ne: false },
  })
    .select("_id productVariantId quantity reservedQuantity availableQuantity inTransitQuantity")
    .lean();

  console.log(`Total PRODUCT WarehouseInventory rows: ${inv.length}\n`);

  let mismatchCount = 0;
  let zeroReservedCount = 0;
  let inconsistentCount = 0;
  const inconsistentRows: Array<{
    _id: string;
    q: number;
    r: number;
    a: number;
    expected: number;
  }> = [];

  for (const r of inv) {
    const q = r.quantity ?? 0;
    const rs = r.reservedQuantity ?? 0;
    const a = r.availableQuantity ?? 0;
    const expectedAvail = q - rs;

    if (rs === 0 && q > 0) zeroReservedCount++;
    if (a !== expectedAvail) {
      inconsistentCount++;
      inconsistentRows.push({
        _id: String(r._id),
        q,
        r: rs,
        a,
        expected: expectedAvail,
      });
    }
  }

  console.log(`Rows with reservedQuantity = 0 (but quantity > 0): ${zeroReservedCount}`);
  console.log(`Rows where availableQuantity != quantity - reservedQuantity: ${inconsistentCount}`);

  if (inconsistentRows.length > 0) {
    console.log("\nSample inconsistent rows (first 10):");
    for (const r of inconsistentRows.slice(0, 10)) {
      console.log(
        `  _id=${r._id}  q=${r.q}  reserved=${r.r}  available=${r.a}  (expected=${r.expected})`
      );
    }
    if (inconsistentRows.length > 10) {
      console.log(`  ... and ${inconsistentRows.length - 10} more.`);
    }
  }

  console.log("\n=== Top 5 by quantity ===\n");
  const top5 = [...inv].sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0)).slice(0, 5);
  for (const r of top5) {
    const ri = r as unknown as { variantId?: unknown; productId?: unknown };
    console.log(
      `  q=${String(r.quantity).padStart(4)}  reserved=${String(r.reservedQuantity).padStart(4)}  available=${String(r.availableQuantity).padStart(4)}  variant=${ri.variantId ?? "-"}  product=${ri.productId ?? "-"}`
    );
  }

  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
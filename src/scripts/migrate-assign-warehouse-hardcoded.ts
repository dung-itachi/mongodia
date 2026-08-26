/**
 * Migration: Assign hardcoded KHO2 (Kho Mông Cổ) to 3 known CONFIRMED orders
 * that lack warehouseId (legacy bug — convertLead didn't set warehouseId).
 *
 * Use ONLY for these specific orders:
 *   - OD2608240002
 *   - OD2608240010
 *   - OD2608240011
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/migrate-assign-warehouse-hardcoded.ts
 *   npx tsx --env-file=.env.local src/scripts/migrate-assign-warehouse-hardcoded.ts --apply
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";

const TARGET_CODES = ["OD2608240002", "OD2608240010", "OD2608240011"];

async function main() {
  const dryRun = !process.argv.includes("--apply");
  console.log(`🔄 Assign KHO2 (hardcoded) to specific orders  (${dryRun ? "DRY RUN" : "APPLY"})\n`);

  await connectDB();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB connection not initialized");
  }
  const ordersCol = db.collection("orders");
  const warehousesCol = db.collection("warehouses");

  const kho2 = await warehousesCol.findOne({ code: "KHO2" });
  if (!kho2) {
    console.error("❌ KHO2 warehouse not found in DB");
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`KHO2 = ${kho2._id} (${kho2.name})\n`);

  for (const code of TARGET_CODES) {
    const order = await ordersCol.findOne({ orderCode: code });
    if (!order) {
      console.warn(`  ⚠️  ${code}: not found`);
      continue;
    }
    if (order.warehouseId) {
      console.log(`  ${code}: already has warehouseId=${order.warehouseId}, skip`);
      continue;
    }
    if (dryRun) {
      console.log(`  ${code} (${order.status}) → warehouseId=${kho2._id}`);
    } else {
      await ordersCol.updateOne(
        { _id: order._id },
        { $set: { warehouseId: kho2._id } }
      );
      console.log(`  ✅ ${code} (${order.status}) → warehouseId=${kho2._id}`);
    }
  }

  if (dryRun) console.log("\nRun with --apply flag to write changes.");
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

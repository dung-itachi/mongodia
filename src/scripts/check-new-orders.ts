/**
 * Check if the latest orders have warehouseId.
 * Run: npx tsx --env-file=.env.local src/scripts/check-new-orders.ts
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";

async function main() {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB connection not initialized");
  }

  const latestOrders = await db
    .collection("orders")
    .find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

  console.log("📦 Latest 5 orders:");
  for (const o of latestOrders) {
    console.log(`  ${o.orderCode}  status=${o.status}  warehouseId=${o.warehouseId ?? "(null)"}`);
  }

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

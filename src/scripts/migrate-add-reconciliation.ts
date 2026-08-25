/**
 * ==================================================
 * MIGRATION: Add reconciliation fields to Order
 * ==================================================
 *
 * Run: npx ts-node --esm src/scripts/migrate-add-reconciliation.ts
 * Or:  npm run migrate
 */

import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";

async function migrate() {
  console.log("🔄 Starting migration: Add reconciliation fields to Order\n");

  await connectDB();

  const db = mongoose.connection.db!;
  const collection = db.collection("orders");

  // Check if field exists
  const sample = await collection.findOne({});
  if (sample && "isReconciled" in sample) {
    console.log("✅ Field 'isReconciled' already exists. Migration not needed.");
    await mongoose.disconnect();
    return;
  }

  // Add field to all existing orders
  const result = await collection.updateMany(
    { isReconciled: { $exists: false } },
    { $set: { isReconciled: false } }
  );

  console.log(`✅ Migration complete!`);
  console.log(`   - Updated ${result.modifiedCount} documents`);
  console.log(`   - Set isReconciled = false for existing orders`);

  await mongoose.disconnect();
  console.log("\n🔌 Disconnected from MongoDB");
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});

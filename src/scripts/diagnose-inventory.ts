/**
 * Diagnostic script: Check WarehouseInventory data
 * Chạy: npx ts-node src/scripts/diagnose-inventory.ts
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import WarehouseInventory from "@/models/WarehouseInventory";
import Inventory from "@/models/Inventory";
import Warehouse from "@/models/Warehouse";

async function main() {
  await connectDB();

  // 1. List all warehouses
  const warehouses = await Warehouse.find({}).lean();
  console.log("\n🏭 Warehouses:");
  for (const w of warehouses) {
    console.log(`   ${w._id} | ${w.code} | ${w.name}`);
  }

  // 2. Check WarehouseInventory records
  const wiAll = await WarehouseInventory.find({}).lean();
  console.log(`\n📦 WarehouseInventory: ${wiAll.length} records total`);
  const wiByWarehouse = new Map<string, number>();
  for (const r of wiAll) {
    const wid = String(r.warehouseId);
    wiByWarehouse.set(wid, (wiByWarehouse.get(wid) ?? 0) + 1);
  }
  console.log("   By warehouse:");
  for (const [wid, count] of wiByWarehouse) {
    const w = warehouses.find((x) => String(x._id) === wid);
    console.log(`     ${wid} (${w?.code ?? "?"}) — ${count} records`);
  }

  // 3. Show sample records
  console.log("\n📋 Sample WarehouseInventory records (first 5):");
  const samples = await WarehouseInventory.find({}).limit(5).lean();
  for (const s of samples) {
    console.log(`   warehouseId=${s.warehouseId} itemType=${s.itemType} variantId=${s.variantId} quantity=${s.quantity} availableQuantity=${s.availableQuantity}`);
  }

  // 4. Check Inventory records
  const invAll = await Inventory.find({}).lean();
  console.log(`\n🏬 Inventory: ${invAll.length} records total`);
  const invByWarehouse = new Map<string, number>();
  for (const r of invAll) {
    const wid = String(r.warehouseId);
    invByWarehouse.set(wid, (invByWarehouse.get(wid) ?? 0) + 1);
  }
  console.log("   By warehouse:");
  for (const [wid, count] of invByWarehouse) {
    const w = warehouses.find((x) => String(x._id) === wid);
    console.log(`     ${wid} (${w?.code ?? "?"}) — ${count} records`);
  }

  // 5. Check what itemTypes exist
  const itemTypes = new Map<string, number>();
  for (const r of wiAll) {
    itemTypes.set(r.itemType, (itemTypes.get(r.itemType) ?? 0) + 1);
  }
  console.log("\n🔖 WarehouseInventory itemTypes:");
  for (const [t, count] of itemTypes) {
    console.log(`   ${t}: ${count} records`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);

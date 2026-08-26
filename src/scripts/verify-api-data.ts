/**
 * Verify: simulate inventory-overview API logic against live DB
 * Chạy: MONGODB_URI=... npx tsx src/scripts/verify-api-data.ts
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import WarehouseInventory from "@/models/WarehouseInventory";
import ProductVariant from "@/models/ProductVariant";
import { InventoryHistory } from "@/models/InventoryHistory";

async function main() {
  await connectDB();

  // Simulate the exact API logic
  const products = await Product.find({ isActive: { $ne: false } })
    .select("_id code name").lean();

  const productIds = products.map((p) => p._id);

  const variants = await ProductVariant.find({
    productId: { $in: productIds },
    isActive: { $ne: false },
  }).select("_id productId").lean();

  const variantsByProduct = new Map<string, string[]>();
  for (const v of variants) {
    const arr = variantsByProduct.get(String(v.productId)) ?? [];
    arr.push(String(v._id));
    variantsByProduct.set(String(v.productId), arr);
  }
  for (const pid of productIds) {
    const arr = variantsByProduct.get(String(pid)) ?? [];
    if (!arr.includes(String(pid))) arr.push(String(pid));
    variantsByProduct.set(String(pid), arr);
  }

  const allVariantIds = Array.from(new Set(Array.from(variantsByProduct.values()).flat()));

  // ── QUERY WarehouseInventory (FIXED) ──────────────────────────────────────
  console.log("\n=== Using WarehouseInventory ===");
  const invAgg = await WarehouseInventory.aggregate([
    {
      $match: {
        variantId: { $in: allVariantIds.map((id) => new mongoose.Types.ObjectId(id)) },
        itemType: "PRODUCT",
        isActive: { $ne: false },
      },
    },
    {
      $group: {
        _id: "$variantId",
        stock: {
          $sum: { $ifNull: ["$availableQuantity", 0] },
        },
      },
    },
  ]);
  const stockByVariant = new Map<string, number>();
  for (const r of invAgg as Array<{ _id: unknown; stock: number }>) {
    stockByVariant.set(String(r._id), r.stock ?? 0);
  }
  console.log("stockByVariant (non-zero):");
  for (const [k, v] of stockByVariant) {
    if (v !== 0) console.log(`  ${k}: ${v}`);
  }

  const stockByProduct = new Map<string, number>();
  for (const pid of productIds) {
    const vIds = variantsByProduct.get(String(pid)) ?? [];
    let total = 0;
    for (const vId of vIds) {
      total += stockByVariant.get(vId) ?? 0;
    }
    stockByProduct.set(String(pid), total);
  }

  const items = products.map((p) => ({
    productId: String(p._id),
    productCode: p.code,
    productName: p.name,
    stock: stockByProduct.get(String(p._id)) ?? 0,
  }));

  const visibleItems = items.filter(
    (i) => i.stock !== 0
  );

  console.log(`\nvisibleItems (stock != 0): ${visibleItems.length}`);
  for (const item of visibleItems) {
    console.log(`  ${item.productCode} | ${item.productName} | stock=${item.stock}`);
  }

  // ── QUERY Inventory (OLD) ────────────────────────────────────────────────
  console.log("\n=== Using Inventory (OLD) ===");
  const oldInvAgg = await mongoose.model("Inventory").aggregate([
    {
      $match: {
        productVariantId: { $in: allVariantIds.map((id) => new mongoose.Types.ObjectId(id)) },
        isActive: { $ne: false },
      },
    },
    {
      $group: {
        _id: "$productVariantId",
        stock: {
          $sum: {
            $subtract: [
              { $ifNull: ["$quantity", 0] },
              { $ifNull: ["$reservedQuantity", 0] },
            ],
          },
        },
      },
    },
  ]);
  console.log(`Inventory records found: ${oldInvAgg.length}`);
  for (const r of oldInvAgg as Array<{ _id: unknown; stock: number }>) {
    console.log(`  ${r._id}: ${r.stock}`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);

/**
 * Simulate exact overview query with warehouseId filter
 */
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";
import WarehouseInventory from "@/models/WarehouseInventory";

async function main() {
  await connectDB();

  // Test with warehouseId = "6a76fb56fca9abc120e48d9d" (has stock=100 for GS25)
  const warehouseId = "6a76fb56fca9abc120e48d9d";
  const warehouseOid = new mongoose.Types.ObjectId(warehouseId);

  const products = await Product.find({ isActive: { $ne: false } })
    .select("_id code name")
    .lean();

  for (const product of products) {
    const variants = await ProductVariant.find({
      productId: product._id,
      isActive: { $ne: false },
    }).select("_id sku").lean();

    const variantIds = variants.map((v) => String(v._id));
    const variantOids = variantIds.map((id) => new mongoose.Types.ObjectId(id));

    // Exact query from API
    const invAgg = await WarehouseInventory.aggregate([
      {
        $match: {
          variantId: { $in: variantOids },
          itemType: "PRODUCT",
          isActive: { $ne: false },
        },
      },
      {
        $group: {
          _id: "$variantId",
          stock: { $sum: { $ifNull: ["$availableQuantity", 0] } },
        },
      },
    ]);

    const stockByVariant = new Map<string, number>();
    for (const r of invAgg as Array<{ _id: unknown; stock: number }>) {
      stockByVariant.set(String(r._id), r.stock ?? 0);
    }

    let total = 0;
    for (const v of variants) {
      total += stockByVariant.get(String(v._id)) ?? 0;
    }

    if (total > 0) {
      console.log(`\n${product.code} → TOTAL=${total}`);
      for (const v of variants) {
        const s = stockByVariant.get(String(v._id)) ?? 0;
        console.log(`  ${v.sku} → stock=${s}`);
      }
    }
  }

  // Now try WITH warehouseId filter
  console.log("\n\n=== WITH warehouseId filter ===");
  for (const product of products) {
    const variants = await ProductVariant.find({
      productId: product._id,
      isActive: { $ne: false },
    }).select("_id sku").lean();

    const variantOids = variants.map((v) => new mongoose.Types.ObjectId(String(v._id)));

    const invAgg = await WarehouseInventory.aggregate([
      {
        $match: {
          variantId: { $in: variantOids },
          itemType: "PRODUCT",
          isActive: { $ne: false },
          warehouseId: warehouseOid,  // <-- filter by warehouse
        },
      },
      {
        $group: {
          _id: "$variantId",
          stock: { $sum: { $ifNull: ["$availableQuantity", 0] } },
        },
      },
    ]);

    const stockByVariant = new Map<string, number>();
    for (const r of invAgg as Array<{ _id: unknown; stock: number }>) {
      stockByVariant.set(String(r._id), r.stock ?? 0);
    }

    let total = 0;
    for (const v of variants) {
      total += stockByVariant.get(String(v._id)) ?? 0;
    }

    if (total > 0) {
      console.log(`\n${product.code} → TOTAL=${total}`);
      for (const v of variants) {
        const s = stockByVariant.get(String(v._id)) ?? 0;
        console.log(`  ${v.sku} → stock=${s}`);
      }
    }
  }

  await mongoose.disconnect();
}
main().catch(console.error);

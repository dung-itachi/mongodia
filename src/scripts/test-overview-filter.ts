/**
 * Simulate exact overview API query with warehouseId filter (after fix)
 */
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import WarehouseInventory from "@/models/WarehouseInventory";
import { InventoryHistory } from "@/models/InventoryHistory";
import Order from "@/models/Order";
import ProductVariant from "@/models/ProductVariant";

async function main() {
  await connectDB();

  const warehouseIdParam = "6a76fb56fca9abc120e48d9d";
  const warehouseOid = new mongoose.Types.ObjectId(warehouseIdParam);

  const products = await Product.find({ isActive: { $ne: false } })
    .select("_id code name")
    .sort({ createdAt: 1 })
    .lean();

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

  const allVariantIds = Array.from(
    new Set(Array.from(variantsByProduct.values()).flat())
  );
  const allVariantIdsAsOid = allVariantIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const productIdsAsOid = productIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  // ---- Stock with warehouseId filter (THE FIX) ----
  const stockByProduct = new Map<string, number>();
  if (allVariantIdsAsOid.length > 0) {
    const inventoryMatch = {
      $and: [
        {
          $or: [
            { variantId: { $in: allVariantIdsAsOid } },
            { productId: { $in: productIdsAsOid } },
          ],
        },
        { itemType: "PRODUCT" },
        { isActive: { $ne: false } },
      ],
    };
    // FIXED: push warehouseId into $and array as ObjectId
    (inventoryMatch.$and as unknown[]).push({
      warehouseId: new mongoose.Types.ObjectId(warehouseIdParam),
    });

    const invAgg = await WarehouseInventory.aggregate([
      { $match: inventoryMatch },
      {
        $group: {
          _id: { variantId: "$variantId", productId: "$productId" },
          stock: { $sum: { $ifNull: ["$availableQuantity", 0] } },
        },
      },
    ]);

    const stockByVariant = new Map<string, number>();
    const stockByProductDirect = new Map<string, number>();
    for (const r of invAgg as Array<{ _id: { variantId: unknown; productId: unknown }; stock: number }>) {
      const vKey = r._id?.variantId ? String(r._id.variantId) : "";
      const pKey = r._id?.productId ? String(r._id.productId) : "";
      if (vKey && vKey !== "null") stockByVariant.set(vKey, r.stock ?? 0);
      else if (pKey && pKey !== "null") stockByProductDirect.set(pKey, r.stock ?? 0);
    }

    for (const pid of productIds) {
      const vIds = variantsByProduct.get(String(pid)) ?? [];
      let total = 0;
      for (const vId of vIds) total += stockByVariant.get(vId) ?? 0;
      total += stockByProductDirect.get(String(pid)) ?? 0;
      stockByProduct.set(String(pid), total);
    }
  }

  // Print results
  console.log("=== WITH warehouseId filter ===");
  let hasData = false;
  for (const p of products) {
    const stock = stockByProduct.get(String(p._id)) ?? 0;
    if (stock > 0) {
      hasData = true;
      console.log(`${p.code} (${p.name}): stock=${stock}`);
    }
  }
  if (!hasData) console.log("NO PRODUCTS WITH STOCK");

  await mongoose.disconnect();
}
main().catch(console.error);

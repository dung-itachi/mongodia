/**
 * Diagnostic: Check data matching between WarehouseInventory and ProductVariant
 * Chạy: MONGODB_URI=... npx tsx src/scripts/diagnose-variants.ts
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import WarehouseInventory from "@/models/WarehouseInventory";
import ProductVariant from "@/models/ProductVariant";
import Product from "@/models/Product";

async function main() {
  await connectDB();

  // 1. Get all WarehouseInventory PRODUCT records
  const wiProducts = await WarehouseInventory.find({
    itemType: "PRODUCT",
    isActive: { $ne: false },
  }).lean();

  console.log(`\n📦 WarehouseInventory PRODUCT records: ${wiProducts.length}`);

  // 2. Get all active ProductVariants
  const variants = await ProductVariant.find({ isActive: { $ne: false } })
    .select("_id productId sku")
    .lean();
  const variantMap = new Map<string, { productId: string; sku: string }>();
  for (const v of variants) {
    variantMap.set(String(v._id), { productId: String(v.productId), sku: v.sku ?? "" });
  }

  console.log(`\n🔖 ProductVariants (active): ${variants.length}`);
  console.log("   Sample:", variants.slice(0, 3).map((v) => `${v._id} → ${v.productId}`).join(", "));

  // 3. Check which WI variantIds exist in ProductVariant
  const missingVariants: string[] = [];
  for (const wi of wiProducts) {
    if (!wi.variantId) continue;
    const vid = String(wi.variantId);
    if (!variantMap.has(vid)) {
      missingVariants.push(vid);
    }
  }

  if (missingVariants.length > 0) {
    console.log(`\n⚠️  WarehouseInventory variantIds KHÔNG tồn tại trong ProductVariant:`);
    for (const vid of missingVariants) {
      console.log(`   ${vid}`);
    }
  } else {
    console.log(`\n✅ Tất cả variantIds trong WarehouseInventory đều tồn tại trong ProductVariant`);
  }

  // 4. Get all active Products
  const products = await Product.find({ isActive: { $ne: false } })
    .select("_id code name")
    .lean();
  const productMap = new Map<string, { code: string; name: string }>();
  for (const p of products) {
    productMap.set(String(p._id), { code: p.code ?? "", name: p.name ?? "" });
  }
  console.log(`\n🏷️  Products (active): ${products.length}`);

  // 5. Simulate API aggregation
  const productIds = products.map((p) => String(p._id));
  const variantsByProduct = new Map<string, string[]>();
  for (const v of variants) {
    const pid = String(v.productId);
    const arr = variantsByProduct.get(pid) ?? [];
    arr.push(String(v._id));
    variantsByProduct.set(pid, arr);
  }
  for (const pid of productIds) {
    const arr = variantsByProduct.get(pid) ?? [];
    if (!arr.includes(pid)) arr.push(pid);
    variantsByProduct.set(pid, arr);
  }

  const allVariantIds = Array.from(
    new Set(Array.from(variantsByProduct.values()).flat())
  );
  console.log(`\n🔗 variantsByProduct: ${variantsByProduct.size} products có variants`);
  console.log(`   allVariantIds count: ${allVariantIds.length}`);

  // 6. Check: WI variantIds vs API variantIds
  const wiVariantIds = wiProducts
    .filter((wi) => wi.variantId)
    .map((wi) => String(wi.variantId));
  const wiVariantSet = new Set(wiVariantIds);
  const apiVariantSet = new Set(allVariantIds);

  const onlyInWI = wiVariantIds.filter((v) => !apiVariantSet.has(v));
  const onlyInAPI = allVariantIds.filter((v) => !wiVariantSet.has(v));

  if (onlyInWI.length > 0) {
    console.log(`\n⚠️  VariantIds trong WarehouseInventory nhưng KHÔNG có trong ProductVariant (API sẽ bỏ qua):`);
    for (const v of onlyInWI) {
      console.log(`   ${v}`);
    }
  }
  if (onlyInAPI.length > 0) {
    console.log(`\n⚠️  VariantIds trong ProductVariant nhưng KHÔNG có trong WarehouseInventory (sẽ = 0):`);
    for (const v of onlyInAPI.slice(0, 5)) {
      const sku = variantMap.get(v)?.sku ?? "?";
      console.log(`   ${v} (sku: ${sku})`);
    }
    if (onlyInAPI.length > 5) console.log(`   ... và ${onlyInAPI.length - 5} variant khác`);
  }

  // 7. Simulate stock aggregation
  const stockByVariant = new Map<string, number>();
  for (const wi of wiProducts) {
    if (!wi.variantId) continue;
    stockByVariant.set(String(wi.variantId), wi.availableQuantity ?? 0);
  }

  const stockByProduct = new Map<string, number>();
  for (const pid of productIds) {
    const vIds = variantsByProduct.get(pid) ?? [];
    let total = 0;
    for (const vId of vIds) {
      total += stockByVariant.get(vId) ?? 0;
    }
    stockByProduct.set(pid, total);
  }

  const nonZero = Array.from(stockByProduct.entries()).filter(([, v]) => v > 0);
  console.log(`\n📊 Stock by product (non-zero): ${nonZero.length}`);
  for (const [pid, stock] of nonZero) {
    const p = productMap.get(pid);
    console.log(`   ${p?.code ?? pid} | ${p?.name ?? "?"} | stock=${stock}`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);

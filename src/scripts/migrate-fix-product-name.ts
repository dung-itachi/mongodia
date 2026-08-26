/**
 * Migration: Fix orderItems[].productName for orders where it incorrectly
 * equals comboName (legacy bug).
 *
 * Bug chain (fixed in code already):
 *   1. saleOrderService.validateItem() didn't return productName
 *   2. orderService.createFromLead() line 856 fell back to comboName
 *   3. Old orders have orderItems[].productName = comboName
 *
 * This script rewrites orderItems[].productName to the correct Product.name
 * looked up from Product collection via item.productId.
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/migrate-fix-product-name.ts
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";

async function main() {
  const dryRun = !process.argv.includes("--apply");
  console.log(`🔄 Migration: fix orderItems[].productName  (${dryRun ? "DRY RUN" : "APPLY"})\n`);

  await connectDB();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB connection not initialized");
  }
  const ordersCol = db.collection("orders");
  const productsCol = db.collection("products");

  // Find candidates: orders where some item has comboName === productName (both non-empty)
  const candidates = await ordersCol
    .find({
      orderItems: {
        $elemMatch: {
          comboName: { $ne: "" },
          productName: { $ne: "" },
        },
      },
    })
    .project({ orderCode: 1, status: 1, orderItems: 1 })
    .toArray();

  // Filter in app code
  const mismatchedOrders = candidates.filter((o: { orderItems?: Array<{ comboName?: string; productName?: string; productId?: string }> }) =>
    (o.orderItems ?? []).some(
      (it: { comboName?: string; productName?: string; productId?: string }) =>
        it.comboName && it.productName && it.comboName === it.productName
    )
  );

  console.log(`📊 Found ${mismatchedOrders.length} candidate orders\n`);
  if (mismatchedOrders.length === 0) {
    console.log("✅ Nothing to fix");
    await mongoose.disconnect();
    return;
  }

  // Collect unique productIds
  const productIds = new Set();
  for (const o of mismatchedOrders) {
    for (const it of o.orderItems ?? []) {
      if (it.comboName && it.productName && it.comboName === it.productName && it.productId) {
        productIds.add(String(it.productId));
      }
    }
  }

  console.log(`� Looking up ${productIds.size} products...`);
  const productIdArr = [...productIds] as string[];
  const products = (await productsCol
    .find({ _id: { $in: productIdArr.map((id: string) => new mongoose.Types.ObjectId(id)) } })
    .project({ _id: 1, name: 1 })
    .toArray()) as Array<{ _id: unknown; name: string }>;
  const productNameById = new Map<string, string>(products.map((p) => [String(p._id), p.name]));

  let fixedOrders = 0;
  let fixedItems = 0;
  let skippedMissing = 0;

  for (const o of mismatchedOrders) {
    let modified = false;
    const newItems = [];
    for (const it of o.orderItems ?? []) {
      const itCopy = { ...it };
      if (
        itCopy.comboName &&
        itCopy.productName &&
        itCopy.comboName === itCopy.productName &&
        itCopy.productId
      ) {
        const correctName = productNameById.get(String(itCopy.productId));
        if (correctName && correctName !== itCopy.comboName) {
          itCopy.productName = correctName;
          modified = true;
          fixedItems++;
          console.log(
            `  ${o.orderCode} (${o.status}): comboName="${itCopy.comboName}" → productName="${correctName}"`
          );
        } else if (!correctName) {
          skippedMissing++;
          console.warn(`  ⚠️  ${o.orderCode}: productId ${itCopy.productId} not found in DB`);
        }
      }
      newItems.push(itCopy);
    }
    if (modified) {
      if (!dryRun) {
        await ordersCol.updateOne(
          { _id: o._id },
          { $set: { orderItems: newItems } }
        );
      }
      fixedOrders++;
    }
  }

  console.log(`\n${dryRun ? "🧪 DRY RUN" : "✅ APPLIED"}: would fix ${fixedItems} items in ${fixedOrders} orders`);
  if (skippedMissing) console.log(`⚠️  ${skippedMissing} items skipped (product not found)`);
  if (dryRun) console.log("\nRun with --apply flag to write changes.");

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

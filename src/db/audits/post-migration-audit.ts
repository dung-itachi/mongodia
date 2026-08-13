/**
 * POST-MIGRATION AUDIT: WarehouseInventory
 * 
 * Run after migration 003 to verify all invariants are satisfied.
 */

import { connectDB } from "@/lib/mongodb";
import WarehouseInventory from "@/models/WarehouseInventory";
import Inventory from "@/models/Inventory";
import ProductVariant from "@/models/ProductVariant";
import Gift from "@/models/Gift";

interface AuditResult {
  id: string;
  itemType: string;
  warehouseId: string;
  variantId?: string;
  giftId?: string;
  productId?: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  inTransitQuantity: number;
  shippedQuantity: number;
  hasMissingReserved: boolean;
  hasMissingAvailable: boolean;
  invariantOk: boolean;
  errors: string[];
}

async function runAudit(): Promise<{ passed: boolean; results: AuditResult[]; duplicates: number }> {
  console.log("\n==================================================");
  console.log("POST-MIGRATION AUDIT: WarehouseInventory");
  console.log("==================================================\n");

  await connectDB();

  const records = await WarehouseInventory.find({}).lean();
  console.log(`Total WarehouseInventory records: ${records.length}\n`);

  const results: AuditResult[] = [];
  let allPassed = true;

  for (const record of records) {
    const result: AuditResult = {
      id: record._id.toString(),
      itemType: record.itemType,
      warehouseId: record.warehouseId.toString(),
      variantId: record.variantId?.toString(),
      giftId: record.giftId?.toString(),
      productId: record.productId?.toString(),
      quantity: record.quantity,
      reservedQuantity: record.reservedQuantity ?? 0,
      availableQuantity: record.availableQuantity ?? 0,
      inTransitQuantity: record.inTransitQuantity ?? 0,
      shippedQuantity: record.shippedQuantity ?? 0,
      hasMissingReserved: record.reservedQuantity === undefined || record.reservedQuantity === null,
      hasMissingAvailable: record.availableQuantity === undefined || record.availableQuantity === null,
      invariantOk: false,
      errors: [],
    };

    // Calculate expected available
    const expectedAvailable = result.quantity - result.reservedQuantity - result.inTransitQuantity;
    const invariantDiff = Math.abs(result.availableQuantity - expectedAvailable);

    // Check missing fields
    if (result.hasMissingReserved) {
      result.errors.push("reservedQuantity is MISSING");
      allPassed = false;
    }
    if (result.hasMissingAvailable) {
      result.errors.push("availableQuantity is MISSING");
      allPassed = false;
    }

    // Verify invariant
    result.invariantOk = invariantDiff < 0.01;
    if (!result.invariantOk) {
      result.errors.push(`Invariant violation: availableQuantity (${result.availableQuantity}) != quantity - reservedQuantity - inTransitQuantity (${expectedAvailable})`);
      allPassed = false;
    }

    // Verify quantity >= 0
    if (result.quantity < 0) {
      result.errors.push("quantity < 0");
      allPassed = false;
    }

    // Verify reservedQuantity >= 0
    if (result.reservedQuantity < 0) {
      result.errors.push("reservedQuantity < 0");
      allPassed = false;
    }

    // Verify inTransitQuantity >= 0
    if (result.inTransitQuantity < 0) {
      result.errors.push("inTransitQuantity < 0");
      allPassed = false;
    }

    // Verify availableQuantity >= 0
    if (result.availableQuantity < 0) {
      result.errors.push("availableQuantity < 0");
      allPassed = false;
    }

    // Verify reservedQuantity <= quantity
    if (result.reservedQuantity > result.quantity) {
      result.errors.push("reservedQuantity > quantity");
      allPassed = false;
    }

    // Verify inTransitQuantity <= quantity
    if (result.inTransitQuantity > result.quantity) {
      result.errors.push("inTransitQuantity > quantity");
      allPassed = false;
    }

    results.push(result);
  }

  // Check for duplicates
  const seen = new Map<string, string>();
  let duplicates = 0;
  for (const r of records) {
    const key = [
      r.warehouseId.toString(),
      r.itemType,
      r.productId?.toString() || "null",
      r.variantId?.toString() || "null",
      r.giftId?.toString() || "null",
    ].join("|");
    
    if (seen.has(key)) {
      duplicates++;
      allPassed = false;
      const idx = results.findIndex((res) => res.id === r._id.toString());
      if (idx >= 0) {
        results[idx].errors.push(`Duplicate with ${seen.get(key)}`);
      }
    } else {
      seen.set(key, r._id.toString());
    }
  }

  // Check references for PRODUCT items
  for (const record of records) {
    if (record.itemType === "PRODUCT") {
      if (record.variantId) {
        const variant = await ProductVariant.findById(record.variantId).lean();
        if (!variant) {
          const idx = results.findIndex((r) => r.id === record._id.toString());
          if (idx >= 0) {
            results[idx].errors.push(`Invalid variantId reference: ${record.variantId}`);
          }
          allPassed = false;
        }
      }
    } else if (record.itemType === "GIFT") {
      if (record.giftId) {
        const gift = await Gift.findById(record.giftId).lean();
        if (!gift) {
          const idx = results.findIndex((r) => r.id === record._id.toString());
          if (idx >= 0) {
            results[idx].errors.push(`Invalid giftId reference: ${record.giftId}`);
          }
          allPassed = false;
        }
      }
    }
  }

  return { passed: allPassed, results, duplicates };
}

async function main() {
  try {
    const { passed, results, duplicates } = await runAudit();

    // Get Inventory count
    await connectDB();
    const inventoryCount = await Inventory.countDocuments({});
    console.log(`\nInventory records: ${inventoryCount}`);

    // Summary
    console.log("\n==================================================");
    console.log("AUDIT SUMMARY");
    console.log("==================================================");
    console.log(`WarehouseInventory Total: ${results.length}`);
    console.log(`Missing reservedQuantity: ${results.filter((r) => r.hasMissingReserved).length}`);
    console.log(`Missing availableQuantity: ${results.filter((r) => r.hasMissingAvailable).length}`);
    console.log(`Invariant Violations: ${results.filter((r) => !r.invariantOk).length}`);
    console.log(`Duplicates: ${duplicates}`);
    console.log(`CRITICAL Issues: ${results.filter((r) => r.errors.length > 0).length}`);
    console.log("");

    // Print all records
    console.log("==================================================");
    console.log("RECORD DETAILS");
    console.log("==================================================");

    const productRecords = results.filter((r) => r.itemType === "PRODUCT");
    const giftRecords = results.filter((r) => r.itemType === "GIFT");

    console.log("\n--- PRODUCT Records ---");
    for (const r of productRecords) {
      console.log(`\nID: ${r.id}`);
      console.log(`  quantity: ${r.quantity}`);
      console.log(`  reservedQuantity: ${r.reservedQuantity}`);
      console.log(`  availableQuantity: ${r.availableQuantity}`);
      console.log(`  inTransitQuantity: ${r.inTransitQuantity}`);
      console.log(`  Invariant OK: ${r.invariantOk ? "YES" : "NO"}`);
      if (r.errors.length > 0) {
        console.log(`  ERRORS: ${r.errors.join(", ")}`);
      }
    }

    console.log("\n--- GIFT Records ---");
    for (const r of giftRecords) {
      console.log(`\nID: ${r.id}`);
      console.log(`  quantity: ${r.quantity}`);
      console.log(`  reservedQuantity: ${r.reservedQuantity}`);
      console.log(`  availableQuantity: ${r.availableQuantity}`);
      console.log(`  inTransitQuantity: ${r.inTransitQuantity}`);
      console.log(`  Invariant OK: ${r.invariantOk ? "YES" : "NO"}`);
      if (r.errors.length > 0) {
        console.log(`  ERRORS: ${r.errors.join(", ")}`);
      }
    }

    console.log("\n==================================================");
    console.log(`FINAL RESULT: ${passed ? "PASS" : "FAIL"}`);
    console.log("==================================================");

    if (passed) {
      console.log("\n✅ ALL CHECKS PASSED - READY FOR PHASE 3");
    } else {
      console.log("\n❌ SOME CHECKS FAILED - REVIEW ERRORS ABOVE");
    }

    process.exit(passed ? 0 : 1);
  } catch (err) {
    console.error("Audit error:", err);
    process.exit(1);
  }
}

main();

/**
 * ==================================================
 * RECONCILIATION UTILITY
 * ==================================================
 *
 * Compares Inventory vs WarehouseInventory for product variants.
 * Reports discrepancies without auto-correcting.
 *
 * Usage:
 *   # Run full reconciliation:
 *   npx ts-node --esm src/services/warehouse/dualWrite.reconciliation.ts
 *
 *   # Run with specific warehouse:
 *   npx ts-node --esm src/services/warehouse/dualWrite.reconciliation.ts --warehouse=WAREHOUSE_ID
 *
 *   # Run in verbose mode:
 *   npx ts-node --esm src/services/warehouse/dualWrite.reconciliation.ts --verbose
 *
 * Output:
 *   - Console summary
 *   - PHASE_2_RECONCILIATION_REPORT.md
 *
 * Phase 2: Both collections should have same values for product variants
 * after migration and dual-write activation.
 */

import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import Inventory from "@/models/Inventory";
import WarehouseInventory from "@/models/WarehouseInventory";
import Warehouse from "@/models/Warehouse";
import ProductVariant from "@/models/ProductVariant";
import fs from "fs";
import path from "path";

// ==================================================
// Configuration
// ==================================================

interface ReconciliationConfig {
  warehouseId?: string;
  verbose: boolean;
  outputFile: string;
  threshold: number; // Acceptable difference threshold
}

function parseArgs(): ReconciliationConfig {
  const args = process.argv.slice(2);
  const warehouseArg = args.find((a) => a.startsWith("--warehouse="));
  return {
    warehouseId: warehouseArg?.split("=")[1],
    verbose: args.includes("--verbose"),
    outputFile: path.join(process.cwd(), "PHASE_2_RECONCILIATION_REPORT.md"),
    threshold: 0,
  };
}

// ==================================================
// Types
// ==================================================

interface InventoryRecord {
  _id: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  productVariantId: mongoose.Types.ObjectId;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  isActive: boolean;
}

interface WarehouseInventoryRecord {
  _id: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  variantId: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  inTransitQuantity: number;
  shippedQuantity: number;
  isActive: boolean;
}

interface DiscrepancyRecord {
  warehouseId: string;
  warehouseCode: string;
  variantId: string;
  sku?: string;
  productName?: string;
  // Inventory values
  inv_quantity: number;
  inv_reservedQuantity: number;
  inv_availableQuantity: number;
  // WarehouseInventory values
  wi_quantity: number;
  wi_reservedQuantity: number;
  wi_availableQuantity: number;
  wi_inTransitQuantity: number;
  // Differences
  diff_quantity: number;
  diff_reservedQuantity: number;
  diff_availableQuantity: number;
  // Invariant checks
  inv_invariant_ok: boolean;
  wi_invariant_ok: boolean;
  severity: "CRITICAL" | "WARNING" | "INFO";
  notes: string;
}

interface ReconciliationResult {
  totalRecords: number;
  matched: number;
  mismatched: number;
  inventoryOnly: number;
  warehouseOnly: number;
  errors: number;
  discrepancies: DiscrepancyRecord[];
  startTime: Date;
  endTime?: Date;
}

// ==================================================
// Reconciliation Logic
// ==================================================

function checkInvariant(
  quantity: number,
  reserved: number,
  available: number
): boolean {
  const calculatedAvailable = quantity - reserved;
  return Math.abs(calculatedAvailable - available) <= 0.01;
}

function assessSeverity(record: DiscrepancyRecord): "CRITICAL" | "WARNING" | "INFO" {
  // Critical: availableQuantity mismatch could cause overselling
  if (Math.abs(record.diff_availableQuantity) > 0) {
    return "CRITICAL";
  }

  // Critical: reservedQuantity mismatch
  if (Math.abs(record.diff_reservedQuantity) > 0) {
    return "CRITICAL";
  }

  // Critical: Invariant violation
  if (!record.inv_invariant_ok || !record.wi_invariant_ok) {
    return "CRITICAL";
  }

  // Warning: quantity mismatch but available matches (shouldn't happen in normal dual-write)
  if (Math.abs(record.diff_quantity) > 0) {
    return "WARNING";
  }

  return "INFO";
}

async function reconcile(
  config: ReconciliationConfig
): Promise<ReconciliationResult> {
  const result: ReconciliationResult = {
    totalRecords: 0,
    matched: 0,
    mismatched: 0,
    inventoryOnly: 0,
    warehouseOnly: 0,
    errors: 0,
    discrepancies: [],
    startTime: new Date(),
  };

  // Build filter for Inventory
  const inventoryFilter: Record<string, unknown> = { isActive: true };
  if (config.warehouseId) {
    inventoryFilter.warehouseId = new mongoose.Types.ObjectId(config.warehouseId);
  }

  // Build filter for WarehouseInventory
  const wiFilter: Record<string, unknown> = {
    itemType: "PRODUCT",
    isActive: true,
  };
  if (config.warehouseId) {
    wiFilter.warehouseId = new mongoose.Types.ObjectId(config.warehouseId);
  }

  if (config.verbose) {
    console.log("[RECONCILIATION] Starting reconciliation...");
    console.log(`[RECONCILIATION] Inventory filter:`, inventoryFilter);
    console.log(`[RECONCILIATION] WarehouseInventory filter:`, wiFilter);
  }

  // Get all Inventory records
  const inventoryRecords = await Inventory.find(inventoryFilter).lean();
  const wiRecords = await WarehouseInventory.find(wiFilter).lean();

  // Index WarehouseInventory by warehouse+variant
  const wiMap = new Map<string, WarehouseInventoryRecord>();
  for (const wi of wiRecords as WarehouseInventoryRecord[]) {
    const key = `${wi.warehouseId.toString()}:${wi.variantId.toString()}`;
    wiMap.set(key, wi);
  }

  // Get warehouse info for reporting
  const warehouseIds = [
    ...new Set([
      ...inventoryRecords.map((r) => r.warehouseId.toString()),
      ...wiRecords.map((r) => r.warehouseId.toString()),
    ]),
  ];
  const warehouses = await Warehouse.find({ _id: { $in: warehouseIds } }).lean();
  const warehouseMap = new Map<string, string>();
  for (const w of warehouses as Array<{ _id: mongoose.Types.ObjectId; code: string }>) {
    warehouseMap.set(w._id.toString(), w.code);
  }

  // Get variant info for reporting
  const variantIds = [
    ...new Set([
      ...inventoryRecords.map((r) => r.productVariantId.toString()),
      ...wiRecords.map((r) => r.variantId?.toString()).filter(Boolean),
    ]),
  ];
  const variants = await ProductVariant.find({ _id: { $in: variantIds } })
    .populate("productId", "name")
    .lean();
  const variantMap = new Map<string, { sku?: string; productName?: string }>();
  for (const v of variants as unknown as Array<{ _id: mongoose.Types.ObjectId; sku?: string; productId?: { name: string } }>) {
    variantMap.set(v._id.toString(), {
      sku: v.sku,
      productName: (v.productId as unknown as { name: string })?.name,
    });
  }

  result.totalRecords = inventoryRecords.length;

  // Process each Inventory record
  for (const inv of inventoryRecords as InventoryRecord[]) {
    const whId = inv.warehouseId.toString();
    const varId = inv.productVariantId.toString();
    const key = `${whId}:${varId}`;
    const wi = wiMap.get(key);

    const variantInfo = variantMap.get(varId) || {};
    const warehouseCode = warehouseMap.get(whId) || "UNKNOWN";

    if (!wi) {
      // Record exists in Inventory but not in WarehouseInventory
      result.inventoryOnly++;
      result.discrepancies.push({
        warehouseId: whId,
        warehouseCode,
        variantId: varId,
        sku: variantInfo.sku,
        productName: variantInfo.productName,
        inv_quantity: inv.quantity,
        inv_reservedQuantity: inv.reservedQuantity,
        inv_availableQuantity: inv.availableQuantity,
        wi_quantity: 0,
        wi_reservedQuantity: 0,
        wi_availableQuantity: 0,
        wi_inTransitQuantity: 0,
        diff_quantity: inv.quantity,
        diff_reservedQuantity: inv.reservedQuantity,
        diff_availableQuantity: inv.availableQuantity,
        inv_invariant_ok: checkInvariant(
          inv.quantity,
          inv.reservedQuantity,
          inv.availableQuantity
        ),
        wi_invariant_ok: true,
        severity: "CRITICAL",
        notes: "Record exists in Inventory but not in WarehouseInventory. Run migration script.",
      });
      continue;
    }

    // Compare values
    const diffQty = inv.quantity - (wi.quantity as number);
    const diffReserved = inv.reservedQuantity - (wi.reservedQuantity as number);
    const diffAvailable = inv.availableQuantity - (wi.availableQuantity as number);

    const invInvariantOk = checkInvariant(
      inv.quantity,
      inv.reservedQuantity,
      inv.availableQuantity
    );
    const wiInvariantOk = checkInvariant(
      wi.quantity as number,
      wi.reservedQuantity as number,
      wi.availableQuantity as number
    );

    const hasMismatch =
      Math.abs(diffQty) > config.threshold ||
      Math.abs(diffReserved) > config.threshold ||
      Math.abs(diffAvailable) > config.threshold;

    if (hasMismatch || !invInvariantOk || !wiInvariantOk) {
      result.mismatched++;

      const record: DiscrepancyRecord = {
        warehouseId: whId,
        warehouseCode,
        variantId: varId,
        sku: variantInfo.sku,
        productName: variantInfo.productName,
        inv_quantity: inv.quantity,
        inv_reservedQuantity: inv.reservedQuantity,
        inv_availableQuantity: inv.availableQuantity,
        wi_quantity: wi.quantity as number,
        wi_reservedQuantity: wi.reservedQuantity as number,
        wi_availableQuantity: wi.availableQuantity as number,
        wi_inTransitQuantity: wi.inTransitQuantity as number,
        diff_quantity: diffQty,
        diff_reservedQuantity: diffReserved,
        diff_availableQuantity: diffAvailable,
        inv_invariant_ok: invInvariantOk,
        wi_invariant_ok: wiInvariantOk,
        severity: "INFO",
        notes: "",
      };

      record.severity = assessSeverity(record);

      if (!invInvariantOk) {
        record.notes += `Inventory invariant violation: available=${inv.availableQuantity} should be ${inv.quantity - inv.reservedQuantity}. `;
      }
      if (!wiInvariantOk) {
        record.notes += `WarehouseInventory invariant violation: available=${wi.availableQuantity} should be ${(wi.quantity as number) - (wi.reservedQuantity as number)}. `;
      }

      result.discrepancies.push(record);
    } else {
      result.matched++;
    }

    // Remove from map to track WarehouseInventory-only records
    wiMap.delete(key);
  }

  // Remaining records in wiMap are WarehouseInventory-only
  for (const [, wi] of wiMap) {
    result.warehouseOnly++;
    const whId = wi.warehouseId.toString();
    const varId = wi.variantId?.toString() || "NULL";
    const variantInfo = variantMap.get(varId) || {};
    const warehouseCode = warehouseMap.get(whId) || "UNKNOWN";

    result.discrepancies.push({
      warehouseId: whId,
      warehouseCode,
      variantId: varId,
      sku: variantInfo.sku,
      productName: variantInfo.productName,
      inv_quantity: 0,
      inv_reservedQuantity: 0,
      inv_availableQuantity: 0,
      wi_quantity: wi.quantity,
      wi_reservedQuantity: wi.reservedQuantity,
      wi_availableQuantity: wi.availableQuantity,
      wi_inTransitQuantity: wi.inTransitQuantity,
      diff_quantity: wi.quantity,
      diff_reservedQuantity: wi.reservedQuantity,
      diff_availableQuantity: wi.availableQuantity,
      inv_invariant_ok: true,
      wi_invariant_ok: checkInvariant(
        wi.quantity,
        wi.reservedQuantity,
        wi.availableQuantity
      ),
      severity: "WARNING",
      notes: "Record exists in WarehouseInventory but not in Inventory. This may be a gift record or a pre-existing WI record.",
    });
  }

  result.endTime = new Date();
  return result;
}

// ==================================================
// Report Generation
// ==================================================

function generateReport(result: ReconciliationResult, config: ReconciliationConfig): string {
  const duration = result.endTime
    ? result.endTime.getTime() - result.startTime.getTime()
    : 0;

  const criticalCount = result.discrepancies.filter((d) => d.severity === "CRITICAL").length;
  const warningCount = result.discrepancies.filter((d) => d.severity === "WARNING").length;
  const infoCount = result.discrepancies.filter((d) => d.severity === "INFO").length;

  let md = `# PHASE 2 RECONCILIATION REPORT

**Date:** ${new Date().toISOString()}
**Duration:** ${duration}ms

## Summary

| Metric | Value |
|--------|-------|
| Total Inventory Records | ${result.totalRecords} |
| Matched | ${result.matched} |
| Mismatched | ${result.mismatched} |
| Inventory Only | ${result.inventoryOnly} |
| WarehouseInventory Only | ${result.warehouseOnly} |
| Errors | ${result.errors} |

## Severity Breakdown

| Severity | Count |
|----------|-------|
| CRITICAL | ${criticalCount} |
| WARNING | ${warningCount} |
| INFO | ${infoCount} |

## Critical Issues (Must Fix Before Phase 3)

`;
  const criticalIssues = result.discrepancies.filter((d) => d.severity === "CRITICAL");
  if (criticalIssues.length === 0) {
    md += "None. All critical issues resolved.\n";
  } else {
    md += `| Warehouse | Variant | SKU | Diff Available | Diff Reserved | Notes |\n`;
    md += `|-----------|--------|-----|----------------|---------------|-------|\n`;
    for (const d of criticalIssues) {
      md += `| ${d.warehouseCode} | ${d.variantId} | ${d.sku || "N/A"} | ${d.diff_availableQuantity} | ${d.diff_reservedQuantity} | ${d.notes.slice(0, 100)} |\n`;
    }
  }

  md += `
## Warning Issues (Should Investigate)

`;
  const warningIssues = result.discrepancies.filter((d) => d.severity === "WARNING");
  if (warningIssues.length === 0) {
    md += "None.\n";
  } else {
    md += `| Warehouse | Variant | SKU | Diff Qty | Notes |\n`;
    md += `|-----------|--------|-----|----------|-------|\n`;
    for (const d of warningIssues.slice(0, 50)) {
      md += `| ${d.warehouseCode} | ${d.variantId} | ${d.sku || "N/A"} | ${d.diff_quantity} | ${d.notes.slice(0, 80)} |\n`;
    }
    if (warningIssues.length > 50) {
      md += `\n*... and ${warningIssues.length - 50} more warning issues*\n`;
    }
  }

  md += `
## All Discrepancies (Detailed)

`;
  if (result.discrepancies.length === 0) {
    md += "No discrepancies found. Dual-write is working correctly.\n";
  } else {
    md += `\`\`\`\n`;
    for (const d of result.discrepancies) {
      md += `
---
Severity: ${d.severity}
Warehouse: ${d.warehouseCode} (${d.warehouseId})
Variant: ${d.variantId}
SKU: ${d.sku || "N/A"}
Product: ${d.productName || "N/A"}

Inventory:          qty=${d.inv_quantity}, reserved=${d.inv_reservedQuantity}, available=${d.inv_availableQuantity}
WarehouseInventory:  qty=${d.wi_quantity}, reserved=${d.wi_reservedQuantity}, available=${d.wi_availableQuantity}, inTransit=${d.wi_inTransitQuantity}
Diff:               qty=${d.diff_quantity}, reserved=${d.diff_reservedQuantity}, available=${d.diff_availableQuantity}
Inv. Invariant OK: ${d.inv_invariant_ok}
WI Inv. Invariant OK: ${d.wi_invariant_ok}
Notes: ${d.notes}
`;
    }
    md += `\`\`\`\n`;
  }

  md += `
## Recommendations

1. **CRITICAL Issues:** Resolve before activating dual-write
   - Run migration script to create missing WarehouseInventory records
   - Verify data integrity before proceeding

2. **WARNING Issues:** Investigate before Phase 3
   - Identify why records exist in only one collection
   - Determine if these are legitimate (e.g., gift-only records)

3. **Dual-Write Status:**
   - DUAL_WRITE_ENABLED: ${config.verbose ? "Check stockEngine.service.ts" : "Run with --verbose to check"}
   - Run reconciliation after enabling dual-write to verify sync

4. **Next Steps:**
   - Fix all CRITICAL issues
   - Investigate WARNING issues
   - Run reconciliation again after fixes
   - Enable dual-write only when matched = totalRecords

## Configuration

- Threshold: ${config.threshold}
- Warehouse Filter: ${config.warehouseId || "All"}
`;

  return md;
}

// ==================================================
// Main
// ==================================================

async function main() {
  const config = parseArgs();

  console.log(`
==================================================
PHASE 2 RECONCILIATION UTILITY
==================================================
  `);

  await connectDB();

  const result = await reconcile(config);

  // Generate and save report
  const report = generateReport(result, config);
  fs.writeFileSync(config.outputFile, report, "utf-8");

  console.log(`\n[RECONCILIATION] Complete!`);
  console.log(`[RECONCILIATION] Total Records: ${result.totalRecords}`);
  console.log(`[RECONCILIATION] Matched: ${result.matched}`);
  console.log(`[RECONCILIATION] Mismatched: ${result.mismatched}`);
  console.log(`[RECONCILIATION] Inventory Only: ${result.inventoryOnly}`);
  console.log(`[RECONCILIATION] WarehouseInventory Only: ${result.warehouseOnly}`);

  const criticalCount = result.discrepancies.filter((d) => d.severity === "CRITICAL").length;
  console.log(`[RECONCILIATION] CRITICAL Issues: ${criticalCount}`);

  console.log(`\n[RECONCILIATION] Report saved to: ${config.outputFile}`);

  await mongoose.disconnect();
  process.exit(criticalCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[RECONCILIATION] Error:", err);
  mongoose.disconnect();
  process.exit(1);
});

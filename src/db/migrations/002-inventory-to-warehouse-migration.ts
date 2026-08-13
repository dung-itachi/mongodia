/**
 * ==================================================
 * MIGRATION: Inventory → WarehouseInventory Dual-Write Preparation
 * ==================================================
 *
 * Purpose:
 *   1. Map existing Inventory records to WarehouseInventory
 *   2. Create missing WarehouseInventory records from Inventory data
 *   3. Validate data integrity before Phase 2 dual-write activation
 *
 * THIS SCRIPT DOES NOT:
 *   - Remove Inventory records
 *   - Activate dual-write mode
 *   - Modify any business logic
 *
 * Usage:
 *   # Dry run (recommended first):
 *   npx ts-node --esm src/db/migrations/002-inventory-to-warehouse-migration.ts --dry-run
 *
 *   # Execute with detailed logging:
 *   npx ts-node --esm src/db/migrations/002-inventory-to-warehouse-migration.ts --verbose
 *
 *   # Execute migration:
 *   npx ts-node --esm src/db/migrations/002-inventory-to-warehouse-migration.ts
 *
 * Idempotent: Safe to run multiple times.
 */

import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import Inventory from "@/models/Inventory";
import WarehouseInventory from "@/models/WarehouseInventory";
import ProductVariant from "@/models/ProductVariant";

// ==================================================
// Configuration
// ==================================================

interface MigrationConfig {
  dryRun: boolean;
  verbose: boolean;
  batchSize: number;
}

function parseArgs(): MigrationConfig {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    verbose: args.includes("--verbose"),
    batchSize: 100,
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

interface MigrationResult {
  totalInventory: number;
  totalWarehouseInventory: number;
  processed: number;
  created: number;
  skipped: number;
  failed: number;
  exceptions: Array<{
    inventoryId: string;
    reason: string;
  }>;
}

// ==================================================
// Validation Functions
// ==================================================

/**
 * Validate that Inventory record can be mapped to WarehouseInventory
 */
async function validateInventoryRecord(
  record: InventoryRecord
): Promise<{ valid: boolean; reason?: string }> {
  // Check warehouseId exists
  if (!record.warehouseId) {
    return { valid: false, reason: "Missing warehouseId" };
  }

  // Check productVariantId exists
  if (!record.productVariantId) {
    return { valid: false, reason: "Missing productVariantId" };
  }

  // Check ProductVariant exists and get productId
  const variant = await ProductVariant.findById(record.productVariantId).lean();
  if (!variant) {
    return { valid: false, reason: `ProductVariant ${record.productVariantId} not found` };
  }

  // Check numeric fields are non-negative
  if (record.quantity < 0) {
    return { valid: false, reason: `Negative quantity: ${record.quantity}` };
  }
  if (record.reservedQuantity < 0) {
    return { valid: false, reason: `Negative reservedQuantity: ${record.reservedQuantity}` };
  }
  if (record.availableQuantity < 0) {
    return { valid: false, reason: `Negative availableQuantity: ${record.availableQuantity}` };
  }

  // Validate invariant: availableQuantity = quantity - reservedQuantity
  const expectedAvailable = record.quantity - record.reservedQuantity;
  if (Math.abs(record.availableQuantity - expectedAvailable) > 0.01) {
    return {
      valid: false,
      reason: `Invariant violation: availableQuantity (${record.availableQuantity}) != quantity - reservedQuantity (${expectedAvailable})`,
    };
  }

  return { valid: true };
}

/**
 * Check if corresponding WarehouseInventory record exists
 */
async function findWarehouseInventoryRecord(
  warehouseId: mongoose.Types.ObjectId,
  variantId: mongoose.Types.ObjectId
): Promise<{
  exists: boolean;
  record?: {
    _id: mongoose.Types.ObjectId;
    quantity: number;
    reservedQuantity: number;
    availableQuantity: number;
  };
}> {
  const wi = await WarehouseInventory.findOne({
    warehouseId,
    itemType: "PRODUCT",
    variantId,
    productId: null, // Legacy records may not have productId
    isActive: true,
  }).lean();

  if (!wi) {
    // Try without productId filter for records created by other means
    const wiAlt = await WarehouseInventory.findOne({
      warehouseId,
      itemType: "PRODUCT",
      variantId,
      isActive: true,
    }).lean();

    if (!wiAlt) {
      return { exists: false };
    }

    return {
      exists: true,
      record: wiAlt as unknown as {
        _id: mongoose.Types.ObjectId;
        quantity: number;
        reservedQuantity: number;
        availableQuantity: number;
      },
    };
  }

  return {
    exists: true,
    record: wi as unknown as {
      _id: mongoose.Types.ObjectId;
      quantity: number;
      reservedQuantity: number;
      availableQuantity: number;
    },
  };
}

// ==================================================
// Migration Logic
// ==================================================

async function migrateInventoryRecords(
  config: MigrationConfig
): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalInventory: 0,
    totalWarehouseInventory: 0,
    processed: 0,
    created: 0,
    skipped: 0,
    failed: 0,
    exceptions: [],
  };

  // Count totals
  result.totalInventory = await Inventory.countDocuments({});
  result.totalWarehouseInventory = await WarehouseInventory.countDocuments({ itemType: "PRODUCT" });

  if (config.verbose || config.dryRun) {
    console.log(`\n[MIGRATION] Starting migration analysis...`);
    console.log(`[MIGRATION] Total Inventory records: ${result.totalInventory}`);
    console.log(`[MIGRATION] Total WarehouseInventory (PRODUCT) records: ${result.totalWarehouseInventory}`);
    console.log(`[MIGRATION] Mode: ${config.dryRun ? "DRY RUN" : "LIVE"}`);
    console.log(`[MIGRATION] ----------------------------------------`);
  }

  // Get all Inventory records
  const cursor = Inventory.find({}).cursor({ batchSize: config.batchSize });
  let batchCount = 0;

  for await (const inventory of cursor) {
    batchCount++;
    result.processed++;

    const record = inventory as unknown as InventoryRecord;

    // Validate record
    const validation = await validateInventoryRecord(record);
    if (!validation.valid) {
      result.exceptions.push({
        inventoryId: record._id.toString(),
        reason: validation.reason || "Unknown validation error",
      });
      result.failed++;
      if (config.verbose) {
        console.log(`[MIGRATION] SKIP (invalid): ${record._id} - ${validation.reason}`);
      }
      continue;
    }

    // Get ProductVariant to find productId
    const variant = await ProductVariant.findById(record.productVariantId).lean();
    if (!variant) {
      result.exceptions.push({
        inventoryId: record._id.toString(),
        reason: `ProductVariant ${record.productVariantId} not found`,
      });
      result.failed++;
      continue;
    }

    // Check if WarehouseInventory record exists
    const existingWI = await findWarehouseInventoryRecord(
      record.warehouseId,
      record.productVariantId
    );

    if (existingWI.exists) {
      // Record exists - check for discrepancy
      if (config.verbose) {
        const wi = existingWI.record!;
        const diff = {
          inventoryQty: record.quantity,
          wiQty: wi.quantity,
          inventoryReserved: record.reservedQuantity,
          wiReserved: wi.reservedQuantity,
        };
        console.log(`[MIGRATION] EXISTS: ${record._id}`, diff);
      }
      result.skipped++;
    } else {
      // Need to create WarehouseInventory record
      if (!config.dryRun) {
        try {
          await WarehouseInventory.create({
            warehouseId: record.warehouseId,
            itemType: "PRODUCT",
            productId: (variant as { productId: mongoose.Types.ObjectId }).productId,
            variantId: record.productVariantId,
            giftId: null,
            quantity: record.quantity,
            availableQuantity: record.availableQuantity,
            reservedQuantity: record.reservedQuantity,
            inTransitQuantity: 0,
            shippedQuantity: 0,
            isActive: record.isActive,
          });
          result.created++;

          if (config.verbose) {
            console.log(`[MIGRATION] CREATED: ${record._id} -> WI`);
          }
        } catch (error) {
          result.exceptions.push({
            inventoryId: record._id.toString(),
            reason: `Failed to create WI: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
          result.failed++;
        }
      } else {
        // Dry run - just report what would be created
        if (config.verbose) {
          console.log(`[MIGRATION] WOULD CREATE: ${record._id} -> WI {
            warehouseId: ${record.warehouseId},
            variantId: ${record.productVariantId},
            quantity: ${record.quantity},
            reservedQuantity: ${record.reservedQuantity}
          }`);
        }
        result.created++;
      }
    }

    // Progress indicator
    if (batchCount % 100 === 0) {
      console.log(`[MIGRATION] Processed ${result.processed}/${result.totalInventory} records...`);
    }
  }

  return result;
}

// ==================================================
// Exception Report
// ==================================================

function generateExceptionReport(result: MigrationResult): void {
  if (result.exceptions.length === 0) {
    console.log(`\n[MIGRATION] No exceptions found.`);
    return;
  }

  console.log(`\n[MIGRATION] ========================================`);
  console.log(`[MIGRATION] EXCEPTION REPORT (${result.exceptions.length} records)`);
  console.log(`[MIGRATION] ========================================`);

  // Group by reason
  const grouped = new Map<string, string[]>();
  for (const ex of result.exceptions) {
    const existing = grouped.get(ex.reason) || [];
    existing.push(ex.inventoryId);
    grouped.set(ex.reason, existing);
  }

  for (const [reason, ids] of grouped) {
    console.log(`\n[MIGRATION] Reason: ${reason}`);
    console.log(`[MIGRATION] Affected records (${ids.length}):`);
    for (const id of ids.slice(0, 10)) {
      console.log(`[MIGRATION]   - ${id}`);
    }
    if (ids.length > 10) {
      console.log(`[MIGRATION]   ... and ${ids.length - 10} more`);
    }
  }
}

// ==================================================
// Main
// ==================================================

async function main() {
  const config = parseArgs();

  console.log(`\n[MIGRATION] ========================================`);
  console.log(`[MIGRATION] Inventory → WarehouseInventory Migration`);
  console.log(`[MIGRATION] ========================================`);

  if (config.dryRun) {
    console.log(`[MIGRATION] WARNING: DRY RUN MODE - No data will be modified!`);
  }

  await connectDB();

  const db = mongoose.connection.db;
  if (!db) throw new Error("No DB connection");

  const startTime = Date.now();
  const result = await migrateInventoryRecords(config);
  const duration = Date.now() - startTime;

  console.log(`\n[MIGRATION] ========================================`);
  console.log(`[MIGRATION] MIGRATION COMPLETE`);
  console.log(`[MIGRATION] ========================================`);
  console.log(`[MIGRATION] Duration: ${duration}ms`);
  console.log(`[MIGRATION] Total Inventory records: ${result.totalInventory}`);
  console.log(`[MIGRATION] Total WarehouseInventory (PRODUCT): ${result.totalWarehouseInventory}`);
  console.log(`[MIGRATION] Processed: ${result.processed}`);
  console.log(`[MIGRATION] Created: ${result.created}`);
  console.log(`[MIGRATION] Skipped (existing): ${result.skipped}`);
  console.log(`[MIGRATION] Failed: ${result.failed}`);
  console.log(`[MIGRATION] Exceptions: ${result.exceptions.length}`);

  if (config.dryRun) {
    console.log(`\n[MIGRATION] NOTE: This was a dry run. Run without --dry-run to execute.`);
    console.log(`[MIGRATION] Expected changes: ${result.created} new WarehouseInventory records`);
  }

  generateExceptionReport(result);

  // Summary of records that could not be migrated
  if (result.failed > 0) {
    console.log(`\n[MIGRATION] WARNING: ${result.failed} records could not be migrated.`);
    console.log(`[MIGRATION] These records have data integrity issues or missing dependencies.`);
    console.log(`[MIGRATION] Manual intervention required before proceeding with dual-write.`);
  }

  await mongoose.disconnect();
  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[MIGRATION] Error:", err);
  mongoose.disconnect();
  process.exit(1);
});

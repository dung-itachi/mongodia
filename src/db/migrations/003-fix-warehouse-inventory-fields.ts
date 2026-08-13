/**
 * ==================================================
 * MIGRATION: Fix Missing Fields in WarehouseInventory
 * ==================================================
 *
 * Purpose:
 *   Fix WarehouseInventory records that are missing required fields
 *   (availableQuantity, reservedQuantity) from legacy data.
 *
 * Architecture:
 *   - WarehouseInventory = SOURCE OF TRUTH
 *   - Inventory = LEGACY (not modified)
 *
 * Rules:
 *   1. reservedQuantity missing → set to 0
 *   2. availableQuantity missing → set to: quantity - reservedQuantity - inTransitQuantity
 *   3. PRE-VALIDATE all records before any update
 *   4. FAIL SAFELY - if ANY record fails validation, ABORT
 *   5. DO NOT overwrite valid existing values
 *   6. DO NOT modify Inventory collection
 *   7. DO NOT enable dual-write
 *   8. DO NOT modify schema
 *
 * Pre-Validation Checks:
 *   - quantity >= 0
 *   - reservedQuantity >= 0
 *   - inTransitQuantity >= 0
 *   - reservedQuantity <= quantity
 *   - inTransitQuantity <= quantity
 *   - calculated availableQuantity >= 0
 *
 * Usage:
 *   # Dry run (recommended first):
 *   npx dotenv-cli -e .env.local -- tsx src/db/migrations/003-fix-warehouse-inventory-fields.ts --dry-run
 *
 *   # Execute (requires approval):
 *   npx dotenv-cli -e .env.local -- tsx src/db/migrations/003-fix-warehouse-inventory-fields.ts
 *
 *   # Verbose:
 *   npx dotenv-cli -e .env.local -- tsx src/db/migrations/003-fix-warehouse-inventory-fields.ts --verbose --dry-run
 *
 * Idempotent: Safe to run multiple times.
 *   - Run 1: Updates 10 records (if all missing)
 *   - Run 2: Updates 0 records (already fixed)
 */

import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import WarehouseInventory from "@/models/WarehouseInventory";

// ==================================================
// Configuration
// ==================================================

interface CleanupConfig {
  dryRun: boolean;
  verbose: boolean;
  batchSize: number;
}

function parseArgs(): CleanupConfig {
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

interface WarehouseInventoryDoc {
  _id: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  itemType: "PRODUCT" | "GIFT";
  productId?: mongoose.Types.ObjectId | null;
  variantId?: mongoose.Types.ObjectId | null;
  giftId?: mongoose.Types.ObjectId | null;
  quantity: number;
  reservedQuantity?: number;
  availableQuantity?: number;
  inTransitQuantity?: number;
  shippedQuantity?: number;
  isActive: boolean;
}

interface ValidationError {
  _id: string;
  reason: string;
}

interface RecordChange {
  _id: string;
  itemType: string;
  warehouseId: string;
  variantId?: string;
  giftId?: string;
  changes: Record<string, { before: unknown; after: number }>;
}

interface CleanupResult {
  totalRecords: number;
  recordsWithReservedMissing: number;
  recordsWithAvailableMissing: number;
  recordsWithBothMissing: number;
  recordsAlreadyComplete: number;
  recordsWillUpdate: number;
  recordsUpdated: number;
  validationErrors: ValidationError[];
  changes: RecordChange[];
}

// ==================================================
// Validation Functions
// ==================================================

/**
 * Check if a field is missing (undefined or null)
 */
function isFieldMissing(value: unknown): boolean {
  return value === undefined || value === null;
}

/**
 * Validate source data BEFORE calculating derived values.
 * Returns array of validation errors.
 */
function validateSourceData(doc: WarehouseInventoryDoc): ValidationError[] {
  const errors: ValidationError[] = [];
  const id = doc._id.toString();

  // Get field values with defaults
  const quantity = doc.quantity;
  const reservedQuantity = doc.reservedQuantity ?? 0;
  const inTransitQuantity = doc.inTransitQuantity ?? 0;

  // Check 1: quantity >= 0
  if (typeof quantity !== "number" || isNaN(quantity)) {
    errors.push({ _id: id, reason: `quantity is not a valid number: ${quantity}` });
    return errors; // Can't continue if quantity is invalid
  }
  if (quantity < 0) {
    errors.push({ _id: id, reason: `quantity (${quantity}) < 0` });
  }

  // Check 2: reservedQuantity >= 0
  if (typeof reservedQuantity !== "number" || isNaN(reservedQuantity)) {
    errors.push({ _id: id, reason: `reservedQuantity is not a valid number: ${reservedQuantity}` });
  } else if (reservedQuantity < 0) {
    errors.push({ _id: id, reason: `reservedQuantity (${reservedQuantity}) < 0` });
  }

  // Check 3: inTransitQuantity >= 0
  if (typeof inTransitQuantity !== "number" || isNaN(inTransitQuantity)) {
    errors.push({ _id: id, reason: `inTransitQuantity is not a valid number: ${inTransitQuantity}` });
  } else if (inTransitQuantity < 0) {
    errors.push({ _id: id, reason: `inTransitQuantity (${inTransitQuantity}) < 0` });
  }

  // Check 4: reservedQuantity <= quantity
  if (reservedQuantity > quantity) {
    errors.push({ _id: id, reason: `reservedQuantity (${reservedQuantity}) > quantity (${quantity})` });
  }

  // Check 5: inTransitQuantity <= quantity
  if (inTransitQuantity > quantity) {
    errors.push({ _id: id, reason: `inTransitQuantity (${inTransitQuantity}) > quantity (${quantity})` });
  }

  return errors;
}

/**
 * Validate calculated availableQuantity AFTER calculation.
 */
function validateCalculatedAvailable(
  doc: WarehouseInventoryDoc,
  calculatedAvailable: number
): ValidationError[] {
  const errors: ValidationError[] = [];
  const id = doc._id.toString();

  // Check 6: availableQuantity >= 0
  if (calculatedAvailable < 0) {
    errors.push({
      _id: id,
      reason: `calculated availableQuantity (${calculatedAvailable}) < 0. Cannot fix: source data has reservedQuantity + inTransitQuantity > quantity`,
    });
  }

  return errors;
}

// ==================================================
// Cleanup Logic
// ==================================================

async function fixWarehouseInventoryFields(
  config: CleanupConfig
): Promise<CleanupResult> {
  const result: CleanupResult = {
    totalRecords: 0,
    recordsWithReservedMissing: 0,
    recordsWithAvailableMissing: 0,
    recordsWithBothMissing: 0,
    recordsAlreadyComplete: 0,
    recordsWillUpdate: 0,
    recordsUpdated: 0,
    validationErrors: [],
    changes: [],
  };

  // Get all WarehouseInventory records
  const records = await WarehouseInventory.find({}).lean();

  if (config.verbose || config.dryRun) {
    console.log(`\n[MIGRATION] ========================================`);
    console.log(`[MIGRATION] WarehouseInventory Field Fix`);
    console.log(`[MIGRATION] ========================================`);
    console.log(`[MIGRATION] Total WarehouseInventory records: ${records.length}`);
    console.log(`[MIGRATION] Mode: ${config.dryRun ? "DRY RUN" : "LIVE"}`);
    console.log(`[MIGRATION] ========================================`);
  }

  result.totalRecords = records.length;

  // ========================================
  // PHASE 1: Scan and Validate ALL Records
  // ========================================

  if (config.verbose || config.dryRun) {
    console.log(`\n[MIGRATION] PHASE 1: Scanning and validating all records...`);
  }

  const recordsToUpdate: Array<{
    doc: WarehouseInventoryDoc;
    reservedMissing: boolean;
    availableMissing: boolean;
    reservedValue: number;
    availableValue: number;
  }> = [];

  for (const record of records) {
    const doc = record as unknown as WarehouseInventoryDoc;
    const id = doc._id.toString();

    // Check if reservedQuantity is missing
    const reservedMissing = isFieldMissing(doc.reservedQuantity);
    // Check if availableQuantity is missing
    const availableMissing = isFieldMissing(doc.availableQuantity);

    // Track statistics
    if (reservedMissing) result.recordsWithReservedMissing++;
    if (availableMissing) result.recordsWithAvailableMissing++;
    if (reservedMissing && availableMissing) result.recordsWithBothMissing++;

    // Skip if no changes needed
    if (!reservedMissing && !availableMissing) {
      result.recordsAlreadyComplete++;
      if (config.verbose) {
        console.log(`[MIGRATION] SKIP (complete): ${id} - ${doc.itemType}`);
      }
      continue;
    }

    // ========================================
    // PHASE 2: Pre-Validate BEFORE Update
    // ========================================

    if (config.verbose || config.dryRun) {
      console.log(`[MIGRATION] Validating: ${id} - ${doc.itemType}`);
    }

    // Validate source data
    const sourceErrors = validateSourceData(doc);
    if (sourceErrors.length > 0) {
      result.validationErrors.push(...sourceErrors);
      console.error(`[MIGRATION] ❌ VALIDATION FAILED for ${id}:`);
      sourceErrors.forEach((e) => console.error(`  - ${e.reason}`));
      continue;
    }

    // Calculate values
    const quantity = doc.quantity;
    const reservedValue = reservedMissing ? 0 : (doc.reservedQuantity as number);
    const inTransitValue = doc.inTransitQuantity ?? 0;
    const availableValue = quantity - reservedValue - inTransitValue;

    // Validate calculated availableQuantity
    const calcErrors = validateCalculatedAvailable(doc, availableValue);
    if (calcErrors.length > 0) {
      result.validationErrors.push(...calcErrors);
      console.error(`[MIGRATION] ❌ CALCULATION FAILED for ${id}:`);
      calcErrors.forEach((e) => console.error(`  - ${e.reason}`));
      continue;
    }

    // Record passes validation - add to update queue
    recordsToUpdate.push({
      doc,
      reservedMissing,
      availableMissing,
      reservedValue,
      availableValue,
    });
    result.recordsWillUpdate++;

    if (config.verbose || config.dryRun) {
      console.log(`[MIGRATION] ✓ Validation passed for ${id}`);
      console.log(`  quantity=${quantity}, reserved=${reservedValue}, inTransit=${inTransitValue}`);
      console.log(`  calculated availableQuantity=${availableValue}`);
    }
  }

  // ========================================
  // FAIL SAFELY: If any validation errors, ABORT
  // ========================================

  if (result.validationErrors.length > 0) {
    console.error(`\n[MIGRATION] ========================================`);
    console.error(`[MIGRATION] ❌ MIGRATION ABORTED`);
    console.error(`[MIGRATION] ========================================`);
    console.error(`[MIGRATION] ${result.validationErrors.length} records failed validation.`);
    console.error(`[MIGRATION] Cannot proceed with cleanup due to invalid source data.`);
    console.error(`[MIGRATION] Please fix the following records manually:`);
    result.validationErrors.forEach((e) => {
      console.error(`  - ${e._id}: ${e.reason}`);
    });

    await mongoose.disconnect();
    process.exit(1);
  }

  // ========================================
  // PHASE 3: Execute Updates
  // ========================================

  if (recordsToUpdate.length === 0) {
    if (config.verbose || config.dryRun) {
      console.log(`\n[MIGRATION] All records are already complete. Nothing to do.`);
    }
    return result;
  }

  if (config.verbose || config.dryRun) {
    console.log(`\n[MIGRATION] PHASE 3: ${recordsToUpdate.length} records will be updated`);
    console.log(`[MIGRATION] ========================================`);
  }

  // Prepare changes for reporting
  for (const update of recordsToUpdate) {
    const changes: Record<string, { before: unknown; after: number }> = {};

    if (update.reservedMissing) {
      changes.reservedQuantity = { before: "MISSING", after: 0 };
    }
    if (update.availableMissing) {
      changes.availableQuantity = { before: "MISSING", after: update.availableValue };
    }

    result.changes.push({
      _id: update.doc._id.toString(),
      itemType: update.doc.itemType,
      warehouseId: update.doc.warehouseId.toString(),
      variantId: update.doc.variantId?.toString(),
      giftId: update.doc.giftId?.toString(),
      changes,
    });
  }

  // Execute updates (outside transaction for dry-run)
  if (config.dryRun) {
    if (config.verbose) {
      console.log(`\n[MIGRATION] DRY RUN - Would update ${recordsToUpdate.length} records:`);
      result.changes.forEach((change) => {
        console.log(`  ${change._id} (${change.itemType}):`);
        Object.entries(change.changes).forEach(([field, { before, after }]) => {
          console.log(`    ${field}: ${before} → ${after}`);
        });
      });
    }
    result.recordsUpdated = recordsToUpdate.length;
    return result;
  }

  // ========================================
  // LIVE MODE: Execute with Transaction
  // ========================================

  if (config.verbose) {
    console.log(`\n[MIGRATION] Executing updates in transaction...`);
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    for (const update of recordsToUpdate) {
      const updateFields: Record<string, number> = {};

      if (update.reservedMissing) {
        updateFields.reservedQuantity = 0;
      }
      if (update.availableMissing) {
        updateFields.availableQuantity = update.availableValue;
      }

      await WarehouseInventory.updateOne({ _id: update.doc._id }, { $set: updateFields }).session(session);
      result.recordsUpdated++;

      if (config.verbose) {
        console.log(`[MIGRATION] UPDATED: ${update.doc._id.toString()}`);
      }
    }

    await session.commitTransaction();

    if (config.verbose) {
      console.log(`[MIGRATION] Transaction committed successfully!`);
    }
  } catch (error) {
    await session.abortTransaction();
    console.error(`[MIGRATION] Transaction aborted due to error: ${error}`);
    result.validationErrors.push({
      _id: "TRANSACTION",
      reason: `Transaction failed and was rolled back: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
    throw error;
  } finally {
    session.endSession();
  }

  return result;
}

// ==================================================
// Main
// ==================================================

async function main() {
  const config = parseArgs();

  console.log(`
==================================================
MIGRATION 003: Fix WarehouseInventory Fields
==================================================
`);

  if (config.dryRun) {
    console.log(`⚠️  WARNING: DRY RUN MODE - No data will be modified!`);
    console.log(`\n`);
  }

  try {
    await connectDB();

    const db = mongoose.connection.db;
    if (!db) throw new Error("No DB connection");

    // Check replica set status for transaction support
    const isReplSet = db.admin().command({ replSetGetStatus: 1 }).then(() => true).catch(() => false);
    const supportsTransactions = await isReplSet;

    if (config.verbose) {
      console.log(`[MIGRATION] MongoDB transaction support: ${supportsTransactions ? "ENABLED" : "DISABLED"}`);
    }

    const startTime = Date.now();
    const result = await fixWarehouseInventoryFields(config);
    const duration = Date.now() - startTime;

    // Print summary
    console.log(`
==================================================
MIGRATION SUMMARY
==================================================
Duration: ${duration}ms

Records:
  Total: ${result.totalRecords}
  Already complete: ${result.recordsAlreadyComplete}
  Will update: ${result.recordsWillUpdate}
    - reservedQuantity missing: ${result.recordsWithReservedMissing}
    - availableQuantity missing: ${result.recordsWithAvailableMissing}
    - Both missing: ${result.recordsWithBothMissing}

Validation:
  Errors: ${result.validationErrors.length}
  Updated: ${result.recordsUpdated}
`);

    // Print changes
    if (result.changes.length > 0 && (config.verbose || config.dryRun)) {
      console.log(`
==================================================
CHANGES TO APPLY
==================================================`);
      for (const change of result.changes) {
        console.log(`\n${change._id} (${change.itemType}):`);
        Object.entries(change.changes).forEach(([field, { before, after }]) => {
          console.log(`  ${field}: ${before} → ${after}`);
        });
      }
    }

    // Print validation errors
    if (result.validationErrors.length > 0) {
      console.log(`
==================================================
VALIDATION ERRORS
==================================================`);
      result.validationErrors.forEach((e) => {
        console.log(`❌ ${e._id}: ${e.reason}`);
      });
    }

    if (config.dryRun) {
      console.log(`
==================================================
DRY RUN COMPLETE
==================================================
${result.recordsWillUpdate} records would be updated.

To execute this migration:
  npx dotenv-cli -e .env.local -- tsx src/db/migrations/003-fix-warehouse-inventory-fields.ts
`);
    } else {
      console.log(`
==================================================
MIGRATION COMPLETE
==================================================
${result.recordsUpdated} records updated successfully.
`);
    }

    await mongoose.disconnect();

    // Exit with error code if validation errors
    if (result.validationErrors.length > 0) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error(`\n[MIGRATION] Fatal error: ${error}`);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();

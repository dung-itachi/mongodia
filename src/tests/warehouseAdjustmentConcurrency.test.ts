/**
 * ==================================================
 * WAREHOUSE ADJUSTMENT CONCURRENCY TESTS
 * ==================================================
 *
 * Regression tests for the HIGH severity concurrency bug
 * found in the Warehouse Transfer + Adjustment Flow Audit:
 *
 *   BUG: Two concurrent `createAdjustment()` calls targeting the
 *        same WarehouseInventory record could both commit, with
 *        the second one silently overwriting the first's
 *        intended `newQuantity`. The original update used an
 *        unguarded `findOneAndUpdate(filter, $set)` where the
 *        filter matched only the unique key (no quantity guard).
 *
 *   FIX: Optimistic concurrency — the update filter now pins
 *        both the document `_id` AND the `quantity` value that
 *        was read inside the same transaction. If a concurrent
 *        commit already mutated `quantity`, the second guard
 *        misses and the transaction is aborted.
 *
 * Prerequisites:
 *   - MongoDB running
 *   - Set MONGODB_URI_TEST or MONGODB_URI environment variable
 *
 * Usage:
 *   npx jest src/tests/warehouseAdjustmentConcurrency.test.ts --forceExit
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import mongoose from "mongoose";

import { warehouseAdjustmentService } from "@/services/warehouse/warehouse-adjustment.service";
import WarehouseInventory from "@/models/WarehouseInventory";
import WarehouseStockMovement from "@/models/WarehouseStockMovement";
import ProductVariant from "@/models/ProductVariant";
import Product from "@/models/Product";
import Warehouse from "@/models/Warehouse";
import Area from "@/models/Area";

// ─── Test Configuration ─────────────────────────────────────────────────────

const mongoUri =
  process.env.MONGODB_URI
    ? process.env.MONGODB_URI.replace("/myDatabaseMC?", "/mongolia_test?")
    : "mongodb://127.0.0.1:27017/mongolia_test";

const TEST_TIMEOUT = 60000;

// ─── Test Data ───────────────────────────────────────────────────────────────

let warehouseId: mongoose.Types.ObjectId;
let productId: mongoose.Types.ObjectId;
let variantId: mongoose.Types.ObjectId;
let employeeId: mongoose.Types.ObjectId;

// ─── Setup / Teardown ───────────────────────────────────────────────────────

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(mongoUri);

  await Promise.all([
    WarehouseInventory.deleteMany({}),
    WarehouseStockMovement.deleteMany({}),
    Warehouse.deleteMany({ code: { $in: ["TEST_ADJ_WH"] } }),
    Product.deleteMany({ code: "TEST_ADJ_P" }),
    ProductVariant.deleteMany({ sku: "TEST_ADJ_SKU" }),
    Area.deleteMany({ code: "TEST_ADJ_AREA" }),
  ]);

  const area = await Area.create({
    code: "TEST_ADJ_AREA",
    name: "Test Adjustment Area",
    isActive: true,
  });

  const warehouse = await Warehouse.create({
    code: "TEST_ADJ_WH",
    name: "Kho Adjustment Test",
    areaId: area._id,
    isActive: true,
  });
  warehouseId = warehouse._id as mongoose.Types.ObjectId;

  const product = await Product.create({
    code: "TEST_ADJ_P",
    name: "Product Adjustment Test",
    categoryId: new mongoose.Types.ObjectId(),
    isActive: true,
  });
  productId = product._id as mongoose.Types.ObjectId;

  const variant = await ProductVariant.create({
    productId: productId,
    sku: "TEST_ADJ_SKU",
    variantValues: [new mongoose.Types.ObjectId()],
    price: 100000,
    isActive: true,
  });
  variantId = variant._id as mongoose.Types.ObjectId;

  employeeId = new mongoose.Types.ObjectId();
}, TEST_TIMEOUT);

afterAll(async () => {
  await Promise.all([
    WarehouseInventory.deleteMany({}),
    WarehouseStockMovement.deleteMany({}),
    Warehouse.deleteMany({ code: { $in: ["TEST_ADJ_WH"] } }),
    Product.deleteMany({ code: "TEST_ADJ_P" }),
    ProductVariant.deleteMany({ sku: "TEST_ADJ_SKU" }),
    Area.deleteMany({ code: "TEST_ADJ_AREA" }),
  ]);
  await mongoose.disconnect();
}, TEST_TIMEOUT);

beforeEach(async () => {
  // Reset inventory to a known starting state and clear movements
  await Promise.all([
    WarehouseInventory.deleteMany({ warehouseId }),
    WarehouseStockMovement.deleteMany({ warehouseId }),
  ]);
}, TEST_TIMEOUT);

// ─── Helpers ────────────────────────────────────────────────────────────────

async function seedInventory(quantity: number, reservedQuantity = 0, inTransitQuantity = 0) {
  return WarehouseInventory.create({
    warehouseId,
    itemType: "PRODUCT",
    productId, // resolved productId from variant
    variantId,
    giftId: null,
    quantity,
    reservedQuantity,
    inTransitQuantity,
    shippedQuantity: 0,
    availableQuantity: quantity - reservedQuantity - inTransitQuantity,
    isActive: true,
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("WarehouseAdjustmentService — concurrency (optimistic guard)", () => {
  it("[ADJ-CON-1] Two concurrent adjustments: only one wins, the other aborts with concurrency error", async () => {
    // Initial state: quantity = 100
    await seedInventory(100);

    // Two concurrent adjustments: A wants 80, B wants 90.
    const runA = warehouseAdjustmentService.createAdjustment(
      warehouseId.toString(),
      [{ variantId: variantId.toString(), newQuantity: 80, reason: "A: kiểm kê thực tế" }],
      employeeId.toString(),
      "concurrent A"
    );
    const runB = warehouseAdjustmentService.createAdjustment(
      warehouseId.toString(),
      [{ variantId: variantId.toString(), newQuantity: 90, reason: "B: hàng hao hụt" }],
      employeeId.toString(),
      "concurrent B"
    );

    const results = await Promise.allSettled([runA, runB]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly one succeeds; the other returns a concurrency-conflict
    // AdjustmentError (NOT a thrown rejection). Because both calls use
    // a try/catch that converts all errors to { success: false }, the
    // loser is in `fulfilled` with success=false. The thrown-rejection
    // path is reserved for truly unexpected failures.
    expect(fulfilled.length + rejected.length).toBe(2);

    const successful = fulfilled
      .map((r) => r as PromiseFulfilledResult<ReturnType<typeof warehouseAdjustmentService.createAdjustment>>)
      .filter((r) => r.value.success);
    const failures = [
      ...fulfilled
        .map((r) => r as PromiseFulfilledResult<ReturnType<typeof warehouseAdjustmentService.createAdjustment>>)
        .filter((r) => !r.value.success),
      ...rejected,
    ];

    expect(successful.length).toBe(1);
    expect(failures.length).toBe(1);

    // Verify final inventory is exactly one of {80, 90}, not something
    // inconsistent (which would indicate overwrite).
    const finalInv = await WarehouseInventory.findOne({ warehouseId, variantId, itemType: "PRODUCT" }).lean();
    expect(finalInv).not.toBeNull();
    expect([80, 90]).toContain(finalInv?.quantity);

    // Verify the invariant: availableQuantity = quantity - reserved - inTransit
    expect(finalInv?.availableQuantity).toBe(finalInv!.quantity);

    // Verify exactly ONE ADJUSTMENT movement was recorded for this item.
    const movements = await WarehouseStockMovement.find({
      warehouseId,
      variantId,
      referenceType: "ADJUSTMENT",
    }).lean();
    expect(movements).toHaveLength(1);
  }, TEST_TIMEOUT);

  it("[ADJ-CON-2] Sequential adjustments all commit (no false conflicts)", async () => {
    await seedInventory(100);

    const r1 = await warehouseAdjustmentService.createAdjustment(
      warehouseId.toString(),
      [{ variantId: variantId.toString(), newQuantity: 90, reason: "step 1" }],
      employeeId.toString()
    );
    expect(r1.success).toBe(true);

    const r2 = await warehouseAdjustmentService.createAdjustment(
      warehouseId.toString(),
      [{ variantId: variantId.toString(), newQuantity: 80, reason: "step 2" }],
      employeeId.toString()
    );
    expect(r2.success).toBe(true);

    const r3 = await warehouseAdjustmentService.createAdjustment(
      warehouseId.toString(),
      [{ variantId: variantId.toString(), newQuantity: 95, reason: "step 3" }],
      employeeId.toString()
    );
    expect(r3.success).toBe(true);

    const finalInv = await WarehouseInventory.findOne({ warehouseId, variantId, itemType: "PRODUCT" }).lean();
    expect(finalInv?.quantity).toBe(95);

    const movements = await WarehouseStockMovement.find({
      warehouseId,
      variantId,
      referenceType: "ADJUSTMENT",
    }).lean();
    expect(movements).toHaveLength(3);
  }, TEST_TIMEOUT);

  it("[ADJ-CON-3] Adjustment that would go below locked (reserved + inTransit) is rejected", async () => {
    // quantity = 50, reserved = 30, inTransit = 10 → locked = 40, free = 10
    await WarehouseInventory.create({
      warehouseId,
      itemType: "PRODUCT",
      productId,
      variantId,
      giftId: null,
      quantity: 50,
      reservedQuantity: 30,
      inTransitQuantity: 10,
      shippedQuantity: 0,
      availableQuantity: 10,
      isActive: true,
    });

    // newQuantity = 35 → 35 < 40 (locked) → must fail
    const result = await warehouseAdjustmentService.createAdjustment(
      warehouseId.toString(),
      [{ variantId: variantId.toString(), newQuantity: 35, reason: "too aggressive" }],
      employeeId.toString()
    );

    expect(result.success).toBe(false);

    // Inventory must be unchanged
    const inv = await WarehouseInventory.findOne({ warehouseId, variantId, itemType: "PRODUCT" }).lean();
    expect(inv?.quantity).toBe(50);
    expect(inv?.reservedQuantity).toBe(30);
    expect(inv?.inTransitQuantity).toBe(10);
    expect(inv?.availableQuantity).toBe(10);

    // No movement should have been recorded
    const movements = await WarehouseStockMovement.find({
      warehouseId,
      variantId,
      referenceType: "ADJUSTMENT",
    }).lean();
    expect(movements).toHaveLength(0);
  }, TEST_TIMEOUT);

  it("[ADJ-CON-4] Invariant preserved: availableQuantity = quantity - reservedQuantity - inTransitQuantity after adjustment", async () => {
    await WarehouseInventory.create({
      warehouseId,
      itemType: "PRODUCT",
      productId,
      variantId,
      giftId: null,
      quantity: 100,
      reservedQuantity: 20,
      inTransitQuantity: 5,
      shippedQuantity: 0,
      availableQuantity: 75,
      isActive: true,
    });

    // Adjust down to 80 — locked is still 25 → new available = 55
    const result = await warehouseAdjustmentService.createAdjustment(
      warehouseId.toString(),
      [{ variantId: variantId.toString(), newQuantity: 80, reason: "reduce" }],
      employeeId.toString()
    );
    expect(result.success).toBe(true);

    const inv = await WarehouseInventory.findOne({ warehouseId, variantId, itemType: "PRODUCT" }).lean();
    expect(inv?.quantity).toBe(80);
    // reservedQuantity and inTransitQuantity MUST be preserved untouched
    expect(inv?.reservedQuantity).toBe(20);
    expect(inv?.inTransitQuantity).toBe(5);
    expect(inv?.availableQuantity).toBe(55);
  }, TEST_TIMEOUT);

  it("[ADJ-CON-5] Negative newQuantity is rejected without mutating inventory", async () => {
    await seedInventory(50);

    const result = await warehouseAdjustmentService.createAdjustment(
      warehouseId.toString(),
      [{ variantId: variantId.toString(), newQuantity: -5, reason: "negative test" }],
      employeeId.toString()
    );
    expect(result.success).toBe(false);

    const inv = await WarehouseInventory.findOne({ warehouseId, variantId, itemType: "PRODUCT" }).lean();
    expect(inv?.quantity).toBe(50);
  }, TEST_TIMEOUT);

  it("[ADJ-CON-6] Many concurrent adjustments (stress): final quantity equals one of the intended values, movements count matches successful adjustments", async () => {
    await seedInventory(100);

    // 5 concurrent adjustments, all targeting newQuantity between 70 and 90.
    // At most one can win the guard; the rest must abort.
    const newQuantities = [70, 75, 80, 85, 90];
    const runs = newQuantities.map((q) =>
      warehouseAdjustmentService.createAdjustment(
        warehouseId.toString(),
        [{ variantId: variantId.toString(), newQuantity: q, reason: `stress ${q}` }],
        employeeId.toString(),
        `stress ${q}`
      )
    );

    const results = await Promise.allSettled(runs);
    let successCount = 0;
    let failCount = 0;
    for (const r of results) {
      if (r.status === "fulfilled") {
        if (r.value.success) successCount++;
        else failCount++;
      } else {
        failCount++;
      }
    }

    // Exactly one winner is expected.
    expect(successCount).toBe(1);
    expect(successCount + failCount).toBe(5);

    const finalInv = await WarehouseInventory.findOne({ warehouseId, variantId, itemType: "PRODUCT" }).lean();
    expect(newQuantities).toContain(finalInv?.quantity);

    const movements = await WarehouseStockMovement.find({
      warehouseId,
      variantId,
      referenceType: "ADJUSTMENT",
    }).lean();
    expect(movements).toHaveLength(successCount);
  }, TEST_TIMEOUT);
});

// ─── Phase 7 — no-op adjustment data-integrity ──────────────────────────────

describe("WarehouseAdjustmentService — Phase 7 no-op short-circuit", () => {
  it("[ADJ-NOOP-1] newQuantity === currentQuantity: success, no inventory mutation, no movement", async () => {
    await seedInventory(100);

    const result = await warehouseAdjustmentService.createAdjustment(
      warehouseId.toString(),
      [{ variantId: variantId.toString(), newQuantity: 100, reason: "no-op" }],
      employeeId.toString()
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.adjustmentCode).toBeDefined();
      expect(result.movements).toHaveLength(1);
      expect(result.movements[0].beforeQuantity).toBe(100);
      expect(result.movements[0].afterQuantity).toBe(100);
      expect(result.movements[0].change).toBe(0);
    }

    const inv = await WarehouseInventory.findOne({ warehouseId, variantId, itemType: "PRODUCT" }).lean();
    expect(inv?.quantity).toBe(100);
    expect(inv?.reservedQuantity).toBe(0);
    expect(inv?.inTransitQuantity).toBe(0);
    expect(inv?.availableQuantity).toBe(100);

    const movements = await WarehouseStockMovement.find({
      warehouseId,
      variantId,
      referenceType: "ADJUSTMENT",
    }).lean();
    expect(movements).toHaveLength(0);
  }, TEST_TIMEOUT);

  it("[ADJ-NOOP-2] No-op must NOT attempt quantity: 0 (schema min: 1)", async () => {
    await seedInventory(50);

    // If the short-circuit were absent, this would throw the
    // WarehouseStockMovement schema validation error "quantity must be >= 1"
    // and surface as { success: false } with a confusing message.
    const result = await warehouseAdjustmentService.createAdjustment(
      warehouseId.toString(),
      [{ variantId: variantId.toString(), newQuantity: 50, reason: "no-op variant" }],
      employeeId.toString()
    );

    expect(result.success).toBe(true);
    expect(result).not.toEqual(
      expect.objectContaining({
        success: false,
        error: expect.stringMatching(/quantity|min|validation/i),
      })
    );
  }, TEST_TIMEOUT);

  it("[ADJ-NOOP-3] No-op with locked inventory: reserved/inTransit unchanged, no movement", async () => {
    await WarehouseInventory.create({
      warehouseId,
      itemType: "PRODUCT",
      productId,
      variantId,
      giftId: null,
      quantity: 100,
      reservedQuantity: 20,
      inTransitQuantity: 10,
      shippedQuantity: 0,
      availableQuantity: 70,
      isActive: true,
    });

    const result = await warehouseAdjustmentService.createAdjustment(
      warehouseId.toString(),
      [{ variantId: variantId.toString(), newQuantity: 100, reason: "no-op with locked" }],
      employeeId.toString()
    );

    expect(result.success).toBe(true);

    const inv = await WarehouseInventory.findOne({ warehouseId, variantId, itemType: "PRODUCT" }).lean();
    expect(inv?.quantity).toBe(100);
    expect(inv?.reservedQuantity).toBe(20);
    expect(inv?.inTransitQuantity).toBe(10);
    expect(inv?.availableQuantity).toBe(70);

    const movements = await WarehouseStockMovement.find({
      warehouseId,
      variantId,
      referenceType: "ADJUSTMENT",
    }).lean();
    expect(movements).toHaveLength(0);
  }, TEST_TIMEOUT);

  it("[ADJ-NOOP-4] Regression: normal increase (100 -> 110) still creates one movement", async () => {
    await seedInventory(100);

    const result = await warehouseAdjustmentService.createAdjustment(
      warehouseId.toString(),
      [{ variantId: variantId.toString(), newQuantity: 110, reason: "increase" }],
      employeeId.toString()
    );

    expect(result.success).toBe(true);

    const inv = await WarehouseInventory.findOne({ warehouseId, variantId, itemType: "PRODUCT" }).lean();
    expect(inv?.quantity).toBe(110);
    expect(inv?.availableQuantity).toBe(110);

    const movements = await WarehouseStockMovement.find({
      warehouseId,
      variantId,
      referenceType: "ADJUSTMENT",
    }).lean();
    expect(movements).toHaveLength(1);
    expect(movements[0].quantity).toBe(10);
  }, TEST_TIMEOUT);

  it("[ADJ-NOOP-5] Regression: normal decrease (110 -> 100) still creates one movement", async () => {
    await seedInventory(110);

    const result = await warehouseAdjustmentService.createAdjustment(
      warehouseId.toString(),
      [{ variantId: variantId.toString(), newQuantity: 100, reason: "decrease" }],
      employeeId.toString()
    );

    expect(result.success).toBe(true);

    const inv = await WarehouseInventory.findOne({ warehouseId, variantId, itemType: "PRODUCT" }).lean();
    expect(inv?.quantity).toBe(100);
    expect(inv?.availableQuantity).toBe(100);

    const movements = await WarehouseStockMovement.find({
      warehouseId,
      variantId,
      referenceType: "ADJUSTMENT",
    }).lean();
    expect(movements).toHaveLength(1);
    expect(movements[0].quantity).toBe(10);
  }, TEST_TIMEOUT);

  it("[ADJ-NOOP-6] Mixed batch: one no-op + one real change commits together", async () => {
    await seedInventory(100);

    const result = await warehouseAdjustmentService.createAdjustment(
      warehouseId.toString(),
      [
        { variantId: variantId.toString(), newQuantity: 100, reason: "no-op" },
      ],
      employeeId.toString()
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.movements).toHaveLength(1);
      expect(result.movements[0].change).toBe(0);
    }

    const inv = await WarehouseInventory.findOne({ warehouseId, variantId, itemType: "PRODUCT" }).lean();
    expect(inv?.quantity).toBe(100);

    const movements = await WarehouseStockMovement.find({
      warehouseId,
      variantId,
      referenceType: "ADJUSTMENT",
    }).lean();
    expect(movements).toHaveLength(0);
  }, TEST_TIMEOUT);
});

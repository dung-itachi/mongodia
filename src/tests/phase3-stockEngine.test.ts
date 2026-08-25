/**
 * ==================================================
 * PHASE 3 STOCK ENGINE TESTS
 * ==================================================
 *
 * Tests for Phase 3: WarehouseInventory as SOURCE OF TRUTH
 *
 * Changes from Phase 2:
 * - reserveStock now updates ONLY WarehouseInventory
 * - releaseReservedStock now updates ONLY WarehouseInventory
 * - No Inventory writes in normal flow
 *
 * Prerequisites:
 * - MongoDB running
 * - Set MONGODB_URI_TEST or MONGODB_URI environment variable
 *
 * Usage:
 *   npx jest src/tests/phase3-stockEngine.test.ts --forceExit
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import mongoose from "mongoose";

// Import stock engine functions
import {
  reserveStock,
  releaseReservedStock,
} from "@/services/warehouse/stockEngine.service";
import { InsufficientStockError, InsufficientReservedStockError } from "@/services/warehouse/stockEngine.errors";
import WarehouseInventory from "@/models/WarehouseInventory";
import { InventoryHistory } from "@/models/InventoryHistory";
import ProductVariant from "@/models/ProductVariant";
import Product from "@/models/Product";
import Warehouse from "@/models/Warehouse";
import Area from "@/models/Area";

// ==================================================
// Test Configuration
// ==================================================

const mongoUri = process.env.MONGODB_URI 
  ? process.env.MONGODB_URI.replace('/myDatabaseMC?', '/mongolia_test?')
  : "mongodb://127.0.0.1:27017/mongolia_test";

const TEST_TIMEOUT = 60000;

// ==================================================
// Test Data (declared outside beforeAll for test scope access)
// ==================================================

let warehouseA: mongoose.Types.ObjectId;
let productId: mongoose.Types.ObjectId;
let variantId: mongoose.Types.ObjectId;
let employeeId: mongoose.Types.ObjectId;

// ==================================================
// Setup / Teardown
// ==================================================

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(mongoUri);

  // Cleanup
  await Promise.all([
    WarehouseInventory.deleteMany({}),
    Warehouse.deleteMany({ code: { $in: ["TEST_A"] } }),
    Product.deleteMany({ code: "TEST_P" }),
    ProductVariant.deleteMany({ sku: "TEST_SKU" }),
    Area.deleteMany({ code: "TEST_AREA" }),
    InventoryHistory.deleteMany({}),
  ]);

  // Create Area first (required by Warehouse)
  const area = await Area.create({
    code: "TEST_AREA",
    name: "Test Area",
    isActive: true,
  });

  // Create test data
  const warehouseAObj = await Warehouse.create({
    code: "TEST_A",
    name: "Kho A Test",
    areaId: area._id,
    isActive: true,
  });
  warehouseA = warehouseAObj._id as mongoose.Types.ObjectId;

  const product = await Product.create({
    code: "TEST_P",
    name: "Product Test",
    categoryId: new mongoose.Types.ObjectId(),
    isActive: true,
  });
  productId = product._id as mongoose.Types.ObjectId;

  // Create an attribute value for variant
  const colorAttr = new mongoose.Types.ObjectId();
  const variant = await ProductVariant.create({
    productId: productId,
    sku: "TEST_SKU",
    variantValues: [colorAttr],
    price: 100000,
    isActive: true,
  });
  variantId = variant._id as mongoose.Types.ObjectId;

  employeeId = new mongoose.Types.ObjectId();
}, TEST_TIMEOUT);

afterAll(async () => {
  await Promise.all([
    WarehouseInventory.deleteMany({}),
    Warehouse.deleteMany({ code: { $in: ["TEST_A"] } }),
    Product.deleteMany({ code: "TEST_P" }),
    ProductVariant.deleteMany({ sku: "TEST_SKU" }),
    Area.deleteMany({ code: "TEST_AREA" }),
    InventoryHistory.deleteMany({}),
  ]);
  await mongoose.disconnect();
});

beforeEach(async () => {
  // Clear all inventory data
  await Promise.all([
    WarehouseInventory.deleteMany({}),
    InventoryHistory.deleteMany({}),
  ]);
}, TEST_TIMEOUT);

// ==================================================
// Helper Functions
// ==================================================

async function createWarehouseInventoryRecord(
  warehouseId: mongoose.Types.ObjectId,
  variantId: mongoose.Types.ObjectId,
  productId: mongoose.Types.ObjectId,
  quantity: number,
  reservedQuantity: number = 0
) {
  return WarehouseInventory.create({
    warehouseId: warehouseA,
    itemType: "PRODUCT",
    productId: null,  // Phase 2+ filter expects null for PRODUCT items
    variantId,
    quantity,
    reservedQuantity,
    availableQuantity: quantity - reservedQuantity,
    inTransitQuantity: 0,
    shippedQuantity: 0,
    isActive: true,
  });
}

// ==================================================
// TESTS: Reserve Stock
// ==================================================

describe("Phase 3: RESERVE Stock (WarehouseInventory SoT)", () => {
  it("[A] Should reserve stock successfully", async () => {
    // Create WarehouseInventory record
    await createWarehouseInventoryRecord(warehouseA, variantId, productId, 100, 0);

    // Reserve 30 units
    const results = await reserveStock(
      warehouseA.toString(),
      [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 30 }],
      {
        actorEmployeeId: employeeId.toString(),
        referenceType: "ORDER",
        referenceCode: "TEST301",
      }
    );

    expect(results).toHaveLength(1);
    expect(results[0].action).toBe("RESERVE");
    expect(results[0].before.reservedQuantity).toBe(0);
    expect(results[0].after.reservedQuantity).toBe(30);
    expect(results[0].before.availableQuantity).toBe(100);
    expect(results[0].after.availableQuantity).toBe(70);

    // Verify WarehouseInventory updated
    const wi = await WarehouseInventory.findOne({
      warehouseId: warehouseA,
      variantId,
      itemType: "PRODUCT",
    });
    expect(wi?.reservedQuantity).toBe(30);
    expect(wi?.availableQuantity).toBe(70);
    expect(wi?.quantity).toBe(100); // quantity unchanged
  });

  it("[B] Should throw InsufficientStockError when available < requested", async () => {
    // Create WarehouseInventory record with only 20 available
    await createWarehouseInventoryRecord(warehouseA, variantId, productId, 20, 0);

    // Try to reserve 30 (only 20 available)
    await expect(
      reserveStock(
        warehouseA.toString(),
        [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 30 }],
        {
          actorEmployeeId: employeeId.toString(),
          referenceType: "ORDER",
          referenceCode: "TEST302",
        }
      )
    ).rejects.toThrow(InsufficientStockError);

    // Verify no changes
    const wi = await WarehouseInventory.findOne({ warehouseId: warehouseA, variantId, itemType: "PRODUCT" });
    expect(wi?.reservedQuantity).toBe(0);
    expect(wi?.availableQuantity).toBe(20);
  });

  it("[C] Should throw when WarehouseInventory record doesn't exist", async () => {
    // Don't create WarehouseInventory record

    await expect(
      reserveStock(
        warehouseA.toString(),
        [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 5 }],
        {
          actorEmployeeId: employeeId.toString(),
          referenceType: "ORDER",
          referenceCode: "TEST303",
        }
      )
    ).rejects.toThrow(InsufficientStockError);
  });

  it("[D] Should preserve invariant after reserve", async () => {
    const initialQty = 100;
    const reserveQty = 40;
    await createWarehouseInventoryRecord(warehouseA, variantId, productId, initialQty, 0);

    await reserveStock(
      warehouseA.toString(),
      [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: reserveQty }],
      {
        actorEmployeeId: employeeId.toString(),
        referenceType: "ORDER",
        referenceCode: "TEST304",
      }
    );

    const wi = await WarehouseInventory.findOne({ warehouseId: warehouseA, variantId, itemType: "PRODUCT" });
    
    // Verify invariant: availableQuantity = quantity - reservedQuantity - inTransitQuantity
    expect(wi?.quantity).toBe(initialQty); // unchanged
    expect(wi?.reservedQuantity).toBe(reserveQty);
    expect(wi?.availableQuantity).toBe(initialQty - reserveQty);
    expect(wi?.inTransitQuantity).toBe(0);
  });
});

// ==================================================
// TESTS: Unreserve Stock
// ==================================================

describe("Phase 3: UNRESERVE Stock (WarehouseInventory SoT)", () => {
  it("[E] Should unreserve stock successfully", async () => {
    // Create WarehouseInventory record with 50 reserved
    await createWarehouseInventoryRecord(warehouseA, variantId, productId, 100, 50);

    // Unreserve 30 units
    const results = await releaseReservedStock(
      warehouseA.toString(),
      [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 30 }],
      {
        actorEmployeeId: employeeId.toString(),
        referenceType: "ORDER",
        referenceCode: "TEST305",
      }
    );

    expect(results).toHaveLength(1);
    expect(results[0].action).toBe("UNRESERVE");
    expect(results[0].before.reservedQuantity).toBe(50);
    expect(results[0].after.reservedQuantity).toBe(20);
    expect(results[0].before.availableQuantity).toBe(50);
    expect(results[0].after.availableQuantity).toBe(80);

    // Verify WarehouseInventory updated
    const wi = await WarehouseInventory.findOne({ warehouseId: warehouseA, variantId, itemType: "PRODUCT" });
    expect(wi?.reservedQuantity).toBe(20);
    expect(wi?.availableQuantity).toBe(80);
    expect(wi?.quantity).toBe(100); // quantity unchanged
  });

  it("[F] Should throw InsufficientReservedStockError when reserved < requested", async () => {
    // Create WarehouseInventory record with only 10 reserved
    await createWarehouseInventoryRecord(warehouseA, variantId, productId, 100, 10);

    // Try to unreserve 30 (only 10 reserved)
    await expect(
      releaseReservedStock(
        warehouseA.toString(),
        [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 30 }],
        {
          actorEmployeeId: employeeId.toString(),
          referenceType: "ORDER",
          referenceCode: "TEST306",
        }
      )
    ).rejects.toThrow(InsufficientReservedStockError);

    // Verify no changes
    const wi = await WarehouseInventory.findOne({ warehouseId: warehouseA, variantId, itemType: "PRODUCT" });
    expect(wi?.reservedQuantity).toBe(10);
    expect(wi?.availableQuantity).toBe(90);
  });

  it("[G] Should throw when WarehouseInventory record doesn't exist", async () => {
    // Don't create WarehouseInventory record

    await expect(
      releaseReservedStock(
        warehouseA.toString(),
        [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 5 }],
        {
          actorEmployeeId: employeeId.toString(),
          referenceType: "ORDER",
          referenceCode: "TEST307",
        }
      )
    ).rejects.toThrow(InsufficientReservedStockError);
  });
});

// ==================================================
// TESTS: Concurrent Operations
// ==================================================

describe("Phase 3: Concurrency", () => {
  it("[H] Concurrent reserve: only some succeed when stock insufficient", async () => {
    const initialQty = 15;
    await createWarehouseInventoryRecord(warehouseA, variantId, productId, initialQty, 0);

    // 4 concurrent reserves: 4, 4, 4, 4 = total 16, but only 15 available
    const promises = [
      reserveStock(warehouseA.toString(), [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 4 }], {
        actorEmployeeId: employeeId.toString(),
        referenceType: "ORDER",
        referenceCode: "TEST308a",
      }),
      reserveStock(warehouseA.toString(), [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 4 }], {
        actorEmployeeId: employeeId.toString(),
        referenceType: "ORDER",
        referenceCode: "TEST308b",
      }),
      reserveStock(warehouseA.toString(), [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 4 }], {
        actorEmployeeId: employeeId.toString(),
        referenceType: "ORDER",
        referenceCode: "TEST308c",
      }),
      reserveStock(warehouseA.toString(), [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 4 }], {
        actorEmployeeId: employeeId.toString(),
        referenceType: "ORDER",
        referenceCode: "TEST308d",
      }),
    ];

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === "fulfilled");
    const failed = results.filter(r => r.status === "rejected");

    // At most 3 should succeed (3*4 = 12 <= 15)
    expect(successful.length).toBeLessThanOrEqual(3);
    // At least 1 should fail
    expect(failed.length).toBeGreaterThanOrEqual(1);
  });

  it("[I] Reserve and unreserve in sequence", async () => {
    await createWarehouseInventoryRecord(warehouseA, variantId, productId, 100, 0);

    // Reserve 50
    await reserveStock(warehouseA.toString(), [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 50 }], {
      actorEmployeeId: employeeId.toString(),
      referenceType: "ORDER",
      referenceCode: "TEST309",
    });

    let wi = await WarehouseInventory.findOne({ warehouseId: warehouseA, variantId, itemType: "PRODUCT" });
    expect(wi?.reservedQuantity).toBe(50);
    expect(wi?.availableQuantity).toBe(50);

    // Unreserve 30
    await releaseReservedStock(warehouseA.toString(), [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 30 }], {
      actorEmployeeId: employeeId.toString(),
      referenceType: "ORDER",
      referenceCode: "TEST309",
    });

    wi = await WarehouseInventory.findOne({ warehouseId: warehouseA, variantId, itemType: "PRODUCT" });
    expect(wi?.reservedQuantity).toBe(20);
    expect(wi?.availableQuantity).toBe(80);
    expect(wi?.quantity).toBe(100);
  });
});

// ==================================================
// TESTS: Transaction Rollback
// ==================================================

describe("Phase 3: Transaction Rollback", () => {
  it("[J] Should rollback on partial failure", async () => {
    // Use different SKU to avoid duplicate key error
    const testSku = `TEST_SKU_${Date.now()}`;
    await createWarehouseInventoryRecord(warehouseA, variantId, productId, 100, 0);

    // Create second variant for testing
    const colorAttr2 = new mongoose.Types.ObjectId();
    const variant2 = await ProductVariant.create({
      productId,
      sku: testSku,
      variantValues: [colorAttr2],
      price: 100000,
      isActive: true,
    });

    // First item: reserve 50 (succeeds)
    // Second item: reserve 100 (fails - only 50 available)
    await expect(
      reserveStock(
        warehouseA.toString(),
        [
          { itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 50 },
          { itemType: "PRODUCT", productVariantId: variant2._id.toString(), quantity: 100 },
        ],
        {
          actorEmployeeId: employeeId.toString(),
          referenceType: "ORDER",
          referenceCode: "TEST310",
        }
      )
    ).rejects.toThrow();

    // Verify first item NOT changed (rollback)
    const wi = await WarehouseInventory.findOne({ warehouseId: warehouseA, variantId, itemType: "PRODUCT" });
    expect(wi?.reservedQuantity).toBe(0);
    expect(wi?.availableQuantity).toBe(100);

    await ProductVariant.deleteOne({ _id: variant2._id });
  });
});

// ==================================================
// TESTS: History Tracking
// ==================================================

describe("Phase 3: History Tracking", () => {
  it("[K] Should create history record for reserve", async () => {
    await createWarehouseInventoryRecord(warehouseA, variantId, productId, 100, 0);

    await reserveStock(warehouseA.toString(), [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 25 }], {
      actorEmployeeId: employeeId.toString(),
      referenceType: "ORDER",
      referenceCode: "TEST311",
    });

    const history = await InventoryHistory.findOne({ referenceCode: "TEST311" });
    expect(history).not.toBeNull();
    expect(history?.action).toBe("RESERVE");
  });

  it("[L] Should create history record for unreserve", async () => {
    await createWarehouseInventoryRecord(warehouseA, variantId, productId, 100, 25);

    await releaseReservedStock(warehouseA.toString(), [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 15 }], {
      actorEmployeeId: employeeId.toString(),
      referenceType: "ORDER",
      referenceCode: "TEST312",
    });

    const history = await InventoryHistory.findOne({ referenceCode: "TEST312" });
    expect(history).not.toBeNull();
    expect(history?.action).toBe("UNRESERVE");
  });
});

/**
 * ============================================================
 * CONCURRENCY TESTS — returnOrder()
 * ============================================================
 *
 * These tests guard against double-return bugs under concurrent
 * requests and client retry patterns.
 *
 * Required invariants after every test:
 *   I1. WarehouseInventory.quantity increased by AT MOST the
 *       returned amount (no double-credit under concurrent races).
 *   I2. sum(ORDER_RETURN movements per order) <= sum(ORDER_OUT
 *       movements per order) for every orderId.
 *   I3. Exactly one ORDER_RETURN movement per (orderId, itemKey)
 *       "credit event" — duplicate inserts are not allowed.
 *
 * Database: This test file targets `mongolia_test_return_concurrency`
 * by default. Do NOT run against production Atlas. To run against
 * an Atlas test cluster, set MONGODB_URI_TEST to a connection
 * string whose database name ends in `_test` (e.g.
 * `mongodb+srv://user:pw@cluster/mongolia_test?...`).
 *
 * Usage:
 *   MONGODB_URI_TEST="mongodb://127.0.0.1:27017/mongolia_test_return_concurrency" \
 *     npx jest src/tests/returnOrderConcurrency.test.ts --forceExit
 *
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import mongoose from "mongoose";
import { orderShipmentService } from "@/services/warehouse/orderShipment.service";
import WarehouseInventory from "@/models/WarehouseInventory";
import ProductVariant from "@/models/ProductVariant";
import Product from "@/models/Product";
import Warehouse from "@/models/Warehouse";
import WarehouseStockMovement from "@/models/WarehouseStockMovement";
import Order from "@/models/Order";

// ─── DB connection ────────────────────────────────────────────────────────────

const mongoUri =
  process.env.MONGODB_URI_TEST ??
  "mongodb://127.0.0.1:27017/mongolia_test_return_concurrency";

// Safety: refuse to run if URI looks like production (no `_test` in path).
function isLikelyProductionDb(uri: string): boolean {
  // Atlas connection strings include the db name before `?`.
  const dbSegment = uri.split("?")[0].split("/").pop() ?? "";
  return !dbSegment.includes("_test") && !dbSegment.endsWith("test");
}

// ─── Shared test data ─────────────────────────────────────────────────────────

let warehouseId: mongoose.Types.ObjectId;
let productId: mongoose.Types.ObjectId;
let variantId: mongoose.Types.ObjectId;
let variantBId: mongoose.Types.ObjectId;
const employeeId = new mongoose.Types.ObjectId();
let orderId: mongoose.Types.ObjectId;

beforeAll(async () => {
  if (isLikelyProductionDb(mongoUri)) {
    throw new Error(
      `Refusing to run concurrency tests against non-test database: ${mongoUri}\n` +
      `Set MONGODB_URI_TEST to a connection string whose db name includes "_test".`
    );
  }
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(mongoUri);
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([
    WarehouseInventory.deleteMany({}),
    WarehouseStockMovement.deleteMany({}),
    Warehouse.deleteMany({ code: { $in: ["KHO1", "KHO2", "TEST_RETURN"] } }),
    Product.deleteMany({ code: "TEST_RETURN_P" }),
    ProductVariant.deleteMany({ sku: { $in: ["TEST_RETURN_SKU", "TEST_RETURN_SKU_B"] } }),
    Order.deleteMany({ orderCode: /^TEST_RETURN_ORDER/ }),
  ]);

  const warehouse = await Warehouse.create({
    code: "KHO2",
    name: "Kho Mông Cổ (chính) — test return",
    isActive: true,
  });
  warehouseId = warehouse._id;

  const product = await Product.create({
    code: "TEST_RETURN_P",
    name: "Product test return",
    categoryId: new mongoose.Types.ObjectId(),
    isActive: true,
  });
  productId = product._id;

  const variant = await ProductVariant.create({
    productId,
    sku: "TEST_RETURN_SKU",
    variantValues: { color: "red" },
    isActive: true,
  });
  variantId = variant._id;

  const variantB = await ProductVariant.create({
    productId,
    sku: "TEST_RETURN_SKU_B",
    variantValues: { color: "blue" },
    isActive: true,
  });
  variantBId = variantB._id;
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function seedScenario(opts: {
  startingQuantity: number;
  variantId: mongoose.Types.ObjectId;
  orderOutQty: number;
  status?: "RETURNED" | "SHIPPING" | "DELIVERED";
  extraVariants?: { variantId: mongoose.Types.ObjectId; startingQuantity: number; orderOutQty: number }[];
}) {
  const status = opts.status ?? "RETURNED";

  await WarehouseInventory.create({
    warehouseId,
    itemType: "PRODUCT",
    productId,
    variantId: opts.variantId,
    quantity: opts.startingQuantity,
    availableQuantity: opts.startingQuantity,
    reservedQuantity: 0,
    isActive: true,
  });

  for (const v of opts.extraVariants ?? []) {
    await WarehouseInventory.create({
      warehouseId,
      itemType: "PRODUCT",
      productId,
      variantId: v.variantId,
      quantity: v.startingQuantity,
      availableQuantity: v.startingQuantity,
      reservedQuantity: 0,
      isActive: true,
    });
  }

  const order = await Order.create({
    orderCode: `TEST_RETURN_ORDER_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
    warehouseId,
    status,
    customerId: new mongoose.Types.ObjectId(),
    customerName: "Test Customer",
    customerPhone: "0900000000",
    quantity: 1,
    totalAmount: 1000,
    items: [],
  });
  orderId = order._id;

  await WarehouseStockMovement.create({
    warehouseId,
    itemType: "PRODUCT",
    productId,
    variantId: opts.variantId,
    type: "ORDER_OUT",
    quantity: opts.orderOutQty,
    referenceType: "ORDER",
    referenceId: orderId,
    referenceCode: order.orderCode,
    createdBy: employeeId,
    note: "shipped",
  });

  for (const v of opts.extraVariants ?? []) {
    await WarehouseStockMovement.create({
      warehouseId,
      itemType: "PRODUCT",
      productId,
      variantId: v.variantId,
      type: "ORDER_OUT",
      quantity: v.orderOutQty,
      referenceType: "ORDER",
      referenceId: orderId,
      referenceCode: order.orderCode,
      createdBy: employeeId,
      note: "shipped",
    });
  }

  return order;
}

/**
 * The CORE invariant: after every test, sum(ORDER_RETURN per order) must
 * never exceed sum(ORDER_OUT per order) for any item key.
 */
async function assertReturnInvariant(orderObjectId: mongoose.Types.ObjectId) {
  const outs = await WarehouseStockMovement.aggregate<{
    _id: { variantId: mongoose.Types.ObjectId };
    total: number;
  }>([
    {
      $match: {
        referenceType: "ORDER",
        referenceId: orderObjectId,
        type: "ORDER_OUT",
        itemType: "PRODUCT",
      },
    },
    { $group: { _id: { variantId: "$variantId" }, total: { $sum: "$quantity" } } },
  ]);
  const returns = await WarehouseStockMovement.aggregate<{
    _id: { variantId: mongoose.Types.ObjectId };
    total: number;
  }>([
    {
      $match: {
        referenceType: "ORDER",
        referenceId: orderObjectId,
        type: "ORDER_RETURN",
        itemType: "PRODUCT",
      },
    },
    { $group: { _id: { variantId: "$variantId" }, total: { $sum: "$quantity" } } },
  ]);

  const outMap = new Map(outs.map((x) => [String(x._id.variantId), x.total]));
  for (const r of returns) {
    const key = String(r._id.variantId);
    const shipped = outMap.get(key) ?? 0;
    expect(r.total).toBeLessThanOrEqual(shipped);
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("returnOrder — warehouse correctness", () => {
  it("[RET-WH-1] returnOrder() must restore ONLY the shipped-from warehouse, not affect the other", async () => {
    // Real system topology:
    //   Kho 1 (Trung Quốc)  — source
    //        ↓ transfer
    //   Kho 2 (Mông Cổ)    — shipped-from warehouse
    //        ↓ ORDER_OUT -5
    //   Khách
    //        ↓ shipper: giao thất bại
    //   RETURNED
    //        ↓ returnOrder()
    //   Kho 2 (Mông Cổ)    — inventory restored HERE
    //   Kho 1 (Trung Quốc) — MUST be unchanged

    const warehouseCN = await Warehouse.create({
      code: "TEST_KHO_CN",
      name: "Kho Trung Quốc",
      isActive: true,
    });
    const warehouseMC = await Warehouse.create({
      code: "TEST_KHO_MC",
      name: "Kho Mông Cổ",
      isActive: true,
    });

    // Kho 1 (Trung Quốc): 100 units — should be untouched.
    await WarehouseInventory.create({
      warehouseId: warehouseCN._id,
      itemType: "PRODUCT",
      productId,
      variantId,
      quantity: 100,
      availableQuantity: 100,
      reservedQuantity: 0,
      isActive: true,
    });

    // Kho 2 (Mông Cổ): 10 units before shipping, 5 after ship.
    // We simulate the post-ship state directly since we test returnOrder().
    await WarehouseInventory.create({
      warehouseId: warehouseMC._id,
      itemType: "PRODUCT",
      productId,
      variantId,
      quantity: 5,    // 10 - 5 (ORDER_OUT already deducted)
      availableQuantity: 5,
      reservedQuantity: 0,
      isActive: true,
    });

    // Order is at Kho 2 and in RETURNED status.
    const order = await Order.create({
      orderCode: `TEST_RETURN_ORDER_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
      warehouseId: warehouseMC._id,  // ← Order xác định kho gốc = Kho 2
      status: "RETURNED",
      customerId: new mongoose.Types.ObjectId(),
      customerName: "Khách test",
      customerPhone: "0900000000",
      quantity: 1,
      totalAmount: 1000,
      items: [],
    });

    // ORDER_OUT: 5 units left Kho 2.
    await WarehouseStockMovement.create({
      warehouseId: warehouseMC._id,
      itemType: "PRODUCT",
      productId,
      variantId,
      type: "ORDER_OUT",
      quantity: 5,
      referenceType: "ORDER",
      referenceId: order._id,
      referenceCode: order.orderCode,
      createdBy: employeeId,
      note: "shipped",
    });

    // ── ACT ──────────────────────────────────────────────────────────────────
    const result = await orderShipmentService.returnOrder({
      orderId: order._id.toString(),
      employeeId: employeeId.toString(),
      items: [
        {
          itemType: "PRODUCT",
          productId: productId.toString(),
          variantId: variantId.toString(),
          quantity: 5,
        },
      ],
      note: "hoàn kho",
    });

    expect(result.success).toBe(true);
    expect(result.alreadyReturned).toBe(false);

    // ── ASSERT: Kho 1 (Trung Quốc) — MUST be unchanged ─────────────────────
    const khoCN = await WarehouseInventory.findOne({
      warehouseId: warehouseCN._id,
      itemType: "PRODUCT",
      productId,
      variantId,
    }).lean();
    expect(khoCN).toBeTruthy();
    expect(khoCN!.quantity).toBe(100);
    expect(khoCN!.availableQuantity).toBe(100);

    // Verify NO movements against Kho 1.
    const movementsKhoCN = await WarehouseStockMovement.find({
      warehouseId: warehouseCN._id,
      referenceType: "ORDER",
      referenceId: order._id,
    }).lean();
    expect(movementsKhoCN).toHaveLength(0);

    // ── ASSERT: Kho 2 (Mông Cổ) — restored from 5 to 10 ───────────────────
    const khoMC = await WarehouseInventory.findOne({
      warehouseId: warehouseMC._id,
      itemType: "PRODUCT",
      productId,
      variantId,
    }).lean();
    expect(khoMC).toBeTruthy();
    expect(khoMC!.quantity).toBe(10);   // 5 (post-ship) + 5 (return)
    expect(khoMC!.availableQuantity).toBe(10);

    // ORDER_OUT row already existed (from ship); ORDER_RETURN row is new.
    const movementsKhoMC = await WarehouseStockMovement.find({
      warehouseId: warehouseMC._id,
      referenceType: "ORDER",
      referenceId: order._id,
    }).lean();
    expect(movementsKhoMC).toHaveLength(2);  // 1 × ORDER_OUT + 1 × ORDER_RETURN
    const outRow = movementsKhoMC.find((m) => m.type === "ORDER_OUT");
    const returnRow = movementsKhoMC.find((m) => m.type === "ORDER_RETURN");
    expect(outRow).toBeDefined();
    expect(returnRow).toBeDefined();
    expect(outRow!.quantity).toBe(5);
    expect(returnRow!.quantity).toBe(5);

    // Core invariant: sum(ORDER_RETURN) ≤ sum(ORDER_OUT) per variant.
    await assertReturnInvariant(order._id as mongoose.Types.ObjectId);
  }, 30000);
});

describe("returnOrder concurrency", () => {
  it("[RET-CON-1] Two concurrent returns of 5+5 against ORDER_OUT=5 → exactly +5 credited", async () => {
    // starting quantity = 8 (had 10, 2 already shipped in some other order)
    // ORDER_OUT for THIS order = 5
    // Both requests try to return 5 units of the same variant.
    await seedScenario({
      startingQuantity: 8,
      variantId,
      orderOutQty: 5,
    });

    const items = [
      { itemType: "PRODUCT" as const, productId: productId.toString(), variantId: variantId.toString(), quantity: 5 },
    ];

    const [a, b] = await Promise.all([
      orderShipmentService.returnOrder({
        orderId: orderId.toString(),
        employeeId: employeeId.toString(),
        items,
        note: "concurrent A",
      }),
      orderShipmentService.returnOrder({
        orderId: orderId.toString(),
        employeeId: employeeId.toString(),
        items,
        note: "concurrent B",
      }),
    ]);

    // Inventory: must be 13 (not 18).
    const inv = await WarehouseInventory.findOne({
      warehouseId, itemType: "PRODUCT", productId, variantId,
    }).lean();
    expect(inv).toBeTruthy();
    expect(inv!.quantity).toBe(13);
    expect(inv!.availableQuantity).toBe(13);

    // Exactly one ORDER_RETURN row.
    const returns = await WarehouseStockMovement.find({
      type: "ORDER_RETURN",
      referenceType: "ORDER",
      referenceId: orderId,
    }).lean();
    expect(returns).toHaveLength(1);
    expect(returns[0].quantity).toBe(5);

    // Total credited across both responses = 5.
    const creditedTotal =
      (a.success && !a.alreadyReturned
        ? a.itemsReturned.reduce((s, i) => s + i.quantity, 0)
        : 0) +
      (b.success && !b.alreadyReturned
        ? b.itemsReturned.reduce((s, i) => s + i.quantity, 0)
        : 0);
    expect(creditedTotal).toBe(5);

    // Exactly one response is a real credit; the other is either
    // alreadyReturned or success:false (409 retryable).
    const creditedResponses = [a, b].filter((r) => r.success && !r.alreadyReturned);
    expect(creditedResponses).toHaveLength(1);

    // Core invariant.
    await assertReturnInvariant(orderId);
  }, 30000);

  it("[RET-CON-2] Two concurrent returns of 3+3 against ORDER_OUT=3 → exactly +3 credited", async () => {
    await seedScenario({
      startingQuantity: 7,
      variantId,
      orderOutQty: 3,
    });

    const items = [
      { itemType: "PRODUCT" as const, productId: productId.toString(), variantId: variantId.toString(), quantity: 3 },
    ];

    const [a, b] = await Promise.all([
      orderShipmentService.returnOrder({
        orderId: orderId.toString(),
        employeeId: employeeId.toString(),
        items,
        note: "concurrent 3A",
      }),
      orderShipmentService.returnOrder({
        orderId: orderId.toString(),
        employeeId: employeeId.toString(),
        items,
        note: "concurrent 3B",
      }),
    ]);

    const inv = await WarehouseInventory.findOne({
      warehouseId, itemType: "PRODUCT", productId, variantId,
    }).lean();
    expect(inv!.quantity).toBe(10); // 7 + 3

    const returns = await WarehouseStockMovement.find({
      type: "ORDER_RETURN",
      referenceType: "ORDER",
      referenceId: orderId,
    }).lean();
    expect(returns).toHaveLength(1);
    expect(returns[0].quantity).toBe(3);

    const creditedTotal =
      (a.success && !a.alreadyReturned
        ? a.itemsReturned.reduce((s, i) => s + i.quantity, 0)
        : 0) +
      (b.success && !b.alreadyReturned
        ? b.itemsReturned.reduce((s, i) => s + i.quantity, 0)
        : 0);
    expect(creditedTotal).toBe(3);

    await assertReturnInvariant(orderId);
  }, 30000);

  it("[RET-CON-3] Partial multi-item return: item A 2/5 + item B 1/3; second partial returns succeed", async () => {
    // Order has 2 variants:
    //   variant A: ORDER_OUT = 5 (inventory starts at 5)
    //   variant B: ORDER_OUT = 3 (inventory starts at 3)
    // First return: A returns 2, B returns 1 → succeeds.
    // Second return (later): A returns 3 more, B returns 2 more → succeeds.
    // Third return (later): A returns 1 more, B returns 0 → only A goes through;
    //                      B's "already fully returned" path triggers idempotent no-op.
    await seedScenario({
      startingQuantity: 5,
      variantId,
      orderOutQty: 5,
      extraVariants: [{ variantId: variantBId, startingQuantity: 3, orderOutQty: 3 }],
    });

    // First batch: A=2, B=1
    const first = await orderShipmentService.returnOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
      items: [
        { itemType: "PRODUCT", productId: productId.toString(), variantId: variantId.toString(), quantity: 2 },
        { itemType: "PRODUCT", productId: productId.toString(), variantId: variantBId.toString(), quantity: 1 },
      ],
      note: "batch 1",
    });
    expect(first.success).toBe(true);
    expect(first.alreadyReturned).toBe(false);

    // Second batch: A=3, B=2
    const second = await orderShipmentService.returnOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
      items: [
        { itemType: "PRODUCT", productId: productId.toString(), variantId: variantId.toString(), quantity: 3 },
        { itemType: "PRODUCT", productId: productId.toString(), variantId: variantBId.toString(), quantity: 2 },
      ],
      note: "batch 2",
    });
    expect(second.success).toBe(true);
    expect(second.alreadyReturned).toBe(false);

    // Third batch: try A=1 more (would exceed: only 0 remaining) + B=0 → idempotent no-op
    const third = await orderShipmentService.returnOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
      items: [
        { itemType: "PRODUCT", productId: productId.toString(), variantId: variantId.toString(), quantity: 1 },
      ],
      note: "batch 3 — exceeds",
    });
    // All requested items are already fully returned → idempotent no-op.
    expect(third.success).toBe(true);
    expect(third.alreadyReturned).toBe(true);
    expect(third.itemsReturned).toHaveLength(0);

    // Inventory:
    //   variant A: 5 + 2 + 3 = 10
    //   variant B: 3 + 1 + 2 = 6
    const invA = await WarehouseInventory.findOne({
      warehouseId, itemType: "PRODUCT", productId, variantId,
    }).lean();
    expect(invA!.quantity).toBe(10);
    const invB = await WarehouseInventory.findOne({
      warehouseId, itemType: "PRODUCT", productId, variantId: variantBId,
    }).lean();
    expect(invB!.quantity).toBe(6);

    // Movements: 2 ORDER_RETURN rows for variant A (2 and 3), 2 for B (1 and 2).
    const returns = await WarehouseStockMovement.find({
      type: "ORDER_RETURN",
      referenceType: "ORDER",
      referenceId: orderId,
    }).lean();
    expect(returns).toHaveLength(4);

    await assertReturnInvariant(orderId);
  }, 30000);

  it("[RET-CON-4] Retry-after-network-blip: client retries a successful request → alreadyReturned, no double-credit", async () => {
    // Simulates: client got a network timeout but the server actually
    // committed. Client retries with the SAME payload — server must
    // detect this and return alreadyReturned: true without crediting again.
    await seedScenario({
      startingQuantity: 8,
      variantId,
      orderOutQty: 5,
    });

    const items = [
      { itemType: "PRODUCT" as const, productId: productId.toString(), variantId: variantId.toString(), quantity: 5 },
    ];

    // First call — client's connection "blips" before reading response.
    // We capture the response but the client thinks it failed.
    const firstCall = await orderShipmentService.returnOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
      items,
      note: "first (server-committed, client-blipped)",
    });
    expect(firstCall.success).toBe(true);
    expect(firstCall.alreadyReturned).toBe(false);

    // Client retries with identical payload.
    const retryCall = await orderShipmentService.returnOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
      items,
      note: "retry after blip",
    });
    expect(retryCall.success).toBe(true);
    expect(retryCall.alreadyReturned).toBe(true);
    expect(retryCall.itemsReturned).toHaveLength(0);

    // Inventory: +5 ONCE, not +10.
    const inv = await WarehouseInventory.findOne({
      warehouseId, itemType: "PRODUCT", productId, variantId,
    }).lean();
    expect(inv!.quantity).toBe(13);

    // Only one ORDER_RETURN row.
    const returns = await WarehouseStockMovement.find({
      type: "ORDER_RETURN",
      referenceType: "ORDER",
      referenceId: orderId,
    }).lean();
    expect(returns).toHaveLength(1);
    expect(returns[0].quantity).toBe(5);

    await assertReturnInvariant(orderId);
  }, 30000);

  it("[RET-CON-5] Stress: 5 concurrent returns of 2 against ORDER_OUT=2 → exactly +2 credited", async () => {
    await seedScenario({
      startingQuantity: 8,
      variantId,
      orderOutQty: 2,
    });

    const items = [
      { itemType: "PRODUCT" as const, productId: productId.toString(), variantId: variantId.toString(), quantity: 2 },
    ];

    const runs = Array.from({ length: 5 }, (_, i) =>
      orderShipmentService.returnOrder({
        orderId: orderId.toString(),
        employeeId: employeeId.toString(),
        items,
        note: `stress ${i}`,
      }),
    );
    const results = await Promise.all(runs);

    const credited = results
      .filter((r) => r.success && !r.alreadyReturned)
      .reduce((sum, r) => sum + r.itemsReturned.reduce((s, i) => s + i.quantity, 0), 0);
    expect(credited).toBe(2);

    const inv = await WarehouseInventory.findOne({
      warehouseId, itemType: "PRODUCT", productId, variantId,
    }).lean();
    expect(inv!.quantity).toBe(10);

    const returns = await WarehouseStockMovement.find({
      type: "ORDER_RETURN",
      referenceType: "ORDER",
      referenceId: orderId,
    }).lean();
    expect(returns).toHaveLength(1);
    expect(returns[0].quantity).toBe(2);

    await assertReturnInvariant(orderId);
  }, 30000);

  it("[RET-CON-6] Order not in RETURNED status → request rejected with status message, no credit", async () => {
    // Order is in SHIPPING — returnOrder() must reject.
    await seedScenario({
      startingQuantity: 8,
      variantId,
      orderOutQty: 5,
      status: "SHIPPING",
    });

    const items = [
      { itemType: "PRODUCT" as const, productId: productId.toString(), variantId: variantId.toString(), quantity: 5 },
    ];

    const result = await orderShipmentService.returnOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
      items,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/đang giao|cần xác nhận hoàn trả/i);
    }

    const inv = await WarehouseInventory.findOne({
      warehouseId, itemType: "PRODUCT", productId, variantId,
    }).lean();
    expect(inv!.quantity).toBe(8);

    const returns = await WarehouseStockMovement.find({
      type: "ORDER_RETURN",
      referenceType: "ORDER",
      referenceId: orderId,
    }).lean();
    expect(returns).toHaveLength(0);
  }, 30000);
});
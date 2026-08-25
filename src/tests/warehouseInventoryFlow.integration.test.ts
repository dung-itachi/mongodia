/**
 * ============================================================
 * WAREHOUSE INVENTORY INTEGRATION TEST SUITE
 * ============================================================
 *
 * End-to-end test cho toÃ n bá»™ lifecycle hÃ ng hoÃ¡ trong há»‡ thá»‘ng.
 *
 * Topology báº¯t buá»™c (KHO1 / KHO2):
 *
 *   NHÃ€ Sáº¢N XUáº¤T â”€â”€ IMPORT â”€â”€â†’ KHO1 (intermediate)
 *                                    â”‚
 *                                    â””â”€ TRANSFER â”€â†’ KHO2 (main selling)
 *                                                          â”‚
 *                                                          â”œâ”€ ORDER_OUT (khÃ¡ch)
 *                                                          â””â”€ ORDER_RETURN (khÃ¡ch tráº£)
 *
 *   KHO2 â†’ KHO1          : REJECT (topology violation)
 *   ORDER_OUT tá»« KHO1    : REJECT (KHO1 khÃ´ng bÃ¡n hÃ ng)
 *   ORDER_RETURN vÃ o KHO1 : REJECT (KHO1 khÃ´ng nháº­n return)
 *
 * Database báº¯t buá»™c pháº£i lÃ  test DB:
 *   - URI máº·c Ä‘á»‹nh: mongodb://127.0.0.1:27017/mongolia_test_inventory
 *   - TÃªn DB pháº£i chá»©a `_test` hoáº·c `_test_` (case-insensitive).
 *   - Refuse to run náº¿u URI trÃ´ng giá»‘ng production.
 *
 * Invariants báº¯t buá»™c sau Má»ŒI test:
 *   I1. `KHO1` KHÃ”NG cÃ³ báº¥t ká»³ WarehouseStockMovement nÃ o cÃ³ type
 *       âˆˆ {ORDER_OUT, ORDER_RETURN}.
 *   I2. `KHO2` KHÃ”NG cÃ³ WarehouseStockMovement nÃ o cÃ³ type = IMPORT
 *       (chá»‰ TRANSFER_IN, ORDER_OUT, ORDER_RETURN, ADJUSTMENT).
 *   I3. Vá»›i má»—i (orderId, itemType, variantId/giftId):
 *         Î£ ORDER_RETURN.quantity  â‰¤  Î£ ORDER_OUT.quantity
 *   I4. KHO1 chá»‰ nháº­n IMPORT vÃ  TRANSFER_OUT. KHO2 nháº­n TRANSFER_IN,
 *       ORDER_OUT, ORDER_RETURN (vÃ  ADJUSTMENT).
 *
 * Kiá»ƒm tra database cuá»‘i cÃ¹ng (KHÃ”NG chá»‰ response):
 *   - WarehouseInventory
 *   - WarehouseStockMovement
 *   - WarehouseTransfer
 *   - Order
 *   - OrderHistory
 *
 * Usage:
 *   MONGODB_URI_TEST="mongodb://127.0.0.1:27017/mongolia_test_inventory" \
 *     npx jest src/tests/warehouseInventoryFlow.integration.test.ts --forceExit
 *
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import mongoose from "mongoose";
import { warehouseWorkflowService } from "@/services/warehouse/warehouseWorkflow.service";
import { orderShipmentService } from "@/services/warehouse/orderShipment.service";
import WarehouseInventory from "@/models/WarehouseInventory";
import WarehouseStockMovement, {
  type WarehouseStockMovementType,
} from "@/models/WarehouseStockMovement";
import WarehouseTransfer from "@/models/WarehouseTransfer";
import WarehouseReceipt from "@/models/WarehouseReceipt";
import ProductVariant from "@/models/ProductVariant";
import Product from "@/models/Product";
import Warehouse from "@/models/Warehouse";
import Order from "@/models/Order";
import { OrderHistory } from "@/models/OrderHistory";
import Gift from "@/models/Gift";
import { OrderStatus } from "@/constants/orderStatus";
import { resetWarehouseTopologyCache } from "@/config/warehouse-topology.config";

// â”€â”€â”€ DB connection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const mongoUri =
  process.env.MONGODB_URI_TEST ??
  "mongodb://127.0.0.1:27017/mongolia_test_inventory";

/**
 * Refuse to run náº¿u URI trÃ´ng giá»‘ng production DB.
 * Test DB PHáº¢I cÃ³ tÃªn chá»©a `_test` hoáº·c `_test_`.
 */
function isLikelyProductionDb(uri: string): boolean {
  const dbSegment = (uri.split("?")[0].split("/").pop() ?? "").toLowerCase();
  // Allow `mongolia_test`, `mongolia_test_inventory`, anything with _test_ or ending with _test.
  const ok = dbSegment.includes("_test") || dbSegment.endsWith("test");
  return !ok;
}

beforeAll(async () => {
  if (isLikelyProductionDb(mongoUri)) {
    throw new Error(
      `Refusing to run warehouse inventory tests against non-test database: ${mongoUri}\n` +
        `Database name MUST contain "_test" or "_test_" (case-insensitive).\n` +
        `Set MONGODB_URI_TEST to a connection string whose db name includes "_test".`
    );
  }
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  await mongoose.connect(mongoUri);
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
});

// â”€â”€â”€ Shared test data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let kho1: mongoose.Types.ObjectId;
let kho2: mongoose.Types.ObjectId;
let productId: mongoose.Types.ObjectId;
let variantId: mongoose.Types.ObjectId;
let giftId: mongoose.Types.ObjectId;
const employeeId = new mongoose.Types.ObjectId();

beforeEach(async () => {
  resetWarehouseTopologyCache();

  // Hard reset toÃ n bá»™ collections liÃªn quan.
  await Promise.all([
    WarehouseInventory.deleteMany({}),
    WarehouseStockMovement.deleteMany({}),
    WarehouseTransfer.deleteMany({}),
    WarehouseReceipt.deleteMany({}),
    Warehouse.deleteMany({ code: { $in: ["KHO1", "KHO2"] } }),
    Product.deleteMany({ code: "TEST_INV_P" }),
    ProductVariant.deleteMany({ sku: { $in: ["TEST_INV_SKU_A", "TEST_INV_SKU_B"] } }),
    Gift.deleteMany({ name: { $in: ["TEST_INV_GIFT_A", "TEST_INV_GIFT_B"] } }),
    Order.deleteMany({ orderCode: /^TEST_INV_ORDER/ }),
    OrderHistory.deleteMany({}),
  ]);

  const k1 = await Warehouse.create({
    code: "KHO1",
    name: "Kho Trung Quá»‘c (trung gian)",
    isActive: true,
  });
  kho1 = k1._id;

  const k2 = await Warehouse.create({
    code: "KHO2",
    name: "Kho MÃ´ng Cá»• (chÃ­nh)",
    isActive: true,
  });
  kho2 = k2._id;

  const product = await Product.create({
    code: "TEST_INV_P",
    name: "Product integration test",
    categoryId: new mongoose.Types.ObjectId(),
    isActive: true,
  });
  productId = product._id;

  const variant = await ProductVariant.create({
    productId,
    sku: "TEST_INV_SKU_A",
    variantValues: [],
    isActive: true,
  });
  variantId = variant._id;

  const gift = await Gift.create({
    name: "TEST_INV_GIFT_A",
    stockQuantity: 0,
    isActive: true,
  });
  giftId = gift._id;
});

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function readInventory(
  warehouseId: mongoose.Types.ObjectId,
  opts: {
    itemType?: "PRODUCT" | "GIFT";
    variantId?: mongoose.Types.ObjectId | null;
    giftId?: mongoose.Types.ObjectId | null;
  } = {}
) {
  const filter: Record<string, unknown> = { warehouseId };
  if (opts.itemType) filter.itemType = opts.itemType;
  if (opts.variantId !== undefined) filter.variantId = opts.variantId;
  if (opts.giftId !== undefined) filter.giftId = opts.giftId;
  return WarehouseInventory.findOne(filter).lean();
}

async function movementsByType(warehouseId: mongoose.Types.ObjectId) {
  const rows = await WarehouseStockMovement.find({ warehouseId }).lean();
  const result: Partial<Record<WarehouseStockMovementType, number>> = {};
  for (const r of rows) {
    result[r.type] = (result[r.type] ?? 0) + r.quantity;
  }
  return result;
}

async function assertKho1PureTransfer(
  productLine: { productId: mongoose.Types.ObjectId; variantId: mongoose.Types.ObjectId },
  giftLine: { giftId: mongoose.Types.ObjectId }
) {
  // KHO1 KHÃ”NG Ä‘Æ°á»£c cÃ³ ORDER_OUT hoáº·c ORDER_RETURN.
  const kho1ProductMovements = await WarehouseStockMovement.find({
    warehouseId: kho1,
    itemType: "PRODUCT",
    productId: productLine.productId,
    variantId: productLine.variantId,
  }).lean();
  const kho1GiftMovements = await WarehouseStockMovement.find({
    warehouseId: kho1,
    itemType: "GIFT",
    giftId: giftLine.giftId,
  }).lean();

  for (const m of [...kho1ProductMovements, ...kho1GiftMovements]) {
    if (!["IMPORT", "TRANSFER_OUT", "ADJUSTMENT"].includes(m.type)) {
      throw new Error(`KHO1 cÃ³ movement khÃ´ng há»£p lá»‡: ${m.type}`);
    }
  }
}

async function assertNoKho1OrderMovements() {
  const orderMovements = await WarehouseStockMovement.find({
    warehouseId: kho1,
    type: { $in: ["ORDER_OUT", "ORDER_RETURN"] },
  }).lean();
  expect(orderMovements).toHaveLength(0);
}

async function assertOrderReturnLeqOrderOut(orderId: mongoose.Types.ObjectId) {
  const movements = await WarehouseStockMovement.find({
    referenceType: "ORDER",
    referenceId: orderId,
  }).lean();

  type Key = string;
  const tally = new Map<Key, { out: number; ret: number }>();
  for (const m of movements) {
    const key = `${m.itemType}|${m.productId?.toString() ?? ""}|${m.variantId?.toString() ?? ""}|${m.giftId?.toString() ?? ""}`;
    const cur = tally.get(key) ?? { out: 0, ret: 0 };
    if (m.type === "ORDER_OUT") cur.out += m.quantity;
    else if (m.type === "ORDER_RETURN") cur.ret += m.quantity;
    tally.set(key, cur);
  }

  for (const [key, { out, ret }] of tally) {
    expect(ret).toBeLessThanOrEqual(out);
    if (ret > out) {
      throw new Error(
        `Invariant vi pháº¡m ORDER_RETURN(${ret}) > ORDER_OUT(${out}) cho key ${key}`
      );
    }
  }
}

async function seedKho1ToKho2({
  importQty = 100,
  transferQty = 100,
}: { importQty?: number; transferQty?: number } = {}) {
  // 1. IMPORT KHO1
  await warehouseWorkflowService.createReceipt({
    warehouseId: kho1.toString(),
    employeeId: employeeId.toString(),
    items: [
      { productId: productId.toString(), variantId: variantId.toString(), orderedQuantity: importQty, receivedQuantity: importQty },
    ],
    note: "Seed IMPORT",
  });

  // 2. TRANSFER KHO1 â†’ KHO2 (COMPLETED Ä‘á»ƒ seed sáºµn cáº£ KHO2)
  if (transferQty > 0) {
    await warehouseWorkflowService.createTransfer({
      sourceWarehouseId: kho1.toString(),
      destinationWarehouseId: kho2.toString(),
      items: [{ variantId: variantId.toString(), quantity: transferQty }],
      status: "COMPLETED",
      employeeId: employeeId.toString(),
      note: "Seed TRANSFER",
    });
  }
}


async function createOrderInKho2(opts: {
  warehouseId: mongoose.Types.ObjectId;
  status?: OrderStatus;
  productVariantId?: mongoose.Types.ObjectId;
  quantity?: number;
  /** Optional gift selections (CUSTOMER_SELECTED). */
  gifts?: Array<{ giftId: mongoose.Types.ObjectId; quantity: number }>;
}) {
  const code = `TEST_INV_ORDER_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const qty = opts.quantity ?? 1;

  // Phase 4.5: shipOrder/returnOrder derive demands tá»« orderItems[].
  // â†’ PHáº¢I táº¡o order vá»›i orderItems[] populated (Ä‘Ã£ resolve variantId).
  const orderItems: unknown[] = [];
  if (opts.productVariantId) {
    orderItems.push({
      comboId: null,
      productId,
      comboQuantity: qty,
      packageQuantity: 1,
      sellingPrice: 100,
      subtotal: qty * 100,
      discount: 0,
      details: [
        {
          productId,
          variantId: opts.productVariantId,
          quantity: qty,
          unitPrice: 100,
          attributes: [],
        },
      ],
      giftMode: opts.gifts && opts.gifts.length > 0 ? "CUSTOMER_SELECTED" : "RANDOM",
      giftSelections: (opts.gifts ?? []).map((g) => ({
        giftProductId: g.giftId,
        quantity: g.quantity,
      })),
    });
  }

  const order = await Order.create({
    orderCode: code,
    customerName: "Test Customer",
    quantity: qty,
    unitPrice: 100,
    totalAmount: qty * 100,
    currency: "MNT",
    status: opts.status ?? OrderStatus.CONFIRMED,
    warehouseId: opts.warehouseId,
    productVariantId: opts.productVariantId,
    orderItems,
    isActive: true,
  });
  return order._id as mongoose.Types.ObjectId;
}

// â”€â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("Warehouse Inventory Flow â€” happy path (1 â†’ 7)", () => {
  it("[INV-1] Import vÃ o KHO1 â†’ KHO1 tÄƒng tá»“n, cÃ³ 1 movement IMPORT", async () => {
    const before = await readInventory(kho1, { itemType: "PRODUCT", variantId });
    const startQty = before?.quantity ?? 0;

    const receipt = await warehouseWorkflowService.createReceipt({
      warehouseId: kho1.toString(),
      employeeId: employeeId.toString(),
      items: [
        { productId: productId.toString(), variantId: variantId.toString(), orderedQuantity: 100, receivedQuantity: 100 },
      ],
    });

    expect(receipt.warehouseId.toString()).toBe(kho1.toString());

    const kho1Inv = await readInventory(kho1, { itemType: "PRODUCT", variantId });
    expect(kho1Inv?.quantity).toBe(startQty + 100);
    expect(kho1Inv?.availableQuantity).toBe(startQty + 100);

    const imports = await WarehouseStockMovement.countDocuments({
      warehouseId: kho1,
      type: "IMPORT",
      referenceType: "RECEIPT",
      referenceId: receipt._id,
    });
    expect(imports).toBe(1);

    await assertNoKho1OrderMovements();
  }, 30000);

  it("[INV-2] Transfer KHO1 â†’ KHO2 giáº£m KHO1, tÄƒng KHO2, cÃ³ TRANSFER_OUT/IN movements", async () => {
    await seedKho1ToKho2({ importQty: 50, transferQty: 0 });

    const kho1Before = (await readInventory(kho1, { itemType: "PRODUCT", variantId }))!.quantity;
    const kho2Before = (await readInventory(kho2, { itemType: "PRODUCT", variantId }))?.quantity ?? 0;

    const transfer = await warehouseWorkflowService.createTransfer({
      sourceWarehouseId: kho1.toString(),
      destinationWarehouseId: kho2.toString(),
      items: [{ variantId: variantId.toString(), quantity: 20 }],
      status: "COMPLETED",
      employeeId: employeeId.toString(),
    });

    expect(transfer.status).toBe("COMPLETED");

    const kho1After = (await readInventory(kho1, { itemType: "PRODUCT", variantId }))!.quantity;
    const kho2After = (await readInventory(kho2, { itemType: "PRODUCT", variantId }))!.quantity;
    expect(kho1After).toBe(kho1Before - 20);
    expect(kho2After).toBe(kho2Before + 20);

    const outMoves = await WarehouseStockMovement.countDocuments({
      warehouseId: kho1,
      type: "TRANSFER_OUT",
      referenceType: "TRANSFER",
      referenceId: transfer._id,
    });
    const inMoves = await WarehouseStockMovement.countDocuments({
      warehouseId: kho2,
      type: "TRANSFER_IN",
      referenceType: "TRANSFER",
      referenceId: transfer._id,
    });
    expect(outMoves).toBe(1);
    expect(inMoves).toBe(1);

    await assertKho1PureTransfer({ productId, variantId }, { giftId });
  }, 30000);

  it("[INV-3] Reserve KHO2 giáº£m availableQuantity, tÄƒng reservedQuantity", async () => {
    await seedKho1ToKho2({ importQty: 100, transferQty: 80 });

    const before = await readInventory(kho2, { itemType: "PRODUCT", variantId });
    expect(before).toBeTruthy();
    const startAvailable = before!.availableQuantity;
    const startReserved = before!.reservedQuantity;

    const { reserveStock } = await import("@/services/warehouse/stockEngine.service");
    await reserveStock(
      kho2.toString(),
      [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 15 }],
      { actorEmployeeId: employeeId, orderId, referenceType: "ORDER" as never, note: "Reserve for ship" }
    );

    const after = await readInventory(kho2, { itemType: "PRODUCT", variantId });
    expect(after!.availableQuantity).toBe(startAvailable - 15);
    expect(after!.reservedQuantity).toBe(startReserved + 15);
    expect(after!.quantity).toBe(before!.quantity); // total khÃ´ng Ä‘á»•i khi reserve
  }, 30000);

  it("[INV-4] Ship KHO2 giáº£m quantity + reservedQuantity, ghi ORDER_OUT movement", async () => {
    await seedKho1ToKho2({ importQty: 50, transferQty: 50 });
    const { reserveStock } = await import("@/services/warehouse/stockEngine.service");

    const orderId = await createOrderInKho2({
      warehouseId: kho2,
      productVariantId: variantId,
      quantity: 7,
    });

    // Reserve 7 trÆ°á»›c khi ship.
    await reserveStock(
      kho2.toString(),
      [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 7 }],
      { actorEmployeeId: employeeId, orderId, referenceType: "ORDER" as never, note: "Reserve for ship" }
    );

    const before = await readInventory(kho2, { itemType: "PRODUCT", variantId });
    expect(before).toBeTruthy();

    const shipResult = await orderShipmentService.shipOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
    });
    expect(shipResult.success).toBe(true);
    if (shipResult.success) {
      expect(shipResult.alreadyShipped).toBe(false);
    }

    const after = await readInventory(kho2, { itemType: "PRODUCT", variantId });
    expect(after!.quantity).toBe(before!.quantity - 7);
    expect(after!.reservedQuantity).toBe(before!.reservedQuantity - 7);

    const orderOuts = await WarehouseStockMovement.countDocuments({
      warehouseId: kho2,
      type: "ORDER_OUT",
      referenceType: "ORDER",
      referenceId: orderId,
    });
    expect(orderOuts).toBe(1);

    const order = await Order.findById(orderId).lean();
    expect(order?.status).toBe(OrderStatus.SHIPPING);

    // OrderHistory cÃ³ action SHIPPING.
    const shippingHistory = await OrderHistory.countDocuments({
      orderId,
      action: "SHIPPING",
    });
    expect(shippingHistory).toBeGreaterThanOrEqual(1);

    await assertNoKho1OrderMovements();
    await assertOrderReturnLeqOrderOut(orderId);
  }, 30000);

  it("[INV-5] DELIVERED â†’ inventory KHO2 KHÃ”NG tÄƒng láº¡i (no auto-credit on deliver)", async () => {
    await seedKho1ToKho2({ importQty: 30, transferQty: 30 });
    const { reserveStock } = await import("@/services/warehouse/stockEngine.service");

    const orderId = await createOrderInKho2({
      warehouseId: kho2,
      productVariantId: variantId,
      quantity: 3,
    });
    await reserveStock(
      kho2.toString(),
      [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 3 }],
      { actorEmployeeId: employeeId, orderId, referenceType: "ORDER" as never, note: "Reserve" }
    );

    const shipResult = await orderShipmentService.shipOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
    });
    expect(shipResult.success).toBe(true);

    const afterShip = await readInventory(kho2, { itemType: "PRODUCT", variantId });

    // Status â†’ DELIVERED. inventory KHÃ”NG thay Ä‘á»•i.
    await Order.updateOne({ _id: orderId }, { $set: { status: OrderStatus.DELIVERED } });

    const afterDeliver = await readInventory(kho2, { itemType: "PRODUCT", variantId });
    expect(afterDeliver!.quantity).toBe(afterShip!.quantity);
    expect(afterDeliver!.availableQuantity).toBe(afterShip!.availableQuantity);
    expect(afterDeliver!.reservedQuantity).toBe(afterShip!.reservedQuantity);

    // KhÃ´ng cÃ³ ORDER_RETURN.
    const returns = await WarehouseStockMovement.countDocuments({
      referenceType: "ORDER",
      referenceId: orderId,
      type: "ORDER_RETURN",
    });
    expect(returns).toBe(0);

    await assertOrderReturnLeqOrderOut(orderId);
  }, 30000);

  it("[INV-6] RETURNED â†’ inventory KHO2 tÄƒng láº¡i Ä‘Ãºng shipped quantity", async () => {
    await seedKho1ToKho2({ importQty: 30, transferQty: 30 });
    const { reserveStock } = await import("@/services/warehouse/stockEngine.service");

    const orderId = await createOrderInKho2({
      warehouseId: kho2,
      productVariantId: variantId,
      quantity: 4,
    });
    await reserveStock(
      kho2.toString(),
      [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 4 }],
      { actorEmployeeId: employeeId, orderId, referenceType: "ORDER" as never, note: "Reserve" }
    );

    await orderShipmentService.shipOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
    });

    const afterShip = await readInventory(kho2, { itemType: "PRODUCT", variantId });
    expect(afterShip!.quantity).toBe(30 - 4);

    await Order.updateOne({ _id: orderId }, { $set: { status: OrderStatus.RETURNED } });

    const returnResult = await orderShipmentService.returnOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
      items: [
        {
          itemType: "PRODUCT",
          productId: productId.toString(),
          variantId: variantId.toString(),
          quantity: 4,
        },
      ],
    });
    expect(returnResult.success).toBe(true);
    if (returnResult.success) {
      expect(returnResult.alreadyReturned).toBe(false);
    }

    const afterReturn = await readInventory(kho2, { itemType: "PRODUCT", variantId });
    expect(afterReturn!.quantity).toBe(afterShip!.quantity + 4);
    expect(afterReturn!.availableQuantity).toBe(afterShip!.availableQuantity + 4);

    const returns = await WarehouseStockMovement.countDocuments({
      warehouseId: kho2,
      type: "ORDER_RETURN",
      referenceType: "ORDER",
      referenceId: orderId,
    });
    expect(returns).toBe(1);

    await assertOrderReturnLeqOrderOut(orderId);
    await assertNoKho1OrderMovements();
  }, 30000);

  it("[INV-7] Retry return trÃªn cÃ¹ng Ä‘Æ¡n KHÃ”NG tÄƒng inventory láº§n 2 (idempotent)", async () => {
    await seedKho1ToKho2({ importQty: 25, transferQty: 25 });
    const { reserveStock } = await import("@/services/warehouse/stockEngine.service");

    const orderId = await createOrderInKho2({
      warehouseId: kho2,
      productVariantId: variantId,
      quantity: 5,
    });
    await reserveStock(
      kho2.toString(),
      [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 5 }],
      { actorEmployeeId: employeeId, orderId, referenceType: "ORDER" as never, note: "Reserve" }
    );
    await orderShipmentService.shipOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
    });
    await Order.updateOne({ _id: orderId }, { $set: { status: OrderStatus.RETURNED } });

    // Return láº§n 1.
    const first = await orderShipmentService.returnOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
      items: [
        { itemType: "PRODUCT", productId: productId.toString(), variantId: variantId.toString(), quantity: 5 },
      ],
    });
    expect(first.success).toBe(true);
    if (first.success) {
      expect(first.alreadyReturned).toBe(false);
    }

    const afterFirst = await readInventory(kho2, { itemType: "PRODUCT", variantId });

    // Return láº§n 2 (retry) â€” pháº£i lÃ  no-op.
    const second = await orderShipmentService.returnOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
      items: [
        { itemType: "PRODUCT", productId: productId.toString(), variantId: variantId.toString(), quantity: 5 },
      ],
    });
    expect(second.success).toBe(true);
    if (second.success) {
      expect(second.alreadyReturned).toBe(true);
    }

    const afterSecond = await readInventory(kho2, { itemType: "PRODUCT", variantId });
    expect(afterSecond!.quantity).toBe(afterFirst!.quantity);
    expect(afterSecond!.availableQuantity).toBe(afterFirst!.availableQuantity);

    // Váº«n chá»‰ cÃ³ Ä‘Ãºng 1 movement ORDER_RETURN.
    const returns = await WarehouseStockMovement.countDocuments({
      warehouseId: kho2,
      type: "ORDER_RETURN",
      referenceType: "ORDER",
      referenceId: orderId,
    });
    expect(returns).toBe(1);

    await assertOrderReturnLeqOrderOut(orderId);
  }, 30000);
});

describe("Warehouse Inventory Flow â€” concurrency (8 â†’ 11)", () => {
  async function seedOrderForReturn(shippedQty: number) {
    await seedKho1ToKho2({ importQty: 100, transferQty: 100 });
    const { reserveStock } = await import("@/services/warehouse/stockEngine.service");

    const orderId = await createOrderInKho2({
      warehouseId: kho2,
      productVariantId: variantId,
      quantity: shippedQty,
    });
    await reserveStock(
      kho2.toString(),
      [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: shippedQty }],
      { actorEmployeeId: employeeId, orderId, referenceType: "ORDER" as never, note: "Reserve" }
    );
    await orderShipmentService.shipOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
    });
    await Order.updateOne({ _id: orderId }, { $set: { status: OrderStatus.RETURNED } });
    return orderId;
  }

  it("[INV-8] Concurrent return (5 + 5) trÃªn cÃ¹ng Ä‘Æ¡n ship 5 â†’ Ä‘Ãºng 5 cá»™ng láº¡i, 1 movement", async () => {
    const orderId = await seedOrderForReturn(5);

    const afterShip = await readInventory(kho2, { itemType: "PRODUCT", variantId });
    expect(afterShip!.quantity).toBe(100 - 5);

    const [a, b] = await Promise.allSettled([
      orderShipmentService.returnOrder({
        orderId: orderId.toString(),
        employeeId: employeeId.toString(),
        items: [{ itemType: "PRODUCT", productId: productId.toString(), variantId: variantId.toString(), quantity: 5 }],
      }),
      orderShipmentService.returnOrder({
        orderId: orderId.toString(),
        employeeId: employeeId.toString(),
        items: [{ itemType: "PRODUCT", productId: productId.toString(), variantId: variantId.toString(), quantity: 5 }],
      }),
    ]);

    const fulfilled = [a, b].filter((r) => r.status === "fulfilled").length;
    expect(fulfilled).toBe(1);

    const after = await readInventory(kho2, { itemType: "PRODUCT", variantId });
    // Cá»™ng Ä‘Ãºng 5 (khÃ´ng 10).
    expect(after!.quantity).toBe(afterShip!.quantity + 5);

    const returns = await WarehouseStockMovement.countDocuments({
      warehouseId: kho2,
      type: "ORDER_RETURN",
      referenceType: "ORDER",
      referenceId: orderId,
    });
    expect(returns).toBe(1);

    await assertOrderReturnLeqOrderOut(orderId);
  }, 30000);

  it("[INV-9] Concurrent return (3 + 3) trÃªn Ä‘Æ¡n ship 6 â†’ Ä‘Ãºng 6 cá»™ng láº¡i", async () => {
    const orderId = await seedOrderForReturn(6);

    const afterShip = await readInventory(kho2, { itemType: "PRODUCT", variantId });

    const [a, b] = await Promise.allSettled([
      orderShipmentService.returnOrder({
        orderId: orderId.toString(),
        employeeId: employeeId.toString(),
        items: [{ itemType: "PRODUCT", productId: productId.toString(), variantId: variantId.toString(), quantity: 3 }],
      }),
      orderShipmentService.returnOrder({
        orderId: orderId.toString(),
        employeeId: employeeId.toString(),
        items: [{ itemType: "PRODUCT", productId: productId.toString(), variantId: variantId.toString(), quantity: 3 }],
      }),
    ]);

    const fulfilled = [a, b].filter((r) => r.status === "fulfilled").length;
    expect(fulfilled).toBe(1);

    const after = await readInventory(kho2, { itemType: "PRODUCT", variantId });
    expect(after!.quantity).toBe(afterShip!.quantity + 6);

    const returns = await WarehouseStockMovement.countDocuments({
      warehouseId: kho2,
      type: "ORDER_RETURN",
      referenceType: "ORDER",
      referenceId: orderId,
    });
    expect(returns).toBe(1);

    await assertOrderReturnLeqOrderOut(orderId);
  }, 30000);

  it("[INV-10] Concurrent receive transfer 2 láº§n â†’ Ä‘Ãºng 1 láº§n nháº­n", async () => {
    await seedKho1ToKho2({ importQty: 40, transferQty: 0 });

    const transfer = await warehouseWorkflowService.createTransfer({
      sourceWarehouseId: kho1.toString(),
      destinationWarehouseId: kho2.toString(),
      items: [{ variantId: variantId.toString(), quantity: 15 }],
      status: "SENT",
      employeeId: employeeId.toString(),
    });

    const kho1Before = (await readInventory(kho1, { itemType: "PRODUCT", variantId }))!.quantity;
    const kho2Before = (await readInventory(kho2, { itemType: "PRODUCT", variantId }))?.quantity ?? 0;

    const [a, b] = await Promise.allSettled([
      warehouseWorkflowService.receiveTransfer({
        transferId: transfer._id.toString(),
        employeeId: employeeId.toString(),
        receivedQuantities: [15],
      }),
      warehouseWorkflowService.receiveTransfer({
        transferId: transfer._id.toString(),
        employeeId: employeeId.toString(),
        receivedQuantities: [15],
      }),
    ]);

    const fulfilled = [a, b].filter((r) => r.status === "fulfilled").length;
    expect(fulfilled).toBe(1);

    const kho1After = (await readInventory(kho1, { itemType: "PRODUCT", variantId }))!.quantity;
    const kho2After = (await readInventory(kho2, { itemType: "PRODUCT", variantId }))!.quantity;

    // KHO1 giá»¯ nguyÃªn (Ä‘Ã£ trá»« khi SENT), KHO2 cá»™ng Ä‘Ãºng 15.
    expect(kho1After).toBe(kho1Before);
    expect(kho2After).toBe(kho2Before + 15);

    // Transfer status pháº£i lÃ  RECEIVED.
    const transferAfter = await WarehouseTransfer.findById(transfer._id).lean();
    expect(transferAfter?.status).toBe("RECEIVED");

    await assertNoKho1OrderMovements();
  }, 30000);

  it("[INV-11] Retry receive transfer sau khi Ä‘Ã£ receive â†’ khÃ´ng double-credit", async () => {
    await seedKho1ToKho2({ importQty: 40, transferQty: 0 });

    const transfer = await warehouseWorkflowService.createTransfer({
      sourceWarehouseId: kho1.toString(),
      destinationWarehouseId: kho2.toString(),
      items: [{ variantId: variantId.toString(), quantity: 12 }],
      status: "SENT",
      employeeId: employeeId.toString(),
    });

    const first = await warehouseWorkflowService.receiveTransfer({
      transferId: transfer._id.toString(),
      employeeId: employeeId.toString(),
      receivedQuantities: [12],
    });
    expect(first?.status).toBe("RECEIVED");

    const kho2AfterFirst = (await readInventory(kho2, { itemType: "PRODUCT", variantId }))!.quantity;

    // Retry: pháº£i bá»‹ reject (409 / TRANSFER_NOT_SENT).
    await expect(
      warehouseWorkflowService.receiveTransfer({
        transferId: transfer._id.toString(),
        employeeId: employeeId.toString(),
        receivedQuantities: [12],
      })
    ).rejects.toThrow(/SENT|RECEIVED|TRANSFER_NOT_SENT|conflict/i);

    const kho2AfterRetry = (await readInventory(kho2, { itemType: "PRODUCT", variantId }))!.quantity;
    expect(kho2AfterRetry).toBe(kho2AfterFirst);

    const transferIns = await WarehouseStockMovement.countDocuments({
      type: "TRANSFER_IN",
      referenceType: "TRANSFER",
      referenceId: transfer._id,
    });
    expect(transferIns).toBe(1);
  }, 30000);
});

describe("Warehouse Inventory Flow â€” topology guards (12 â†’ 15)", () => {
  it("[INV-12] Transfer KHO2 â†’ KHO1 pháº£i REJECT theo topology", async () => {
    await seedKho1ToKho2({ importQty: 20, transferQty: 20 });

    await expect(
      warehouseWorkflowService.createTransfer({
        sourceWarehouseId: kho2.toString(),
        destinationWarehouseId: kho1.toString(),
        items: [{ variantId: variantId.toString(), quantity: 5 }],
        employeeId: employeeId.toString(),
      })
    ).rejects.toThrow(/KHO1|TRANSFER|topology/i);

    // KhÃ´ng cÃ³ TRANSFER_OUT movements má»›i á»Ÿ KHO2 (váº«n chá»‰ cÃ³ TRANSFER_IN tá»« seed).
    const kho2TransferOut = await WarehouseStockMovement.countDocuments({
      warehouseId: kho2,
      type: "TRANSFER_OUT",
    });
    expect(kho2TransferOut).toBe(0);

    // KHO1 khÃ´ng cÃ³ TRANSFER_IN movements (váº«n chá»‰ IMPORT + TRANSFER_OUT tá»« seed).
    const kho1TransferIn = await WarehouseStockMovement.countDocuments({
      warehouseId: kho1,
      type: "TRANSFER_IN",
    });
    expect(kho1TransferIn).toBe(0);
  }, 30000);

  it("[INV-13] Order warehouse = KHO1 pháº£i REJECT", async () => {
    await seedKho1ToKho2({ importQty: 10, transferQty: 10 });

    const orderId = await createOrderInKho2({
      warehouseId: kho1, // â† KHO1 must reject
      productVariantId: variantId,
      quantity: 1,
    });

    const result = await orderShipmentService.shipOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/KHO1|KHO2|topology/i);
    }

    // KHO1 khÃ´ng cÃ³ ORDER_OUT movement.
    const kho1OrderOut = await WarehouseStockMovement.countDocuments({
      warehouseId: kho1,
      type: "ORDER_OUT",
    });
    expect(kho1OrderOut).toBe(0);

    await assertNoKho1OrderMovements();
  }, 30000);

  it("[INV-14] KHO1 tuyá»‡t Ä‘á»‘i khÃ´ng cÃ³ ORDER_OUT movement (invariant)", async () => {
    await seedKho1ToKho2({ importQty: 30, transferQty: 30 });
    const { reserveStock } = await import("@/services/warehouse/stockEngine.service");

    // Ship nhiá»u Ä‘Æ¡n tá»« KHO2 â€” verify KHO1 khÃ´ng bá»‹ áº£nh hÆ°á»Ÿng.
    const orderIds: mongoose.Types.ObjectId[] = [];
    for (let i = 0; i < 3; i++) {
      const orderId = await createOrderInKho2({
        warehouseId: kho2,
        productVariantId: variantId,
        quantity: 2,
      });
      await reserveStock(
        kho2.toString(),
        [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 2 }],
        { actorEmployeeId: employeeId, orderId, referenceType: "ORDER" as never, note: "Reserve" }
      );
      const r = await orderShipmentService.shipOrder({
        orderId: orderId.toString(),
        employeeId: employeeId.toString(),
      });
      expect(r.success).toBe(true);
      orderIds.push(orderId);
    }

    const kho1Movements = await movementsByType(kho1);
    expect(kho1Movements.ORDER_OUT ?? 0).toBe(0);

    await assertNoKho1OrderMovements();
    for (const orderId of orderIds) {
      await assertOrderReturnLeqOrderOut(orderId);
    }
  }, 30000);

  it("[INV-15] KHO1 tuyá»‡t Ä‘á»‘i khÃ´ng cÃ³ ORDER_RETURN movement (invariant)", async () => {
    await seedKho1ToKho2({ importQty: 30, transferQty: 30 });
    const { reserveStock } = await import("@/services/warehouse/stockEngine.service");

    const orderId = await createOrderInKho2({
      warehouseId: kho2,
      productVariantId: variantId,
      quantity: 5,
    });
    await reserveStock(
      kho2.toString(),
      [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 5 }],
      { actorEmployeeId: employeeId, orderId, referenceType: "ORDER" as never, note: "Reserve" }
    );
    await orderShipmentService.shipOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
    });
    await Order.updateOne({ _id: orderId }, { $set: { status: OrderStatus.RETURNED } });

    await orderShipmentService.returnOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
      items: [{ itemType: "PRODUCT", productId: productId.toString(), variantId: variantId.toString(), quantity: 5 }],
    });

    const kho1Movements = await movementsByType(kho1);
    expect(kho1Movements.ORDER_RETURN ?? 0).toBe(0);

    await assertNoKho1OrderMovements();
    await assertOrderReturnLeqOrderOut(orderId);
  }, 30000);
});

describe("Warehouse Inventory Flow â€” global invariants", () => {
  it("[INV-GLOBAL] ToÃ n bá»™ lifecycle giá»¯ invariant KHO1/KHO2 role", async () => {
    // Cháº¡y full flow trÃªn nhiá»u Ä‘Æ¡n + gifts.
    await warehouseWorkflowService.createReceipt({
      warehouseId: kho1.toString(),
      employeeId: employeeId.toString(),
      items: [{ productId: productId.toString(), variantId: variantId.toString(), orderedQuantity: 60, receivedQuantity: 60 }],
      note: "Init IMPORT",
    });
    await warehouseWorkflowService.createReceipt({
      warehouseId: kho1.toString(),
      employeeId: employeeId.toString(),
      items: [{ giftId: giftId.toString(), orderedQuantity: 30, receivedQuantity: 30 }],
      note: "Init GIFT IMPORT",
    });
    await warehouseWorkflowService.createTransfer({
      sourceWarehouseId: kho1.toString(),
      destinationWarehouseId: kho2.toString(),
      items: [{ variantId: variantId.toString(), quantity: 50 }],
      status: "COMPLETED",
      employeeId: employeeId.toString(),
    });
    await warehouseWorkflowService.createTransfer({
      sourceWarehouseId: kho1.toString(),
      destinationWarehouseId: kho2.toString(),
      items: [{ giftId: giftId.toString(), quantity: 25 }],
      status: "COMPLETED",
      employeeId: employeeId.toString(),
    });

    const { reserveStock } = await import("@/services/warehouse/stockEngine.service");

    // 2 Ä‘Æ¡n, má»—i Ä‘Æ¡n 5 product + 3 gift.
    const orderIds: mongoose.Types.ObjectId[] = [];
    for (let i = 0; i < 2; i++) {
      const orderId = await createOrderInKho2({
        warehouseId: kho2,
        productVariantId: variantId,
        quantity: 5,
      });
      await reserveStock(
        kho2.toString(),
        [{ itemType: "PRODUCT", productVariantId: variantId.toString(), quantity: 5 }],
        { actorEmployeeId: employeeId, orderId, referenceType: "ORDER" as never, note: "Reserve" }
      );
      const ship = await orderShipmentService.shipOrder({
        orderId: orderId.toString(),
        employeeId: employeeId.toString(),
        actualShipments: [
          { itemType: "PRODUCT", productId: productId.toString(), variantId: variantId.toString(), quantity: 5 },
          { itemType: "GIFT", giftId: giftId.toString(), quantity: 3 },
        ],
      });
      expect(ship.success).toBe(true);
      orderIds.push(orderId);
    }

    // Return Ä‘Æ¡n 1 (5 product + 3 gift).
    await Order.updateOne({ _id: orderIds[0] }, { $set: { status: OrderStatus.RETURNED } });
    const r1 = await orderShipmentService.returnOrder({
      orderId: orderIds[0].toString(),
      employeeId: employeeId.toString(),
      items: [
        { itemType: "PRODUCT", productId: productId.toString(), variantId: variantId.toString(), quantity: 5 },
        { itemType: "GIFT", giftId: giftId.toString(), quantity: 3 },
      ],
    });
    expect(r1.success).toBe(true);

    // â”€â”€ Invariants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    // KHO1 chá»‰ cÃ³ IMPORT + TRANSFER_OUT.
    const kho1Types = await movementsByType(kho1);
    expect(kho1Types.ORDER_OUT ?? 0).toBe(0);
    expect(kho1Types.ORDER_RETURN ?? 0).toBe(0);
    expect((kho1Types.IMPORT ?? 0)).toBeGreaterThan(0); // 60 product + 30 gift = 90
    expect((kho1Types.TRANSFER_OUT ?? 0)).toBeGreaterThan(0); // 50 product + 25 gift = 75

    // KHO2 chá»‰ cÃ³ TRANSFER_IN + ORDER_OUT (+ ORDER_RETURN náº¿u return).
    const kho2Types = await movementsByType(kho2);
    expect(kho2Types.IMPORT ?? 0).toBe(0);
    expect((kho2Types.TRANSFER_IN ?? 0)).toBeGreaterThan(0);
    expect((kho2Types.ORDER_OUT ?? 0)).toBe(10); // 2 Ä‘Æ¡n Ã— 5 product
    expect((kho2Types.ORDER_RETURN ?? 0)).toBeGreaterThanOrEqual(5); // Ä‘Æ¡n 1: 5 product + 3 gift = 8

    // Invariant: ORDER_RETURN <= ORDER_OUT theo tá»«ng (orderId, itemType, variant/gift).
    for (const orderId of orderIds) {
      await assertOrderReturnLeqOrderOut(orderId);
    }

    // KHO2 inventory sau cÃ¹ng: tá»•ng quantity khá»›p vá»›i tá»•ng TRANSFER_IN âˆ’ ORDER_OUT + ORDER_RETURN.
    const kho2Product = await readInventory(kho2, { itemType: "PRODUCT", variantId });
    expect(kho2Product).toBeTruthy();
    // Expected: 50 (TRANSFER_IN) - 2*5 (ORDER_OUT) + 5 (ORDER_RETURN) = 40
    expect(kho2Product!.quantity).toBe(50 - 10 + 5);
    expect(kho2Product!.availableQuantity).toBe(40); // khÃ´ng cÃ²n reserved

    const kho2Gift = await readInventory(kho2, { itemType: "GIFT", giftId });
    expect(kho2Gift).toBeTruthy();
    // Expected: 25 (TRANSFER_IN) - 2*3 (ORDER_OUT) + 3 (ORDER_RETURN) = 19
    expect(kho2Gift!.quantity).toBe(25 - 6 + 3);
  }, 60000);
});

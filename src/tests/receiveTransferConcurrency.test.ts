/**
 * ============================================================
 * CONCURRENCY TESTS — receiveTransfer()
 * ============================================================
 *
 * Guards against double-receive bugs under concurrent
 * requests and client retry patterns.
 *
 * Required invariants after every test:
 *   I1. WarehouseInventory.quantity increased by AT MOST the
 *       received quantity (no double-credit under concurrent races).
 *   I2. Exactly one TRANSFER_IN movement per receive call — duplicate
 *       inserts are not allowed.
 *   I3. Transfer status ends at RECEIVED exactly once.
 *
 * Database: defaults to mongolia_test. Refuses to run against a
 * non-test database (db name must include "_test" or end in "test").
 *
 * Usage:
 *   MONGODB_URI_TEST="mongodb://127.0.0.1:27017/mongolia_test_recv" \
 *     npx jest src/tests/receiveTransferConcurrency.test.ts --forceExit
 *
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import mongoose from "mongoose";
import { warehouseWorkflowService } from "@/services/warehouse/warehouseWorkflow.service";
import WarehouseInventory from "@/models/WarehouseInventory";
import WarehouseStockMovement from "@/models/WarehouseStockMovement";
import WarehouseTransfer from "@/models/WarehouseTransfer";
import ProductVariant from "@/models/ProductVariant";
import Product from "@/models/Product";
import Warehouse from "@/models/Warehouse";

// ─── DB connection ────────────────────────────────────────────────────────────

const mongoUri =
  process.env.MONGODB_URI_TEST ??
  "mongodb://127.0.0.1:27017/mongolia_test_recv";

function isLikelyProductionDb(uri: string): boolean {
  const dbSegment = uri.split("?")[0].split("/").pop() ?? "";
  return !dbSegment.includes("_test") && !dbSegment.endsWith("test");
}

// ─── Shared test data ─────────────────────────────────────────────────────────

let sourceWarehouseId: mongoose.Types.ObjectId;
let destWarehouseId: mongoose.Types.ObjectId;
let productId: mongoose.Types.ObjectId;
let variantId: mongoose.Types.ObjectId;
const employeeId = new mongoose.Types.ObjectId();

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
    WarehouseTransfer.deleteMany({}),
    Warehouse.deleteMany({ code: { $in: ["KHO1", "KHO2", "TEST_RECV_SRC", "TEST_RECV_DST"] } }),
    Product.deleteMany({ code: "TEST_RECV_P" }),
    ProductVariant.deleteMany({ sku: "TEST_RECV_SKU" }),
  ]);

  // Topology rule: source=KHO1, destination=KHO2.
  const src = await Warehouse.create({
    code: "KHO1",
    name: "Kho nguồn test",
    isActive: true,
  });
  sourceWarehouseId = src._id;

  const dst = await Warehouse.create({
    code: "KHO2",
    name: "Kho đích test",
    isActive: true,
  });
  destWarehouseId = dst._id;

  const product = await Product.create({
    code: "TEST_RECV_P",
    name: "Product receive test",
    categoryId: new mongoose.Types.ObjectId(),
    isActive: true,
  });
  productId = product._id;

  const variant = await ProductVariant.create({
    productId,
    sku: "TEST_RECV_SKU",
    variantValues: { color: "red" },
    isActive: true,
  });
  variantId = variant._id;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Seed a SENT transfer: source has 20 units, destination starts empty,
 * transfer sends 7 (so destination has inTransitQuantity=7).
 */
async function seedSentTransfer(opts: { sentQuantity: number }) {
  await WarehouseInventory.create({
    warehouseId: sourceWarehouseId,
    itemType: "PRODUCT",
    productId,
    variantId,
    quantity: 20,
    availableQuantity: 20,
    inTransitQuantity: 0,
    reservedQuantity: 0,
    shippedQuantity: 0,
    isActive: true,
  });

  const transfer = await warehouseWorkflowService.createTransfer({
    sourceWarehouseId: sourceWarehouseId.toString(),
    destinationWarehouseId: destWarehouseId.toString(),
    items: [{ variantId: variantId.toString(), quantity: opts.sentQuantity }],
    status: "SENT",
    employeeId: employeeId.toString(),
  });

  // Source: 20 - 7 = 13 quantity
  const srcInv = await WarehouseInventory.findOne({
    warehouseId: sourceWarehouseId,
    itemType: "PRODUCT",
    variantId,
  }).lean();
  expect(srcInv?.quantity).toBe(20 - opts.sentQuantity);

  // Destination: quantity=0, inTransitQuantity=7
  const dstInv = await WarehouseInventory.findOne({
    warehouseId: destWarehouseId,
    itemType: "PRODUCT",
    variantId,
  }).lean();
  expect(dstInv?.quantity).toBe(0);
  expect(dstInv?.inTransitQuantity).toBe(opts.sentQuantity);

  return transfer;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("receiveTransfer — atomic status transition", () => {
  it("[RCV-1] Two concurrent receives of the same SENT transfer → exactly one credit", async () => {
    const transfer = await seedSentTransfer({ sentQuantity: 7 });

    const receivedQuantities = [7];

    const [a, b] = await Promise.allSettled([
      warehouseWorkflowService.receiveTransfer({
        transferId: transfer._id.toString(),
        employeeId: employeeId.toString(),
        receivedQuantities,
      }),
      warehouseWorkflowService.receiveTransfer({
        transferId: transfer._id.toString(),
        employeeId: employeeId.toString(),
        receivedQuantities,
      }),
    ]);

    const fulfilled = [a, b].filter((r) => r.status === "fulfilled");
    const rejected = [a, b].filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // Destination: inTransitQuantity back to 0, quantity=7
    const dstInv = await WarehouseInventory.findOne({
      warehouseId: destWarehouseId,
      itemType: "PRODUCT",
      variantId,
    }).lean();
    expect(dstInv).toBeTruthy();
    expect(dstInv!.quantity).toBe(7);
    expect(dstInv!.inTransitQuantity).toBe(0);
    expect(dstInv!.availableQuantity).toBe(7);

    // Exactly one TRANSFER_IN movement for this transfer.
    const transferIns = await WarehouseStockMovement.find({
      type: "TRANSFER_IN",
      referenceType: "TRANSFER",
      referenceId: transfer._id,
    }).lean();
    expect(transferIns).toHaveLength(1);
    expect(transferIns[0].quantity).toBe(7);

    // Transfer status RECEIVED.
    const updated = await WarehouseTransfer.findById(transfer._id).lean();
    expect(updated?.status).toBe("RECEIVED");
    expect(updated?.receivedBy?.toString()).toBe(employeeId.toString());

    // Source unchanged (still 13).
    const srcInv = await WarehouseInventory.findOne({
      warehouseId: sourceWarehouseId,
      itemType: "PRODUCT",
      variantId,
    }).lean();
    expect(srcInv?.quantity).toBe(13);
  }, 30000);

  it("[RCV-2] Retry-after-network-blip: client retries receive after server-committed → idempotent no-op", async () => {
    const transfer = await seedSentTransfer({ sentQuantity: 5 });

    const receivedQuantities = [5];

    // First call (client thinks it failed).
    const first = await warehouseWorkflowService.receiveTransfer({
      transferId: transfer._id.toString(),
      employeeId: employeeId.toString(),
      receivedQuantities,
    });
    expect(first).toBeTruthy();

    // Retry with the SAME payload.
    let retryError: (Error & { status?: number; code?: string }) | null = null;
    try {
      await warehouseWorkflowService.receiveTransfer({
        transferId: transfer._id.toString(),
        employeeId: employeeId.toString(),
        receivedQuantities,
      });
    } catch (err) {
      retryError = err as Error & { status?: number; code?: string };
    }
    expect(retryError).not.toBeNull();
    expect(retryError?.code).toBe("TRANSFER_NOT_SENT");
    expect(retryError?.status).toBe(409);

    // Inventory credited ONCE: +5, not +10.
    const dstInv = await WarehouseInventory.findOne({
      warehouseId: destWarehouseId,
      itemType: "PRODUCT",
      variantId,
    }).lean();
    expect(dstInv!.quantity).toBe(5);
    expect(dstInv!.inTransitQuantity).toBe(0);

    // Only one TRANSFER_IN movement.
    const transferIns = await WarehouseStockMovement.find({
      type: "TRANSFER_IN",
      referenceType: "TRANSFER",
      referenceId: transfer._id,
    }).lean();
    expect(transferIns).toHaveLength(1);
    expect(transferIns[0].quantity).toBe(5);
  }, 30000);

  it("[RCV-3] Stress: 5 concurrent receives → exactly one credit", async () => {
    const transfer = await seedSentTransfer({ sentQuantity: 3 });

    const receivedQuantities = [3];

    const runs = Array.from({ length: 5 }, () =>
      warehouseWorkflowService.receiveTransfer({
        transferId: transfer._id.toString(),
        employeeId: employeeId.toString(),
        receivedQuantities,
      })
    );

    const results = await Promise.allSettled(runs);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(4);

    for (const r of rejected) {
      const err = (r as PromiseRejectedResult).reason as Error & { code?: string };
      expect(err.code).toBe("TRANSFER_NOT_SENT");
    }

    // Inventory credited ONCE: +3, not +15.
    const dstInv = await WarehouseInventory.findOne({
      warehouseId: destWarehouseId,
      itemType: "PRODUCT",
      variantId,
    }).lean();
    expect(dstInv!.quantity).toBe(3);
    expect(dstInv!.inTransitQuantity).toBe(0);

    // Only one TRANSFER_IN movement.
    const transferIns = await WarehouseStockMovement.find({
      type: "TRANSFER_IN",
      referenceType: "TRANSFER",
      referenceId: transfer._id,
    }).lean();
    expect(transferIns).toHaveLength(1);
    expect(transferIns[0].quantity).toBe(3);

    // Transfer status RECEIVED.
    const updated = await WarehouseTransfer.findById(transfer._id).lean();
    expect(updated?.status).toBe("RECEIVED");
  }, 30000);

  it("[RCV-4] Partial receive (4/7) → destination quantity=4, inTransit=3, one TRANSFER_IN", async () => {
    const transfer = await seedSentTransfer({ sentQuantity: 7 });

    await warehouseWorkflowService.receiveTransfer({
      transferId: transfer._id.toString(),
      employeeId: employeeId.toString(),
      receivedQuantities: [4],
    });

    const dstInv = await WarehouseInventory.findOne({
      warehouseId: destWarehouseId,
      itemType: "PRODUCT",
      variantId,
    }).lean();
    expect(dstInv!.quantity).toBe(4);
    expect(dstInv!.inTransitQuantity).toBe(3);
    expect(dstInv!.availableQuantity).toBe(4);

    const transferIns = await WarehouseStockMovement.find({
      type: "TRANSFER_IN",
      referenceType: "TRANSFER",
      referenceId: transfer._id,
    }).lean();
    expect(transferIns).toHaveLength(1);
    expect(transferIns[0].quantity).toBe(4);

    const updated = await WarehouseTransfer.findById(transfer._id).lean();
    expect(updated?.status).toBe("RECEIVED");
    expect(updated?.items[0].receivedQuantity).toBe(4);
    expect(updated?.items[0].difference).toBe(4 - 7);
  }, 30000);
});
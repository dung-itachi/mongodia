/**
 * ============================================================
 * WAREHOUSE TOPOLOGY ENFORCEMENT — KHO1 / KHO2
 * ============================================================
 *
 * Business rule (single source of truth):
 *
 *   KHO1 = Kho Trung Quốc = kho trung gian.
 *   KHO2 = Kho Mông Cổ = kho chính bán hàng.
 *
 * Topology hợp lệ DUY NHẤT:
 *
 *   IMPORT  : Nhà sản xuất → KHO1
 *   TRANSFER: KHO1 → KHO2
 *   ORDER   : KHO2 → Khách hàng
 *   RETURN  : Khách hàng → KHO2
 *
 * KHÔNG tồn tại:
 *   - KHO2 → KHO1
 *   - KHO1 → Khách hàng
 *   - KHO1 → ORDER
 *   - IMPORT trực tiếp vào KHO2 từ workflow nhập NCC
 *
 * Resolve dùng `Warehouse.code` (UPPERCASE), KHÔNG hard-code ObjectId.
 *
 * Required invariants after every test:
 *   I1. IMPORT only credits KHO1.
 *   I2. TRANSFER only allows KHO1 → KHO2 (reject other directions / same).
 *   I3. Order reserve / ship / return only operate on KHO2.
 *
 * Database: defaults to mongolia_test_topology. Refuses to run against
 * a non-test database (db name must include "_test" or end in "test").
 *
 * Usage:
 *   MONGODB_URI_TEST="mongodb://127.0.0.1:27017/mongolia_test_topology" \
 *     npx jest src/tests/warehouseTopology.test.ts --forceExit
 *
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import mongoose from "mongoose";
import { warehouseWorkflowService } from "@/services/warehouse/warehouseWorkflow.service";
import { orderShipmentService } from "@/services/warehouse/orderShipment.service";
import WarehouseInventory from "@/models/WarehouseInventory";
import WarehouseStockMovement from "@/models/WarehouseStockMovement";
import WarehouseTransfer from "@/models/WarehouseTransfer";
import WarehouseReceipt from "@/models/WarehouseReceipt";
import ProductVariant from "@/models/ProductVariant";
import Product from "@/models/Product";
import Warehouse from "@/models/Warehouse";
import Order from "@/models/Order";
import { OrderStatus } from "@/constants/orderStatus";
import {
  validateOrderWarehouse,
  validateTransferDirection,
  validateImportTarget,
  resetWarehouseTopologyCache,
} from "@/config/warehouse-topology.config";

// ─── DB connection ────────────────────────────────────────────────────────────

const mongoUri =
  process.env.MONGODB_URI_TEST ?? "mongodb://127.0.0.1:27017/mongolia_test_topology";

function isLikelyProductionDb(uri: string): boolean {
  const dbSegment = uri.split("?")[0].split("/").pop() ?? "";
  return !dbSegment.includes("_test") && !dbSegment.endsWith("test");
}

// ─── Shared test data ─────────────────────────────────────────────────────────

let kho1: mongoose.Types.ObjectId;
let kho2: mongoose.Types.ObjectId;
let productId: mongoose.Types.ObjectId;
let variantId: mongoose.Types.ObjectId;
const employeeId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  if (isLikelyProductionDb(mongoUri)) {
    throw new Error(
      `Refusing to run topology tests against non-test database: ${mongoUri}\n` +
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
  resetWarehouseTopologyCache();

  await Promise.all([
    WarehouseInventory.deleteMany({}),
    WarehouseStockMovement.deleteMany({}),
    WarehouseTransfer.deleteMany({}),
    WarehouseReceipt.deleteMany({}),
    Warehouse.deleteMany({ code: { $in: ["KHO1", "KHO2", "ORPHAN"] } }),
    Product.deleteMany({ code: "TEST_TOPO_P" }),
    ProductVariant.deleteMany({ sku: "TEST_TOPO_SKU" }),
    Order.deleteMany({ orderCode: /^TEST_TOPO_ORDER/ }),
  ]);

  const k1 = await Warehouse.create({
    code: "KHO1",
    name: "Kho Trung Quốc (trung gian)",
    isActive: true,
  });
  kho1 = k1._id;

  const k2 = await Warehouse.create({
    code: "KHO2",
    name: "Kho Mông Cổ (chính)",
    isActive: true,
  });
  kho2 = k2._id;

  const product = await Product.create({
    code: "TEST_TOPO_P",
    name: "Product topology test",
    categoryId: new mongoose.Types.ObjectId(),
    isActive: true,
  });
  productId = product._id;

  const variant = await ProductVariant.create({
    productId,
    sku: "TEST_TOPO_SKU",
    variantValues: { color: "red" },
    isActive: true,
  });
  variantId = variant._id;

  // Seed KHO1 = 50, then transfer 30 → KHO2 (KHO1 còn 20, KHO2 = 30).
  await warehouseWorkflowService.createReceipt({
    warehouseId: kho1.toString(),
    employeeId: employeeId.toString(),
    items: [{ variantId: variantId.toString(), orderedQuantity: 50, receivedQuantity: 50 }],
    note: "Seed KHO1",
  });
  await warehouseWorkflowService.createTransfer({
    sourceWarehouseId: kho1.toString(),
    destinationWarehouseId: kho2.toString(),
    items: [{ variantId: variantId.toString(), quantity: 30 }],
    status: "COMPLETED",
    employeeId: employeeId.toString(),
    note: "Seed KHO2 (transfer from KHO1)",
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function readInv(warehouseId: mongoose.Types.ObjectId) {
  return WarehouseInventory.findOne({
    warehouseId,
    itemType: "PRODUCT",
    variantId,
  }).lean();
}

async function createOrderWithWarehouse(
  warehouseId: mongoose.Types.ObjectId,
  status: OrderStatus = OrderStatus.WAIT_CONFIRM
): Promise<mongoose.Types.ObjectId> {
  const code = `TEST_TOPO_ORDER_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const order = await Order.create({
    orderCode: code,
    customerName: "Test Customer",
    quantity: 1,
    unitPrice: 100,
    totalAmount: 100,
    currency: "MNT",
    status,
    warehouseId,
    productVariantId: variantId,
    isActive: true,
  });
  return order._id as mongoose.Types.ObjectId;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Warehouse Topology Enforcement — Order layer (KHO2 only)", () => {
  it("[TOPO-O1] Order KHO2 → reserve PASS (validator)", async () => {
    // KHO2 = MAIN → reserve phải PASS validation.
    await expect(validateOrderWarehouse(kho2)).resolves.toBeUndefined();
  }, 30000);

  it("[TOPO-O2] Order KHO1 → reserve REJECT (validator)", async () => {
    // KHO1 = INTERMEDIARY → reserve KHÔNG được phép.
    await expect(validateOrderWarehouse(kho1)).rejects.toThrow(
      /KHO2|KHO1|topology/i
    );
  }, 30000);

  it("[TOPO-O3] Order KHO2 → ship PASS", async () => {
    const orderId = await createOrderWithWarehouse(kho2, OrderStatus.CONFIRMED);

    const kho2Inv = await readInv(kho2);
    expect(kho2Inv).toBeTruthy();
    expect(kho2Inv!.availableQuantity).toBeGreaterThanOrEqual(1);

    const result = await orderShipmentService.shipOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
    });

    expect(result.success).toBe(true);
    expect(result.alreadyShipped).toBe(false);
  }, 30000);

  it("[TOPO-O4] Order KHO1 → ship REJECT", async () => {
    const orderId = await createOrderWithWarehouse(kho1, OrderStatus.CONFIRMED);

    const result = await orderShipmentService.shipOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/KHO1|KHO2|topology/i);
  }, 30000);

  it("[TOPO-O5] Order KHO2 → return PASS", async () => {
    const orderId = await createOrderWithWarehouse(kho2, OrderStatus.CONFIRMED);
    const shipResult = await orderShipmentService.shipOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
    });
    expect(shipResult.success).toBe(true);

    await Order.updateOne({ _id: orderId }, { $set: { status: OrderStatus.RETURNED } });

    const returnResult = await orderShipmentService.returnOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
      items: [
        {
          itemType: "PRODUCT",
          productId: productId.toString(),
          variantId: variantId.toString(),
          quantity: 1,
        },
      ],
    });

    expect(returnResult.success).toBe(true);
    expect(returnResult.alreadyReturned).toBe(false);
  }, 30000);

  it("[TOPO-O6] Order KHO1 → return REJECT", async () => {
    const orderId = await createOrderWithWarehouse(kho1, OrderStatus.RETURNED);

    const returnResult = await orderShipmentService.returnOrder({
      orderId: orderId.toString(),
      employeeId: employeeId.toString(),
      items: [
        {
          itemType: "PRODUCT",
          productId: productId.toString(),
          variantId: variantId.toString(),
          quantity: 1,
        },
      ],
    });

    expect(returnResult.success).toBe(false);
    expect(returnResult.error).toMatch(/KHO1|KHO2|topology/i);
  }, 30000);
});

describe("Warehouse Topology Enforcement — Transfer layer", () => {
  it("[TOPO-T1] Transfer KHO1 → KHO2 PASS", async () => {
    const kho1Before = (await readInv(kho1))!.quantity;
    const kho2Before = (await readInv(kho2))?.quantity ?? 0;

    const transfer = await warehouseWorkflowService.createTransfer({
      sourceWarehouseId: kho1.toString(),
      destinationWarehouseId: kho2.toString(),
      items: [{ variantId: variantId.toString(), quantity: 10 }],
      status: "COMPLETED",
      employeeId: employeeId.toString(),
    });

    expect(transfer).toBeTruthy();
    expect(transfer.status).toBe("COMPLETED");

    const kho1After = (await readInv(kho1))!.quantity;
    const kho2After = (await readInv(kho2))!.quantity;

    expect(kho1After).toBe(kho1Before - 10);
    expect(kho2After).toBe(kho2Before + 10);
  }, 30000);

  it("[TOPO-T2] Transfer KHO2 → KHO1 REJECT", async () => {
    await expect(
      warehouseWorkflowService.createTransfer({
        sourceWarehouseId: kho2.toString(),
        destinationWarehouseId: kho1.toString(),
        items: [{ variantId: variantId.toString(), quantity: 5 }],
        employeeId: employeeId.toString(),
      })
    ).rejects.toThrow(/KHO1|KHO2|TRANSFER|topology/i);
  }, 30000);

  it("[TOPO-T3] Transfer KHO1 → KHO1 REJECT (same source/destination)", async () => {
    await expect(
      validateTransferDirection(kho1, kho1)
    ).rejects.toThrow(/khác nhau|source|destination|topology/i);
  }, 30000);

  it("[TOPO-T4] Transfer KHO2 → KHO2 REJECT (same source/destination)", async () => {
    await expect(
      validateTransferDirection(kho2, kho2)
    ).rejects.toThrow(/khác nhau|source|destination|topology/i);
  }, 30000);

  it("[TOPO-T5] Transfer dùng warehouse không có code KHO1/KHO2 REJECT", async () => {
    const orphan = await Warehouse.create({
      code: "ORPHAN",
      name: "Kho trôi nổi",
      isActive: true,
    });

    await expect(
      warehouseWorkflowService.createTransfer({
        sourceWarehouseId: orphan._id.toString(),
        destinationWarehouseId: kho2.toString(),
        items: [{ productId: productId.toString(), quantity: 5 }],
        employeeId: employeeId.toString(),
      })
    ).rejects.toThrow(/topology|KHO1|TRANSFER/i);

    await Warehouse.deleteOne({ _id: orphan._id });
  }, 30000);
});

describe("Warehouse Topology Enforcement — IMPORT layer", () => {
  it("[TOPO-I1] IMPORT vào KHO1 PASS (đã seed trong beforeEach)", async () => {
    // beforeEach đã seed bằng IMPORT → KHO1. Nếu tới đây không throw, rule OK.
    const kho1Inv = await readInv(kho1);
    expect(kho1Inv).toBeTruthy();
    expect(kho1Inv!.quantity).toBe(20); // 50 - 30 transferred
  }, 30000);

  it("[TOPO-I2] IMPORT vào KHO2 REJECT", async () => {
    await expect(
      warehouseWorkflowService.createReceipt({
        warehouseId: kho2.toString(),
        employeeId: employeeId.toString(),
        items: [{ variantId: variantId.toString(), orderedQuantity: 5, receivedQuantity: 5 }],
      })
    ).rejects.toThrow(/KHO1|IMPORT|topology/i);

    // KHO2 KHÔNG ĐƯỢC TĂNG bởi IMPORT này.
    const kho2Inv = await readInv(kho2);
    expect(kho2Inv).toBeTruthy();
    expect(kho2Inv!.quantity).toBe(30); // unchanged
  }, 30000);

  it("[TOPO-I3] validateImportTarget — KHO1 PASS, KHO2 REJECT", async () => {
    await expect(validateImportTarget(kho1)).resolves.toBeUndefined();
    await expect(validateImportTarget(kho2)).rejects.toThrow(
      /KHO1|IMPORT|topology/i
    );
  }, 30000);
});

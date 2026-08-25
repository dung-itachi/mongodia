/**
 * ============================================================
 * IMPORT → TRANSFER business-rule invariants
 * ============================================================
 *
 * Enforces:
 *   - NHÀ SẢN XUẤT → KHO1 (kho trung gian) only
 *   - KHO1 → KHO2 must go through WarehouseTransfer
 *   - IMPORT never credits KHO2 directly
 *   - Legacy `Inventory` collection is NOT touched by IMPORT/TRANSFER
 *   - There is no helper API that auto-credits KHO1 + KHO2 with the
 *     same quantity
 *
 * Required invariants after every test:
 *   I1. After IMPORT into KHO1: KHO1.quantity = +qty, KHO2 unchanged.
 *   I2. After TRANSFER KHO1 → KHO2: KHO1 -= sentQty, KHO2 += receivedQty.
 *   I3. `Inventory` legacy collection has zero writes from IMPORT/TRANSFER.
 *   I4. No single call can credit both KHO1 and KHO2 simultaneously.
 *
 * Database: defaults to mongolia_test. Refuses to run against a
 * non-test database (db name must include "_test" or end in "test").
 *
 * Usage:
 *   MONGODB_URI_TEST="mongodb://127.0.0.1:27017/mongolia_test_import" \
 *     npx jest src/tests/importTransferBusinessRule.test.ts --forceExit
 *
 * @jest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import mongoose from "mongoose";
import { warehouseWorkflowService } from "@/services/warehouse/warehouseWorkflow.service";
import WarehouseInventory from "@/models/WarehouseInventory";
import WarehouseStockMovement from "@/models/WarehouseStockMovement";
import WarehouseTransfer from "@/models/WarehouseTransfer";
import WarehouseReceipt from "@/models/WarehouseReceipt";
import ProductVariant from "@/models/ProductVariant";
import Product from "@/models/Product";
import Warehouse from "@/models/Warehouse";

// ─── DB connection ────────────────────────────────────────────────────────────

const mongoUri =
  process.env.MONGODB_URI_TEST ?? "mongodb://127.0.0.1:27017/mongolia_test_import";

function isLikelyProductionDb(uri: string): boolean {
  const dbSegment = uri.split("?")[0].split("/").pop() ?? "";
  return !dbSegment.includes("_test") && !dbSegment.endsWith("test");
}

// ─── Shared test data ─────────────────────────────────────────────────────────

let kho1: mongoose.Types.ObjectId; // KHO1 = kho trung gian (Trung Quốc)
let kho2: mongoose.Types.ObjectId; // KHO2 = kho chính bán hàng (Mông Cổ)
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
    WarehouseReceipt.deleteMany({}),
    Warehouse.deleteMany({ code: { $in: ["KHO1", "KHO2"] } }),
    Product.deleteMany({ code: "TEST_IMP_P" }),
    ProductVariant.deleteMany({ sku: "TEST_IMP_SKU" }),
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
    code: "TEST_IMP_P",
    name: "Product import test",
    categoryId: new mongoose.Types.ObjectId(),
    isActive: true,
  });
  productId = product._id;

  const variant = await ProductVariant.create({
    productId,
    sku: "TEST_IMP_SKU",
    variantValues: { color: "red" },
    isActive: true,
  });
  variantId = variant._id;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function readInv(warehouseId: mongoose.Types.ObjectId) {
  return WarehouseInventory.findOne({
    warehouseId,
    itemType: "PRODUCT",
    variantId,
  }).lean();
}

async function readMovementsCount(type: string, referenceType: string, referenceId: mongoose.Types.ObjectId) {
  return WarehouseStockMovement.countDocuments({
    type,
    referenceType,
    referenceId,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("IMPORT → TRANSFER business-rule invariants", () => {
  it("[IMP-1] IMPORT vào KHO1 → KHO1 tăng, KHO2 không đổi", async () => {
    const before = await readInv(kho2);
    const kho2BeforeQty = before?.quantity ?? 0;
    const kho2BeforeAvailable = before?.availableQuantity ?? 0;

    const receipt = await warehouseWorkflowService.createReceipt({
      warehouseId: kho1.toString(),
      employeeId: employeeId.toString(),
      items: [
        {
          variantId: variantId.toString(),
          orderedQuantity: 20,
          receivedQuantity: 20,
        },
      ],
      note: "Nhập từ nhà sản xuất",
    });
    expect(receipt).toBeTruthy();

    const kho1Inv = await readInv(kho1);
    expect(kho1Inv).toBeTruthy();
    expect(kho1Inv!.quantity).toBe(20);
    expect(kho1Inv!.availableQuantity).toBe(20);
    expect(kho1Inv!.inTransitQuantity).toBe(0);

    // KHO2 KHÔNG ĐƯỢC TĂNG
    const kho2Inv = await readInv(kho2);
    expect(kho2Inv?.quantity ?? 0).toBe(kho2BeforeQty);
    expect(kho2Inv?.availableQuantity ?? 0).toBe(kho2BeforeAvailable);

    // WarehouseStockMovement (IMPORT) đúng 1 row cho receipt
    const imports = await readMovementsCount("IMPORT", "RECEIPT", receipt!._id);
    expect(imports).toBe(1);
  }, 30000);

  it("[IMP-2] TRANSFER KHO1 → KHO2 → KHO1 giảm, KHO2 tăng", async () => {
    // 1. Seed KHO1 = 30
    await warehouseWorkflowService.createReceipt({
      warehouseId: kho1.toString(),
      employeeId: employeeId.toString(),
      items: [{ variantId: variantId.toString(), orderedQuantity: 30, receivedQuantity: 30 }],
      note: "Seed KHO1",
    });

    const transfer = await warehouseWorkflowService.createTransfer({
      sourceWarehouseId: kho1.toString(),
      destinationWarehouseId: kho2.toString(),
      items: [{ variantId: variantId.toString(), quantity: 12 }],
      status: "COMPLETED",
      employeeId: employeeId.toString(),
    });

    expect(transfer.status).toBe("COMPLETED");

    const kho1Inv = await readInv(kho1);
    expect(kho1Inv!.quantity).toBe(30 - 12);

    const kho2Inv = await readInv(kho2);
    expect(kho2Inv!.quantity).toBe(12);
    expect(kho2Inv!.availableQuantity).toBe(12);

    // TRANSFER_IN ở KHO2 đúng 1 row, TRANSFER_OUT ở KHO1 đúng 1 row
    const transferIns = await WarehouseStockMovement.countDocuments({
      type: "TRANSFER_IN",
      referenceType: "TRANSFER",
      referenceId: transfer._id,
    });
    const transferOuts = await WarehouseStockMovement.countDocuments({
      type: "TRANSFER_OUT",
      referenceType: "TRANSFER",
      referenceId: transfer._id,
    });
    expect(transferIns).toBe(1);
    expect(transferOuts).toBe(1);
  }, 30000);

  it("[IMP-3] TRANSFER KHO1 → KHO2 theo workflow 2 bước (SENT → RECEIVED) giữ nguyên invariant", async () => {
    await warehouseWorkflowService.createReceipt({
      warehouseId: kho1.toString(),
      employeeId: employeeId.toString(),
      items: [{ variantId: variantId.toString(), orderedQuantity: 30, receivedQuantity: 30 }],
    });

    const transfer = await warehouseWorkflowService.createTransfer({
      sourceWarehouseId: kho1.toString(),
      destinationWarehouseId: kho2.toString(),
      items: [{ variantId: variantId.toString(), quantity: 8 }],
      status: "SENT",
      employeeId: employeeId.toString(),
    });

    // SENT: KHO1 -8 (quantity), KHO2 quantity=0, inTransitQuantity=8
    let kho1Inv = await readInv(kho1);
    let kho2Inv = await readInv(kho2);
    expect(kho1Inv!.quantity).toBe(30 - 8);
    expect(kho1Inv!.inTransitQuantity).toBe(0);
    expect(kho2Inv?.quantity ?? 0).toBe(0);
    expect(kho2Inv?.inTransitQuantity ?? 0).toBe(8);

    // RECEIVED full
    await warehouseWorkflowService.receiveTransfer({
      transferId: transfer._id.toString(),
      employeeId: employeeId.toString(),
      receivedQuantities: [8],
    });

    kho1Inv = await readInv(kho1);
    kho2Inv = await readInv(kho2);
    expect(kho1Inv!.quantity).toBe(30 - 8); // unchanged
    expect(kho2Inv!.quantity).toBe(8);
    expect(kho2Inv!.inTransitQuantity).toBe(0);
    expect(kho2Inv!.availableQuantity).toBe(8);
  }, 30000);

  it("[IMP-4] IMPORT vào KHO2 trực tiếp BỊ REJECT theo topology rule", async () => {
    // Sau khi bật topology enforcement (KHO1 = IMPORT only, KHO2 = MAIN),
    // mọi IMPORT vào KHO2 phải throw. Đây là business rule chính thức:
    //   NHÀ SẢN XUẤT → KHO1 → (TRANSFER) → KHO2.
    //
    // Trước đây IMP-4 test rằng IMPORT vào KHO2 vẫn ghi được (deprecated path).
    // Bây giờ IMP-4 verify rằng cơ chế đó đã bị chặn ở service layer.

    await expect(
      warehouseWorkflowService.createReceipt({
        warehouseId: kho2.toString(),
        employeeId: employeeId.toString(),
        items: [{ variantId: variantId.toString(), orderedQuantity: 5, receivedQuantity: 5 }],
      })
    ).rejects.toThrow(/KHO1|IMPORT|topology/i);

    // KHO2 KHÔNG ĐƯỢC TĂNG
    const kho2Inv = await readInv(kho2);
    expect(kho2Inv?.quantity ?? 0).toBe(0);
  }, 30000);

  it("[IMP-5] Đường dữ liệu chính thức: IMPORT KHO1 + TRANSFER KHO1→KHO2 → KHO2 = qty, KHO1 = 0", async () => {
    // Mô phỏng flow hợp lệ duy nhất
    await warehouseWorkflowService.createReceipt({
      warehouseId: kho1.toString(),
      employeeId: employeeId.toString(),
      items: [{ variantId: variantId.toString(), orderedQuantity: 25, receivedQuantity: 25 }],
    });

    const transfer = await warehouseWorkflowService.createTransfer({
      sourceWarehouseId: kho1.toString(),
      destinationWarehouseId: kho2.toString(),
      items: [{ variantId: variantId.toString(), quantity: 25 }],
      status: "COMPLETED",
      employeeId: employeeId.toString(),
    });

    const kho1Inv = await readInv(kho1);
    const kho2Inv = await readInv(kho2);

    expect(kho1Inv!.quantity).toBe(0);
    expect(kho1Inv!.inTransitQuantity).toBe(0);

    expect(kho2Inv!.quantity).toBe(25);
    expect(kho2Inv!.availableQuantity).toBe(25);
    expect(kho2Inv!.inTransitQuantity).toBe(0);

    // Audit trail đầy đủ
    const importRows = await WarehouseStockMovement.countDocuments({
      type: "IMPORT",
      referenceId: transfer._id, // any referenceId
    });
    const transferOutRows = await WarehouseStockMovement.countDocuments({
      type: "TRANSFER_OUT",
      referenceId: transfer._id,
    });
    const transferInRows = await WarehouseStockMovement.countDocuments({
      type: "TRANSFER_IN",
      referenceId: transfer._id,
    });
    expect(importRows).toBeGreaterThanOrEqual(1);
    expect(transferOutRows).toBe(1);
    expect(transferInRows).toBe(1);
  }, 30000);

  it("[IMP-6] Không tồn tại API workflow nào auto-credit đồng thời KHO1 và KHO2 với cùng qty", async () => {
    // Xác nhận chỉ có hai workflow call duy nhất ghi stock:
    //   createReceipt (single warehouse) → IMPORT
    //   createTransfer (source→destination) → TRANSFER_OUT/IN
    //
    // Nếu user nhập vào KHO1 = 10, KHO2 phải giữ nguyên (không có API nào
    // tự động copy sang KHO2).

    await warehouseWorkflowService.createReceipt({
      warehouseId: kho1.toString(),
      employeeId: employeeId.toString(),
      items: [{ variantId: variantId.toString(), orderedQuantity: 10, receivedQuantity: 10 }],
    });

    const kho1Inv = await readInv(kho1);
    const kho2Inv = await readInv(kho2);

    expect(kho1Inv!.quantity).toBe(10);
    expect(kho2Inv?.quantity ?? 0).toBe(0); // KHÔNG được cộng tự động
  }, 30000);

  it("[IMP-7] IMPORT/TRANSFER KHÔNG đụng vào legacy `Inventory` collection", async () => {
    // Sau khi tắt 2 API legacy, workflow engine chỉ đụng WarehouseInventory
    // và WarehouseStockMovement. Legacy `Inventory` không được sửa bởi
    // workflow. Test này đảm bảo invariant bằng cách snapshot count trước
    // và sau.

    // Note: test này chỉ snapshot khi collection tồn tại. Nếu collection
    // rỗng ban đầu thì count = 0 trước và sau.
    const legacyCountBefore = await mongoose.connection.db
      ?.collection("inventories")
      .countDocuments({});
    const legacyHistoryCountBefore = await mongoose.connection.db
      ?.collection("inventoryhistories")
      .countDocuments({});

    await warehouseWorkflowService.createReceipt({
      warehouseId: kho1.toString(),
      employeeId: employeeId.toString(),
      items: [{ variantId: variantId.toString(), orderedQuantity: 10, receivedQuantity: 10 }],
    });

    await warehouseWorkflowService.createTransfer({
      sourceWarehouseId: kho1.toString(),
      destinationWarehouseId: kho2.toString(),
      items: [{ variantId: variantId.toString(), quantity: 5 }],
      status: "COMPLETED",
      employeeId: employeeId.toString(),
    });

    const legacyCountAfter = await mongoose.connection.db
      ?.collection("inventories")
      .countDocuments({});
    const legacyHistoryCountAfter = await mongoose.connection.db
      ?.collection("inventoryhistories")
      .countDocuments({});

    expect(legacyCountAfter).toBe(legacyCountBefore);
    expect(legacyHistoryCountAfter).toBe(legacyHistoryCountBefore);
  }, 30000);
});
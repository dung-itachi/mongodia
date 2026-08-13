/**
 * ==================================================
 * STOCK ENGINE SERVICE
 * ==================================================
 *
 * Tầng Infrastructure — quản lý tồn kho chuẩn cho toàn hệ thống.
 *
 * Layer này:
 *   - ĐỌC Inventory (current state).
 *   - KIỂM TRA tồn khả dụng trước khi thay đổi.
 *   - UPDATE Inventory (quantity / reservedQuantity / availableQuantity).
 *   - GHI InventoryHistory (append-only log).
 *   - DÙNG Mongoose Transaction (commit / rollback).
 *
 * Layer này KHÔNG:
 *   - Tự viết Business Rule (vd: "RESERVE chỉ khi sufficient available" — đã chuẩn hoá).
 *   - Tự quyết định khi nào gọi hàm nào (vd: Order flow).
 *   - Được gọi từ Order CRUD API (Phase sau mới wire).
 *   - Viết API Route.
 *
 * ─────────────────────────────────────────────────
 *  Cấu trúc — Pure Infrastructure, không có Rule
 * ─────────────────────────────────────────────────
 *
 *  reserveStock          →  RESERVE (giữ chỗ)
 *  releaseReservedStock  →  UNRESERVE (trả chỗ giữ)
 *  deductStock           →  OUT (trừ kho thật)
 *  returnStock           →  RETURN (hoàn kho)
 *  adjustStock           →  ADJUST (điều chỉnh — có thể +/- tuỳ sign)
 *  transferStock         →  TRANSFER_OUT + TRANSFER_IN (cặp)
 *
 *  Mỗi hàm:
 *   - Nhận `session?: mongoose.ClientSession` (optional).
 *   - Tự start transaction nếu caller không truyền.
 *   - Rollback nếu có lỗi.
 *   - Throw error class chuẩn hoá (xem ./stockEngine.errors).
 *   - Append InventoryHistory trong CÙNG transaction (chỉ persist khi commit).
 *   - Trả về StockChangeResult[] để caller (Dashboard / Audit / API) đọc
 *     before/after mà KHÔNG cần query lại DB.
 *
 * ─────────────────────────────────────────────────
 *  Flow chuẩn
 * ─────────────────────────────────────────────────
 *
 *   Đọc tồn
 *      ↓
 *   Kiểm tra điều kiện (Inventory có tồn tại, đủ available, ...)
 *      ↓
 *   Update tồn
 *      ↓
 *   Append InventoryHistory
 *      ↓
 *   Commit
 *      ↓
 *   Trả về StockChangeResult[] (snapshot before/after)
 *
 *  Phase sau (Order API, Shipment, ...) chỉ cần gọi các hàm này.
 * ==================================================
 */

import mongoose from "mongoose";

import Inventory from "@/models/Inventory";
import WarehouseInventory from "@/models/WarehouseInventory";
import { InventoryHistory } from "@/models/InventoryHistory";
import {
  InventoryAction,
  InventoryReason,
  InventorySource,
  InventoryTransactionType,
  InventoryReferenceType,
} from "@/constants/inventoryStatus";

import {
  InsufficientStockError,
  InsufficientReservedStockError,
  InsufficientQuantityError,
  InventoryNotFoundError,
  InvalidStockInputError,
  UnsupportedActionError,
} from "./stockEngine.errors";

// ==================================================
// Public Types
// ==================================================

/**
 * Một dòng tồn kho muốn thay đổi.
 *
 * - `productVariantId`: dùng khi item là biến thể sản phẩm.
 * - `comboId`: dùng khi item là combo.
 *
 * Caller phải chỉ định đúng 1 trong 2.
 */
export interface StockLineItem {
  productVariantId?: string | mongoose.Types.ObjectId;
  comboId?: string | mongoose.Types.ObjectId;
  /** Số lượng cần tác động (luôn dương). Sign do action quyết định. */
  quantity: number;
}

/**
 * Ngữ cảnh cho mỗi lần gọi Stock Engine.
 *
 * - `actorEmployeeId`: bắt buộc (ghi vào InventoryHistory.employeeId).
 * - `referenceType` + `referenceCode`: optional, dùng để truy vết.
 * - `note`: optional, lưu kèm history row.
 */
export interface StockContext {
  actorEmployeeId: string | mongoose.Types.ObjectId;
  referenceType?: InventoryReferenceType;
  referenceCode?: string;
  orderId?: string | mongoose.Types.ObjectId;
  note?: string;
  source?: InventorySource;
}

export interface StockEngineOptions {
  /** Caller có thể truyền session riêng (vd: cùng transaction với Order POST). */
  session?: mongoose.ClientSession;
}

/**
 * Snapshot tồn kho tại 1 thời điểm.
 */
export interface StockSnapshot {
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
}

/**
 * Kết quả trả về cho mỗi item qua mỗi lần gọi Stock Engine.
 *
 * Caller (Dashboard / Audit / API) dùng:
 *   - `before` / `after` để hiển thị tồn trước/sau.
 *   - `changed` để log diff (đặc biệt RESERVE: quantity=0, reserved>0).
 *   - `historyId` để truy ngược InventoryHistory row vừa tạo (audit link).
 */
export interface StockChangeResult {
  warehouseId: string;
  productVariantId?: string;
  comboId?: string;
  action: InventoryAction;
  before: StockSnapshot;
  after: StockSnapshot;
  changed: StockSnapshot;
  historyId: string;
}

/**
 * Kết quả cho transferStock — mỗi item sinh ra 1 OUT + 1 IN.
 */
export interface TransferStockResult {
  item: StockLineItem;
  out: StockChangeResult;
  in: StockChangeResult;
}

// ==================================================
// Module-Level Variables
// ==================================================

/**
 * DEPRECATED: Dual-write mode. Kept for API compatibility.
 * Now always returns FALSE - WarehouseInventory is primary (only) target.
 * @deprecated Use WarehouseInventory directly
 */
let DUAL_WRITE_ENABLED = false;

/**
 * @deprecated Use WarehouseInventory directly
 */
export function enableDualWrite(): void {
  console.warn("[StockEngine] enableDualWrite() is deprecated. WarehouseInventory is now the primary write target.");
  DUAL_WRITE_ENABLED = false;
}

/**
 * @deprecated Use WarehouseInventory directly
 */
export function disableDualWrite(): void {
  DUAL_WRITE_ENABLED = false;
}

/**
 * Check if dual-write mode is enabled.
 * Always returns FALSE in Phase 3.
 */
export function isDualWriteEnabled(): boolean {
  return false; // Phase 3: WarehouseInventory is primary
}

// ==================================================
// Internal Helpers
// ==================================================

function toObjectId(
  v: string | mongoose.Types.ObjectId
): mongoose.Types.ObjectId {
  return typeof v === "string"
    ? new mongoose.Types.ObjectId(v)
    : v;
}

function toObjectIdString(
  v: string | mongoose.Types.ObjectId
): string {
  return typeof v === "string" ? v : v.toString();
}

function toObjectIdOptional(
  v: string | mongoose.Types.ObjectId | undefined
): mongoose.Types.ObjectId | undefined {
  if (v === undefined || v === null) return undefined;
  return typeof v === "string" ? new mongoose.Types.ObjectId(v) : v;
}

function ensurePositiveInteger(
  qty: number,
  fieldName: string
): void {
  if (!Number.isInteger(qty)) {
    throw new InvalidStockInputError(`${fieldName} phải là số nguyên`, {
      fieldName,
      value: qty,
    });
  }
  if (qty <= 0) {
    throw new InvalidStockInputError(`${fieldName} phải > 0`, {
      fieldName,
      value: qty,
    });
  }
}

function ensureLineItem(item: StockLineItem): void {
  const hasVariant = item.productVariantId !== undefined;
  const hasCombo = item.comboId !== undefined;
  if (hasVariant === hasCombo) {
    throw new InvalidStockInputError(
      "StockLineItem phải chỉ định đúng 1 trong productVariantId hoặc comboId",
      { item }
    );
  }
  if (hasCombo) {
    // Inventory model hiện tại yêu cầu productVariantId (required), chưa có
    // schema Inventory cho combo. Stock Engine chỉ chịu trách nhiệm
    // đọc/update Inventory — không tự sửa schema.
    throw new InvalidStockInputError(
      "Inventory model hiện chưa hỗ trợ comboId. Cần mở rộng schema trước.",
      { comboId: toObjectIdString(item.comboId!) }
    );
  }
  ensurePositiveInteger(item.quantity, "quantity");
}

/**
 * Tìm (hoặc tạo nếu chưa có) Inventory row cho 1 item trong 1 kho.
 *
 * Khi `upsert=true` (mặc định cho INBOUND / ADJUST / RETURN / TRANSFER_IN):
 * nếu chưa có row thì tạo mới với quantity=0, rồi mới update.
 *
 * Khi `upsert=false` (RESERVE / OUT / UNRESERVE / TRANSFER_OUT): thiếu row
 * → throw `InventoryNotFoundError`.
 */
async function findOrCreateInventory(
  warehouseId: mongoose.Types.ObjectId,
  item: StockLineItem,
  options: { upsert: boolean; session?: mongoose.ClientSession }
): Promise<{
  doc: {
    _id: mongoose.Types.ObjectId;
    quantity: number;
    reservedQuantity: number;
    availableQuantity: number;
  };
  created: boolean;
}> {
  const filter: Record<string, unknown> = {
    warehouseId,
    isActive: true,
    productVariantId: toObjectId(item.productVariantId!),
  };

  const existing = await Inventory.findOne(filter).session(
    options.session ?? null
  );

  if (existing) {
    return {
      doc: existing as unknown as {
        _id: mongoose.Types.ObjectId;
        quantity: number;
        reservedQuantity: number;
        availableQuantity: number;
      },
      created: false,
    };
  }

  if (!options.upsert) {
    throw new InventoryNotFoundError({
      warehouseId: warehouseId.toString(),
      productVariantId: toObjectIdString(item.productVariantId!),
    });
  }

  const created = await Inventory.create(
    [
      {
        warehouseId,
        productVariantId: toObjectId(item.productVariantId!),
        quantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        isActive: true,
      },
    ],
    { session: options.session }
  );

  return {
    doc: created[0] as unknown as {
      _id: mongoose.Types.ObjectId;
      quantity: number;
      reservedQuantity: number;
      availableQuantity: number;
    },
    created: true,
  };
}

interface AppendHistoryInput {
  warehouseId: mongoose.Types.ObjectId;
  productVariantId?: mongoose.Types.ObjectId;
  comboId?: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  transactionType: InventoryTransactionType;
  action: InventoryAction;
  reason: InventoryReason;
  source: InventorySource;
  referenceType?: InventoryReferenceType;
  referenceCode?: string;
  beforeQuantity: number;
  changeQuantity: number;
  afterQuantity: number;
  /**
   * Phase 4.3 refactor — reserved delta (signed).
   * RESERVE → +qty, UNRESERVE → −qty, các action khác → 0 (default).
   * Query `Σ reservedChange` theo `orderId` cho ra `netReserved`.
   */
  reservedChange?: number;
  note?: string;
  session?: mongoose.ClientSession;
}

async function appendHistory(
  input: AppendHistoryInput
): Promise<mongoose.Types.ObjectId> {
  const created = await InventoryHistory.create(
    [
      {
        warehouseId: input.warehouseId,
        productVariantId: input.productVariantId,
        comboId: input.comboId,
        orderId: input.orderId,
        employeeId: input.employeeId,
        transactionType: input.transactionType,
        action: input.action,
        reason: input.reason,
        source: input.source,
        referenceType: input.referenceType,
        referenceCode: input.referenceCode,
        beforeQuantity: input.beforeQuantity,
        changeQuantity: input.changeQuantity,
        afterQuantity: input.afterQuantity,
        reservedChange: input.reservedChange ?? 0,
        note: input.note ?? "",
      },
    ],
    { session: input.session }
  );
  return created[0]._id;
}

/**
 * Thực thi 1 closure trong transaction (tự quản nếu caller không truyền session).
 *
 * - Nếu caller truyền `session` → KHÔNG start/commit/abort (caller sở hữu).
 * - Nếu caller KHÔNG truyền → start, commit khi thành công, abort khi lỗi.
 */
async function runInTransaction<T>(
  session: mongoose.ClientSession | undefined,
  work: (sess: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  const ownsSession = !session;
  const sess = session ?? (await mongoose.startSession());

  try {
    if (ownsSession) {
      sess.startTransaction();
    }
    const result = await work(sess);
    if (ownsSession) {
      await sess.commitTransaction();
    }
    return result;
  } catch (err) {
    if (ownsSession) {
      await sess.abortTransaction();
    }
    throw err;
  } finally {
    if (ownsSession) {
      sess.endSession();
    }
  }
}

// ==================================================
// Dual-Write Helpers (Phase 2: WarehouseInventory as future SoT)
// ==================================================

/**
 * Map productVariantId to WarehouseInventory filter.
 * For PRODUCT items, we need to find or create WarehouseInventory with variantId.
 *
 * NOTE: In Phase 2, dual-write only handles PRODUCT items (productVariantId).
 * Gift handling will be implemented in Phase 3.
 */
function buildWarehouseInventoryFilter(
  warehouseId: mongoose.Types.ObjectId,
  item: StockLineItem,
  itemType: "PRODUCT" | "GIFT"
): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    warehouseId,
    itemType,
    isActive: true,
  };

  if (itemType === "PRODUCT") {
    // item.productVariantId is required for PRODUCT type in Phase 2
    filter.variantId = toObjectIdOptional(item.productVariantId);
    filter.productId = null;
    filter.giftId = null;
  } else {
    // GIFT type: would need giftId, but Phase 2 doesn't support gift dual-write yet
    filter.giftId = null;
    filter.productId = null;
    filter.variantId = null;
  }

  return filter;
}

/**
 * Apply WarehouseInventory change for RESERVE action.
 * Phase 2: Dual-write with atomic update.
 *
 * CRITICAL: This function MUST throw if WarehouseInventory update fails.
 * Both Inventory AND WarehouseInventory must succeed or entire transaction rolls back.
 *
 * Semantics:
 * - quantity: UNCHANGED
 * - reservedQuantity: += qty
 * - availableQuantity: -= qty
 * - inTransitQuantity: UNCHANGED
 *
 * Atomic condition: availableQuantity >= qty
 *
 * @throws InsufficientStockError if no record found or insufficient available
 */
async function applyWarehouseInventoryReserve(
  warehouseId: mongoose.Types.ObjectId,
  item: StockLineItem,
  qty: number,
  session: mongoose.ClientSession
): Promise<OperationSnapshot> {
  // Phase 3: WarehouseInventory is the primary (only) write target
  // No longer checking DUAL_WRITE_ENABLED flag

  const filter = buildWarehouseInventoryFilter(warehouseId, item, "PRODUCT");

  // Atomic update: check availableQuantity >= qty, then increment reserved, decrement available
  const updated = await WarehouseInventory.findOneAndUpdate(
    {
      ...filter,
      availableQuantity: { $gte: qty },
    } as never,
    {
      $inc: {
        reservedQuantity: qty,
        availableQuantity: -qty,
      },
    },
    { new: true, session }
  ).lean();

  if (!updated) {
    // CRITICAL: WarehouseInventory update failed
    // This means either:
    // 1. Record doesn't exist in WarehouseInventory (migration incomplete)
    // 2. Insufficient available quantity
    // Either way, throw to abort transaction - both collections MUST be consistent
    throw new InsufficientStockError({
      warehouseId: warehouseId.toString(),
      productVariantId: toObjectIdString(item.productVariantId!),
      availableQuantity: 0, // Unknown at this point
      requestedQuantity: qty,
    });
  }

  // Calculate before snapshot (reconstruct from updated values)
  const beforeReserved = updated.reservedQuantity as number - qty;
  const beforeQuantity = updated.quantity as number;

  return {
    beforeQuantity,
    changeQuantity: 0,
    afterQuantity: beforeQuantity,
    beforeReserved,
    afterReserved: updated.reservedQuantity as number,
  };
}

/**
 * Apply WarehouseInventory change for UNRESERVE action.
 * Phase 2: Dual-write with atomic update.
 *
 * CRITICAL: This function MUST throw if WarehouseInventory update fails.
 * Both Inventory AND WarehouseInventory must succeed or entire transaction rolls back.
 *
 * Semantics:
 * - quantity: UNCHANGED
 * - reservedQuantity: -= qty
 * - availableQuantity: += qty
 * - inTransitQuantity: UNCHANGED
 *
 * Atomic condition: reservedQuantity >= qty
 *
 * @throws InsufficientReservedStockError if no record found or insufficient reserved
 */
async function applyWarehouseInventoryUnreserve(
  warehouseId: mongoose.Types.ObjectId,
  item: StockLineItem,
  qty: number,
  session: mongoose.ClientSession
): Promise<OperationSnapshot> {
  // Phase 3: WarehouseInventory is the primary (only) write target
  // No longer checking DUAL_WRITE_ENABLED flag

  const filter = buildWarehouseInventoryFilter(warehouseId, item, "PRODUCT");

  // Atomic update: check reservedQuantity >= qty, then decrement reserved, increment available
  const updated = await WarehouseInventory.findOneAndUpdate(
    {
      ...filter,
      reservedQuantity: { $gte: qty },
    } as never,
    {
      $inc: {
        reservedQuantity: -qty,
        availableQuantity: qty,
      },
    },
    { new: true, session }
  ).lean();

  if (!updated) {
    // CRITICAL: WarehouseInventory update failed
    // This means either:
    // 1. Record doesn't exist in WarehouseInventory (migration incomplete)
    // 2. Insufficient reserved quantity
    // Either way, throw to abort transaction - both collections MUST be consistent
    throw new InsufficientReservedStockError({
      warehouseId: warehouseId.toString(),
      productVariantId: toObjectIdString(item.productVariantId!),
      reservedQuantity: 0, // Unknown at this point
      requestedQuantity: qty,
    });
  }

  // Calculate before snapshot (reconstruct from updated values)
  const beforeReserved = (updated.reservedQuantity as number) + qty;
  const beforeQuantity = updated.quantity as number;

  return {
    beforeQuantity,
    changeQuantity: 0,
    afterQuantity: beforeQuantity,
    beforeReserved,
    afterReserved: updated.reservedQuantity as number,
  };
}

// ==================================================
// Per-item Operation (internal)
// ==================================================

interface OperationSnapshot {
  beforeQuantity: number;
  changeQuantity: number;
  afterQuantity: number;
  beforeReserved: number;
  afterReserved: number;
}

/**
 * Apply 1 action lên 1 Inventory row.
 *
 * Trả về snapshot before/after cho cả quantity lẫn reservedQuantity.
 * History sẽ được ghi bởi hàm public, dựa trên kết quả này.
 */
async function applyItem(
  warehouseId: mongoose.Types.ObjectId,
  item: StockLineItem,
  action: InventoryAction,
  session: mongoose.ClientSession
): Promise<OperationSnapshot> {
  // RESERVE / UNRESERVE / OUT / TRANSFER_OUT: phải có sẵn row.
  // INBOUND / RETURN / ADJUST / TRANSFER_IN: upsert nếu thiếu.
  const upsert =
    action === InventoryAction.INBOUND ||
    action === InventoryAction.RETURN ||
    action === InventoryAction.ADJUST ||
    action === InventoryAction.TRANSFER_IN;

  const { doc } = await findOrCreateInventory(warehouseId, item, {
    upsert,
    session,
  });

  const beforeQuantity = doc.quantity;
  const beforeReserved = doc.reservedQuantity;
  const beforeAvailable = doc.availableQuantity;
  const qty = item.quantity;

  let newQuantity = beforeQuantity;
  let newReserved = beforeReserved;
  let changeQuantity = 0;

  switch (action) {
    case InventoryAction.RESERVE: {
      if (beforeAvailable < qty) {
        throw new InsufficientStockError({
          warehouseId: warehouseId.toString(),
          productVariantId: toObjectIdString(item.productVariantId!),
          availableQuantity: beforeAvailable,
          requestedQuantity: qty,
        });
      }
      newReserved = beforeReserved + qty;
      changeQuantity = 0; // RESERVE không đổi quantity tổng
      break;
    }
    case InventoryAction.UNRESERVE: {
      if (beforeReserved < qty) {
        throw new InsufficientReservedStockError({
          warehouseId: warehouseId.toString(),
          productVariantId: toObjectIdString(item.productVariantId!),
          reservedQuantity: beforeReserved,
          requestedQuantity: qty,
        });
      }
      newReserved = beforeReserved - qty;
      changeQuantity = 0;
      break;
    }
    case InventoryAction.OUT: {
      if (beforeReserved < qty) {
        throw new InsufficientReservedStockError({
          warehouseId: warehouseId.toString(),
          productVariantId: toObjectIdString(item.productVariantId!),
          reservedQuantity: beforeReserved,
          requestedQuantity: qty,
        });
      }
      if (beforeQuantity < qty) {
        throw new InsufficientQuantityError({
          warehouseId: warehouseId.toString(),
          productVariantId: toObjectIdString(item.productVariantId!),
          quantity: beforeQuantity,
          requestedQuantity: qty,
        });
      }
      newQuantity = beforeQuantity - qty;
      newReserved = beforeReserved - qty;
      changeQuantity = -qty;
      break;
    }
    case InventoryAction.RETURN: {
      newQuantity = beforeQuantity + qty;
      changeQuantity = qty;
      break;
    }
    case InventoryAction.INBOUND: {
      newQuantity = beforeQuantity + qty;
      changeQuantity = qty;
      break;
    }
    case InventoryAction.TRANSFER_OUT: {
      if (beforeQuantity < qty) {
        throw new InsufficientQuantityError({
          warehouseId: warehouseId.toString(),
          productVariantId: toObjectIdString(item.productVariantId!),
          quantity: beforeQuantity,
          requestedQuantity: qty,
        });
      }
      newQuantity = beforeQuantity - qty;
      changeQuantity = -qty;
      break;
    }
    case InventoryAction.TRANSFER_IN: {
      newQuantity = beforeQuantity + qty;
      changeQuantity = qty;
      break;
    }
    default: {
      throw new UnsupportedActionError({ action: String(action) });
    }
  }

  const newAvailable = newQuantity - newReserved;

  // Update Inventory row (atomic, dùng $inc để tránh race condition).
  const inc: Record<string, number> = {};
  const set: Record<string, unknown> = {
    availableQuantity: newAvailable,
  };
  if (newQuantity !== beforeQuantity) {
    inc.quantity = newQuantity - beforeQuantity;
  }
  if (newReserved !== beforeReserved) {
    inc.reservedQuantity = newReserved - beforeReserved;
  }

  const updateOps: Record<string, unknown> = { $set: set };
  if (Object.keys(inc).length > 0) {
    updateOps.$inc = inc;
  }

  await Inventory.updateOne({ _id: doc._id }, updateOps, { session });

  return {
    beforeQuantity,
    changeQuantity,
    afterQuantity: newQuantity,
    beforeReserved,
    afterReserved: newReserved,
  };
}

/**
 * Build StockChangeResult từ OperationSnapshot + historyId.
 */
function buildChangeResult(
  warehouseId: mongoose.Types.ObjectId,
  item: StockLineItem,
  action: InventoryAction,
  snapshot: OperationSnapshot,
  historyId: mongoose.Types.ObjectId
): StockChangeResult {
  const before: StockSnapshot = {
    quantity: snapshot.beforeQuantity,
    reservedQuantity: snapshot.beforeReserved,
    availableQuantity: snapshot.beforeQuantity - snapshot.beforeReserved,
  };
  const after: StockSnapshot = {
    quantity: snapshot.afterQuantity,
    reservedQuantity: snapshot.afterReserved,
    availableQuantity: snapshot.afterQuantity - snapshot.afterReserved,
  };
  const changed: StockSnapshot = {
    quantity: after.quantity - before.quantity,
    reservedQuantity: after.reservedQuantity - before.reservedQuantity,
    availableQuantity: after.availableQuantity - before.availableQuantity,
  };
  return {
    warehouseId: warehouseId.toString(),
    productVariantId: item.productVariantId
      ? toObjectIdString(item.productVariantId)
      : undefined,
    comboId: item.comboId
      ? toObjectIdString(item.comboId)
      : undefined,
    action,
    before,
    after,
    changed,
    historyId: historyId.toString(),
  };
}

// ==================================================
// Public API — 6 operations
// ==================================================

/**
 * RESERVE — giữ chỗ tồn kho cho 1 item.
 *
 * Phase 3: WarehouseInventory is the SOURCE OF TRUTH.
 * - Updates WarehouseInventory only
 * - No longer updates Inventory (write path switched)
 *
 * Semantics:
 * - availableQuantity -= qty
 * - reservedQuantity += qty
 * - quantity: UNCHANGED
 * - inTransitQuantity: UNCHANGED
 *
 * Atomic condition: availableQuantity >= qty
 * 
 * @throws InsufficientStockError if availableQuantity < quantity
 * @returns `StockChangeResult[]` — 1 phần tử / item, theo thứ tự input.
 */
export async function reserveStock(
  warehouseId: string | mongoose.Types.ObjectId,
  items: StockLineItem[],
  ctx: StockContext,
  options: StockEngineOptions = {}
): Promise<StockChangeResult[]> {
  if (items.length === 0) {
    throw new InvalidStockInputError("reserveStock: items rỗng");
  }
  items.forEach(ensureLineItem);

  const wid = toObjectId(warehouseId);

  return runInTransaction(options.session, async (session) => {
    const results: StockChangeResult[] = [];
    for (const item of items) {
      // Phase 3: Update WarehouseInventory only (SOURCE OF TRUTH)
      const snapshot = await applyWarehouseInventoryReserve(wid, item, item.quantity, session);

      // Append history for audit trail
      const historyId = await appendHistory({
        warehouseId: wid,
        productVariantId: toObjectIdOptional(item.productVariantId),
        comboId: toObjectIdOptional(item.comboId),
        orderId: toObjectIdOptional(ctx.orderId),
        employeeId: toObjectId(ctx.actorEmployeeId),
        transactionType: InventoryTransactionType.OUTBOUND,
        action: InventoryAction.RESERVE,
        reason: InventoryReason.ORDER_RESERVED,
        source: ctx.source ?? InventorySource.SYSTEM,
        referenceType: ctx.referenceType,
        referenceCode: ctx.referenceCode,
        beforeQuantity: snapshot.beforeQuantity,
        changeQuantity: snapshot.changeQuantity,
        afterQuantity: snapshot.afterQuantity,
        reservedChange: item.quantity,
        note: ctx.note,
        session,
      });
      results.push(
        buildChangeResult(
          wid,
          item,
          InventoryAction.RESERVE,
          snapshot,
          historyId
        )
      );
    }
    return results;
  });
}

/**
 * UNRESERVE — trả lại chỗ đã giữ (vd: cancel trước khi OUT).
 *
 * Phase 3: WarehouseInventory is the SOURCE OF TRUTH.
 * - Updates WarehouseInventory only
 * - No longer updates Inventory (write path switched)
 *
 * Semantics:
 * - reservedQuantity -= qty
 * - availableQuantity += qty
 * - quantity: UNCHANGED
 * - inTransitQuantity: UNCHANGED
 *
 * Atomic condition: reservedQuantity >= qty
 * 
 * @throws InsufficientReservedStockError if reservedQuantity < quantity
 * @returns `StockChangeResult[]` — 1 phần tử / item, theo thứ tự input.
 */
export async function releaseReservedStock(
  warehouseId: string | mongoose.Types.ObjectId,
  items: StockLineItem[],
  ctx: StockContext,
  options: StockEngineOptions = {}
): Promise<StockChangeResult[]> {
  if (items.length === 0) {
    throw new InvalidStockInputError("releaseReservedStock: items rỗng");
  }
  items.forEach(ensureLineItem);

  const wid = toObjectId(warehouseId);

  return runInTransaction(options.session, async (session) => {
    const results: StockChangeResult[] = [];
    for (const item of items) {
      // Phase 3: Update WarehouseInventory only (SOURCE OF TRUTH)
      const snapshot = await applyWarehouseInventoryUnreserve(wid, item, item.quantity, session);

      const historyId = await appendHistory({
        warehouseId: wid,
        productVariantId: toObjectIdOptional(item.productVariantId),
        comboId: toObjectIdOptional(item.comboId),
        orderId: toObjectIdOptional(ctx.orderId),
        employeeId: toObjectId(ctx.actorEmployeeId),
        transactionType: InventoryTransactionType.OUTBOUND,
        action: InventoryAction.UNRESERVE,
        reason: InventoryReason.ORDER_UNRESERVED,
        source: ctx.source ?? InventorySource.SYSTEM,
        referenceType: ctx.referenceType,
        referenceCode: ctx.referenceCode,
        beforeQuantity: snapshot.beforeQuantity,
        changeQuantity: snapshot.changeQuantity,
        afterQuantity: snapshot.afterQuantity,
        reservedChange: -item.quantity,
        note: ctx.note,
        session,
      });
      results.push(
        buildChangeResult(
          wid,
          item,
          InventoryAction.UNRESERVE,
          snapshot,
          historyId
        )
      );
    }
    return results;
  });
}

/**
 * OUT — xuất kho thật (sau khi đã RESERVE).
 *
 * - Giảm `quantity` + giảm `reservedQuantity` cùng lúc.
 * - Throw `InsufficientReservedStockError` nếu `reservedQuantity < quantity`.
 * - Throw `InsufficientQuantityError` nếu `quantity < quantity`.
 * - Ghi InventoryHistory(action=OUT, reason=ORDER_OUT).
 *
 * @returns `StockChangeResult[]` — 1 phần tử / item, theo thứ tự input.
 */
export async function deductStock(
  warehouseId: string | mongoose.Types.ObjectId,
  items: StockLineItem[],
  ctx: StockContext,
  options: StockEngineOptions = {}
): Promise<StockChangeResult[]> {
  if (items.length === 0) {
    throw new InvalidStockInputError("deductStock: items rỗng");
  }
  items.forEach(ensureLineItem);

  const wid = toObjectId(warehouseId);

  return runInTransaction(options.session, async (session) => {
    const results: StockChangeResult[] = [];
    for (const item of items) {
      const snapshot = await applyItem(
        wid,
        item,
        InventoryAction.OUT,
        session
      );
      const historyId = await appendHistory({
        warehouseId: wid,
        productVariantId: toObjectIdOptional(item.productVariantId),
        comboId: toObjectIdOptional(item.comboId),
        orderId: toObjectIdOptional(ctx.orderId),
        employeeId: toObjectId(ctx.actorEmployeeId),
        transactionType: InventoryTransactionType.OUTBOUND,
        action: InventoryAction.OUT,
        reason: InventoryReason.ORDER_OUT,
        source: ctx.source ?? InventorySource.SYSTEM,
        referenceType: ctx.referenceType,
        referenceCode: ctx.referenceCode,
        beforeQuantity: snapshot.beforeQuantity,
        changeQuantity: snapshot.changeQuantity,
        afterQuantity: snapshot.afterQuantity,
        note: ctx.note,
        session,
      });
      results.push(
        buildChangeResult(
          wid,
          item,
          InventoryAction.OUT,
          snapshot,
          historyId
        )
      );
    }
    return results;
  });
}

/**
 * RETURN — khách trả hàng, hoàn vào kho.
 *
 * - Tăng `quantity` tổng.
 * - Không đổi `reservedQuantity`.
 * - Upsert row nếu thiếu.
 * - Ghi InventoryHistory(action=RETURN, reason=ORDER_RETURNED).
 *
 * @returns `StockChangeResult[]` — 1 phần tử / item, theo thứ tự input.
 */
export async function returnStock(
  warehouseId: string | mongoose.Types.ObjectId,
  items: StockLineItem[],
  ctx: StockContext,
  options: StockEngineOptions = {}
): Promise<StockChangeResult[]> {
  if (items.length === 0) {
    throw new InvalidStockInputError("returnStock: items rỗng");
  }
  items.forEach(ensureLineItem);

  const wid = toObjectId(warehouseId);

  return runInTransaction(options.session, async (session) => {
    const results: StockChangeResult[] = [];
    for (const item of items) {
      const snapshot = await applyItem(
        wid,
        item,
        InventoryAction.RETURN,
        session
      );
      const historyId = await appendHistory({
        warehouseId: wid,
        productVariantId: toObjectIdOptional(item.productVariantId),
        comboId: toObjectIdOptional(item.comboId),
        orderId: toObjectIdOptional(ctx.orderId),
        employeeId: toObjectId(ctx.actorEmployeeId),
        transactionType: InventoryTransactionType.ADJUST,
        action: InventoryAction.RETURN,
        reason: InventoryReason.ORDER_RETURNED,
        source: ctx.source ?? InventorySource.SYSTEM,
        referenceType: ctx.referenceType,
        referenceCode: ctx.referenceCode,
        beforeQuantity: snapshot.beforeQuantity,
        changeQuantity: snapshot.changeQuantity,
        afterQuantity: snapshot.afterQuantity,
        note: ctx.note,
        session,
      });
      results.push(
        buildChangeResult(
          wid,
          item,
          InventoryAction.RETURN,
          snapshot,
          historyId
        )
      );
    }
    return results;
  });
}

/**
 * ADJUST — điều chỉnh tồn (kiểm kê, hỏng, mất, ...).
 *
 * - `signedQuantity`: âm để giảm, dương để tăng.
 *   - Âm: ghi `changeQuantity = signedQuantity`, kiểm tra `quantity >= |signedQuantity|`.
 *   - Dương: ghi `changeQuantity = signedQuantity`.
 * - Upsert row nếu thiếu.
 * - Reason mặc định: `WAREHOUSE_FOUND` (tăng) / `WAREHOUSE_AUDIT` (giảm); caller override được.
 * - Ghi InventoryHistory(action=ADJUST).
 *
 * @returns `StockChangeResult[]` — 1 phần tử / item, theo thứ tự input.
 */
export interface AdjustStockInput extends StockLineItem {
  /** Số lượng có dấu: dương = tăng, âm = giảm. */
  signedQuantity: number;
  reason?: InventoryReason;
}

export async function adjustStock(
  warehouseId: string | mongoose.Types.ObjectId,
  inputs: AdjustStockInput[],
  ctx: StockContext,
  options: StockEngineOptions = {}
): Promise<StockChangeResult[]> {
  if (inputs.length === 0) {
    throw new InvalidStockInputError("adjustStock: items rỗng");
  }

  const wid = toObjectId(warehouseId);

  return runInTransaction(options.session, async (session) => {
    const results: StockChangeResult[] = [];
    for (const input of inputs) {
      const { signedQuantity, reason, ...item } = input;

      if (!Number.isInteger(signedQuantity)) {
        throw new InvalidStockInputError("signedQuantity phải là số nguyên", {
          value: signedQuantity,
        });
      }
      if (signedQuantity === 0) {
        throw new InvalidStockInputError("signedQuantity không được bằng 0", {
          value: signedQuantity,
        });
      }
      ensureLineItem(item as StockLineItem);

      const isPositive = signedQuantity > 0;
      const absQty = Math.abs(signedQuantity);

      const normalizedItem: StockLineItem = {
        ...item,
        quantity: absQty,
      };

      const beforeDoc = await findOrCreateInventory(wid, normalizedItem, {
        upsert: true,
        session,
      });

      const beforeQuantity = beforeDoc.doc.quantity;
      const beforeReserved = beforeDoc.doc.reservedQuantity;

      let newQuantity: number;
      let changeQuantity: number;
      let finalReason: InventoryReason;

      if (isPositive) {
        newQuantity = beforeQuantity + absQty;
        changeQuantity = absQty;
        finalReason = reason ?? InventoryReason.WAREHOUSE_FOUND;
      } else {
        if (beforeQuantity < absQty) {
          throw new InsufficientQuantityError({
            warehouseId: wid.toString(),
            productVariantId: toObjectIdString(normalizedItem.productVariantId!),
            quantity: beforeQuantity,
            requestedQuantity: absQty,
          });
        }
        newQuantity = beforeQuantity - absQty;
        changeQuantity = signedQuantity; // giữ dấu âm
        finalReason = reason ?? InventoryReason.WAREHOUSE_AUDIT;
      }

      const newAvailable = newQuantity - beforeReserved;

      await Inventory.updateOne(
        { _id: beforeDoc.doc._id },
        {
          $inc: { quantity: changeQuantity },
          $set: { availableQuantity: newAvailable },
        },
        { session }
      );

      // Build snapshot thủ công (không qua applyItem vì sign luật khác).
      const snapshot: OperationSnapshot = {
        beforeQuantity,
        changeQuantity,
        afterQuantity: newQuantity,
        beforeReserved,
        afterReserved: beforeReserved,
      };

      const historyId = await appendHistory({
        warehouseId: wid,
        productVariantId: toObjectIdOptional(normalizedItem.productVariantId),
        comboId: toObjectIdOptional(normalizedItem.comboId),
        orderId: toObjectIdOptional(ctx.orderId),
        employeeId: toObjectId(ctx.actorEmployeeId),
        transactionType: InventoryTransactionType.ADJUST,
        action: InventoryAction.ADJUST,
        reason: finalReason,
        source: ctx.source ?? InventorySource.SYSTEM,
        referenceType: ctx.referenceType,
        referenceCode: ctx.referenceCode,
        beforeQuantity,
        changeQuantity,
        afterQuantity: newQuantity,
        note: ctx.note,
        session,
      });

      results.push(
        buildChangeResult(
          wid,
          normalizedItem,
          InventoryAction.ADJUST,
          snapshot,
          historyId
        )
      );
    }
    return results;
  });
}

/**
 * TRANSFER — chuyển kho nội bộ (ghi cặp TRANSFER_OUT + TRANSFER_IN cùng tham chiếu).
 *
 * - Source kho: giảm `quantity` (TRANSFER_OUT).
 * - Destination kho: tăng `quantity` (TRANSFER_IN).
 * - Cả 2 history rows dùng chung `referenceType` + `referenceCode` để truy vết.
 * - Throw `InsufficientQuantityError` nếu source thiếu tồn.
 * - Upsert destination row nếu thiếu.
 * - Toàn bộ chạy trong 1 transaction (atomic).
 *
 * @returns `TransferStockResult[]` — 1 phần tử / item, mỗi phần tử có `out` + `in`.
 */
export interface TransferStockInput {
  sourceWarehouseId: string | mongoose.Types.ObjectId;
  destinationWarehouseId: string | mongoose.Types.ObjectId;
  items: StockLineItem[];
}

export async function transferStock(
  input: TransferStockInput,
  ctx: StockContext,
  options: StockEngineOptions = {}
): Promise<TransferStockResult[]> {
  if (input.items.length === 0) {
    throw new InvalidStockInputError("transferStock: items rỗng");
  }
  input.items.forEach(ensureLineItem);

  const sourceId = toObjectId(input.sourceWarehouseId);
  const destId = toObjectId(input.destinationWarehouseId);

  if (sourceId.toString() === destId.toString()) {
    throw new InvalidStockInputError(
      "Source và destination phải khác nhau",
      {
        sourceWarehouseId: sourceId.toString(),
        destinationWarehouseId: destId.toString(),
      }
    );
  }

  return runInTransaction(options.session, async (session) => {
    const results: TransferStockResult[] = [];
    for (const item of input.items) {
      // 1. Source: TRANSFER_OUT
      const outSnapshot = await applyItem(
        sourceId,
        item,
        InventoryAction.TRANSFER_OUT,
        session
      );
      const outHistoryId = await appendHistory({
        warehouseId: sourceId,
        productVariantId: toObjectIdOptional(item.productVariantId),
        comboId: toObjectIdOptional(item.comboId),
        orderId: toObjectIdOptional(ctx.orderId),
        employeeId: toObjectId(ctx.actorEmployeeId),
        transactionType: InventoryTransactionType.TRANSFER,
        action: InventoryAction.TRANSFER_OUT,
        reason: InventoryReason.WAREHOUSE_TRANSFER,
        source: ctx.source ?? InventorySource.SYSTEM,
        referenceType: ctx.referenceType,
        referenceCode: ctx.referenceCode,
        beforeQuantity: outSnapshot.beforeQuantity,
        changeQuantity: outSnapshot.changeQuantity,
        afterQuantity: outSnapshot.afterQuantity,
        note: ctx.note,
        session,
      });

      // 2. Destination: TRANSFER_IN (cùng item, khác kho)
      const inSnapshot = await applyItem(
        destId,
        item,
        InventoryAction.TRANSFER_IN,
        session
      );
      const inHistoryId = await appendHistory({
        warehouseId: destId,
        productVariantId: toObjectIdOptional(item.productVariantId),
        comboId: toObjectIdOptional(item.comboId),
        orderId: toObjectIdOptional(ctx.orderId),
        employeeId: toObjectId(ctx.actorEmployeeId),
        transactionType: InventoryTransactionType.TRANSFER,
        action: InventoryAction.TRANSFER_IN,
        reason: InventoryReason.WAREHOUSE_TRANSFER,
        source: ctx.source ?? InventorySource.SYSTEM,
        referenceType: ctx.referenceType,
        referenceCode: ctx.referenceCode,
        beforeQuantity: inSnapshot.beforeQuantity,
        changeQuantity: inSnapshot.changeQuantity,
        afterQuantity: inSnapshot.afterQuantity,
        note: ctx.note,
        session,
      });

      results.push({
        item,
        out: buildChangeResult(
          sourceId,
          item,
          InventoryAction.TRANSFER_OUT,
          outSnapshot,
          outHistoryId
        ),
        in: buildChangeResult(
          destId,
          item,
          InventoryAction.TRANSFER_IN,
          inSnapshot,
          inHistoryId
        ),
      });
    }
    return results;
  });
}
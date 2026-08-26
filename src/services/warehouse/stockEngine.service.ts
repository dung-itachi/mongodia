/**
 * ==================================================
 * STOCK ENGINE SERVICE
 * ==================================================
 *
 * Tầng Infrastructure — quản lý tồn kho chuẩn cho toàn hệ thống.
 *
 * Phase 4.5 refactor (Inventory Identity Consistency):
 *   - Stock Engine KHÔNG nhận comboId. Combo là cấu trúc bán hàng;
 *     inventory chỉ quan tâm PRODUCT (variant hoặc product không variant)
 *     và GIFT.
 *   - `StockLineItem` giờ có 2 loại:
 *       PRODUCT: { itemType: "PRODUCT", productVariantId, quantity }
 *                (productVariantId = null cho product không variant — dùng
 *                 `reserveProductNoVariant` / `shipProductNoVariant` thay thế)
 *       GIFT:    { itemType: "GIFT", giftId, quantity }
 *   - Mọi entry point PHẢI dùng `StockDemand` đã được resolve (xem
 *     ./stockDemand.ts). Stock Engine không tự query ProductVariant để
 *     đoán variant.
 *
 * Layer này:
 *   - ĐỌC Inventory (current state).
 *   - KIỂM TRA tồn khả dụng trước khi thay đổi.
 *   - UPDATE Inventory (quantity / reservedQuantity / availableQuantity).
 *   - GHI InventoryHistory (append-only log).
 *   - DÙNG Mongoose Transaction (commit / rollback).
 *
 * Layer này KHÔNG:
 *   - Tự viết Business Rule.
 *   - Tự quyết định khi nào gọi hàm nào.
 *   - Được gọi từ Order CRUD API một cách tự do.
 *   - Viết API Route.
 *
 * ─────────────────────────────────────────────────
 *  Flow chuẩn cho mọi operation
 * ─────────────────────────────────────────────────
 *
 *   Đọc tồn
 *      ↓
 *   Kiểm tra điều kiện (Inventory có tồn tại, đủ available, ...)
 *      ↓
 *   Update tồn (atomic)
 *      ↓
 *   Append InventoryHistory
 *      ↓
 *   Commit
 *      ↓
 *   Trả về StockChangeResult[] (snapshot before/after)
 *
 * ─────────────────────────────────────────────────
 *  Các operation
 * ─────────────────────────────────────────────────
 *
 *   reserveStock         → RESERVE    (giữ chỗ, giảm available, tăng reserved)
 *   releaseReservedStock → UNRESERVE  (trả chỗ)
 *   shipStock            → SHIP / OUT (trừ quantity + reserved, dùng InventoryAction.OUT)
 *   returnStock          → RETURN     (cộng quantity + available)
 *
 *   Mỗi hàm:
 *     - Nhận `session?: mongoose.ClientSession` (optional).
 *     - Tự start transaction nếu caller không truyền.
 *     - Rollback nếu có lỗi.
 *     - Throw error class chuẩn hoá (xem ./stockEngine.errors).
 *     - Append InventoryHistory trong CÙNG transaction.
 *     - Trả về StockChangeResult[] để caller đọc before/after.
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
  InvalidStockInputError,
} from "./stockEngine.errors";

// ==================================================
// Dual-write sync helper
// ==================================================

/**
 * Mirrors a WarehouseInventory update into the shared Inventory model.
 * Only applies to PRODUCT items (Inventory does not track GIFT).
 */
async function syncProductToDual(
  warehouseId: mongoose.Types.ObjectId,
  item: StockLineItem,
  change: number,
  session: mongoose.ClientSession,
  options: {
    field?: "quantity" | "reservedQuantity" | "inTransitQuantity";
    reservedChange?: number;
    availableChange?: number;
  } = {}
) {
  if (item.itemType !== "PRODUCT") return;

  const variantId = item.productVariantId
    ? toObjectId(item.productVariantId)
    : toObjectId(item.productId!);
  const filter = { warehouseId, productVariantId: variantId };

  if (change > 0 || (options.availableChange && options.availableChange > 0)) {
    const setOnInsert: Record<string, unknown> = { reservedQuantity: 0, isActive: true };

    // availableQuantity: only in $setOnInsert (when NOT being $inc'd).
    // We $inc it only when change > 0 (to set the initial value without conflict).
    const inc: Record<string, number> = {};
    if (change !== 0) {
      inc.quantity = change;
      inc.availableQuantity = change;
    } else if (options.availableChange) {
      // Zero change but availableQuantity update (reserve/unreserve): skip $setOnInsert
      // for availableQuantity and only $inc it.
      inc.availableQuantity = options.availableChange;
    }

    await Inventory.findOneAndUpdate(
      filter,
      { $inc: inc, $setOnInsert: setOnInsert },
      { upsert: true, new: true, session, setDefaultsOnInsert: true }
    );
  } else {
    // Decrease: check available
    const checkField = "availableQuantity";
    await Inventory.findOneAndUpdate(
      { ...filter, [checkField]: { $gte: Math.abs(change) } },
      {
        $inc: {
          quantity: change,
          availableQuantity: change,
          ...(options.reservedChange ? { reservedQuantity: options.reservedChange } : {}),
        },
      },
      { returnDocument: "after", session }
    );
  }
}

// ==================================================
// Public Types
// ==================================================

/**
 * Khoá identity cho 1 dòng tồn kho.
 *
 * Inventory line chỉ hỗ trợ 2 loại:
 *   - PRODUCT: productId + variantId (variantId = null nếu product không variant)
 *   - GIFT:    giftId
 *
 * KHÔNG có comboId. Combo không phải inventory identity.
 */
export type StockLineItemKind = "PRODUCT" | "GIFT";

export interface StockLineItem {
  itemType: StockLineItemKind;
  /** PRODUCT có variant: variantId bắt buộc. PRODUCT không variant: dùng productIdOnly variant. */
  productVariantId?: string | mongoose.Types.ObjectId;
  /** Product không variant (không có ProductVariant). Dùng thay cho productVariantId. */
  productId?: string | mongoose.Types.ObjectId;
  /** GIFT: bắt buộc. */
  giftId?: string | mongoose.Types.ObjectId;
  /** Số lượng cần tác động (luôn dương). Sign do action quyết định. */
  quantity: number;
}

/**
 * Ngữ cảnh cho mỗi lần gọi Stock Engine.
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
  /** Caller có thể truyền session riêng. */
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
 */
export interface StockChangeResult {
  warehouseId: string;
  itemType: StockLineItemKind;
  productId?: string;
  variantId?: string;
  giftId?: string;
  action: InventoryAction;
  before: StockSnapshot;
  after: StockSnapshot;
  changed: StockSnapshot;
  historyId: string;
}

// ==================================================
// Module-Level Variables (legacy dual-write flag — đã loại bỏ)
// ==================================================

/**
 * @deprecated Use WarehouseInventory directly (Phase 3).
 * Kept để không phá public API của package khác.
 */
export function isDualWriteEnabled(): boolean {
  return false;
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

/**
 * Validate line item — KHÔNG chấp nhận comboId.
 *
 * PRODUCT có variant   → productVariantId bắt buộc, productId optional.
 * PRODUCT không variant → productId bắt buộc, productVariantId = null/undefined.
 * GIFT                  → giftId bắt buộc, KHÔNG có productId/variantId.
 */
function ensureLineItem(item: StockLineItem): void {
  if (item.itemType === "PRODUCT") {
    const hasVariant = item.productVariantId !== undefined && item.productVariantId !== null;
    const hasProduct = item.productId !== undefined && item.productId !== null;
    if (hasVariant && hasProduct) {
      throw new InvalidStockInputError(
        "PRODUCT line item chỉ được chỉ định 1 trong productVariantId hoặc productId",
        { item }
      );
    }
    if (!hasVariant && !hasProduct) {
      throw new InvalidStockInputError(
        "PRODUCT line item phải có productVariantId (variant) hoặc productId (không variant)",
        { item }
      );
    }
  } else if (item.itemType === "GIFT") {
    if (!item.giftId) {
      throw new InvalidStockInputError("GIFT line item phải có giftId", { item });
    }
    if (item.productId || item.productVariantId) {
      throw new InvalidStockInputError(
        "GIFT line item không được có productId / productVariantId",
        { item }
      );
    }
  } else {
    throw new InvalidStockInputError(`itemType không hợp lệ: ${(item as { itemType: unknown }).itemType}`, { item });
  }
  ensurePositiveInteger(item.quantity, "quantity");
}

/**
 * Build Mongo filter cho WarehouseInventory.
 *
 *   PRODUCT có variant   → (warehouseId, itemType, productId, variantId)
 *   PRODUCT không variant → (warehouseId, itemType, productId, variantId=null)
 *   GIFT                  → (warehouseId, itemType, giftId)
 */
function buildInventoryFilter(
  warehouseId: mongoose.Types.ObjectId,
  item: StockLineItem
): Record<string, unknown> {
  if (item.itemType === "GIFT") {
    return {
      warehouseId,
      itemType: "GIFT",
      giftId: toObjectId(item.giftId!),
      variantId: null,
      productId: null,
      isActive: true,
    };
  }

  if (item.productVariantId) {
    return {
      warehouseId,
      itemType: "PRODUCT",
      variantId: toObjectId(item.productVariantId),
      productId: null,
      giftId: null,
      isActive: true,
    };
  }

  // PRODUCT không variant
  return {
    warehouseId,
    itemType: "PRODUCT",
    productId: toObjectId(item.productId!),
    variantId: null,
    giftId: null,
    isActive: true,
  };
}

interface AppendHistoryInput {
  warehouseId: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId | null;
  variantId?: mongoose.Types.ObjectId | null;
  giftId?: mongoose.Types.ObjectId | null;
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
  reservedChange?: number;
  note?: string;
  session?: mongoose.ClientSession;
}

async function appendHistory(
  input: AppendHistoryInput
): Promise<mongoose.Types.ObjectId> {
  // Build doc thủ công để bypass Mongoose strict-mode check cho schema mở rộng
  // (productId + giftId được thêm cho Phase 4.5 inventory identity).
  const doc = {
    warehouseId: input.warehouseId,
    productId: input.productId ?? null,
    productVariantId: input.variantId ?? null,
    giftId: input.giftId ?? null,
    comboId: null, // KHÔNG BAO GIỜ set comboId.
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
  };
  const created = await InventoryHistory.collection.insertOne(doc as unknown as Record<string, unknown>, {
    session: input.session ?? undefined,
  });
  if (!created.insertedId) {
    throw new Error("appendHistory: không thể tạo InventoryHistory");
  }
  return created.insertedId as mongoose.Types.ObjectId;
}

/**
 * Thực thi 1 closure trong transaction (tự quản nếu caller không truyền session).
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
// Per-item Operation Snapshot (internal)
// ==================================================

interface OperationSnapshot {
  beforeQuantity: number;
  changeQuantity: number;
  afterQuantity: number;
  beforeReserved: number;
  afterReserved: number;
}

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
    itemType: item.itemType,
    productId: item.productId ? toObjectIdString(item.productId) : undefined,
    variantId: item.productVariantId
      ? toObjectIdString(item.productVariantId)
      : undefined,
    giftId: item.giftId ? toObjectIdString(item.giftId) : undefined,
    action,
    before,
    after,
    changed,
    historyId: historyId.toString(),
  };
}

function extractIdFields(item: StockLineItem): {
  productId: mongoose.Types.ObjectId | undefined;
  variantId: mongoose.Types.ObjectId | undefined;
  giftId: mongoose.Types.ObjectId | undefined;
} {
  return {
    productId:
      item.itemType === "PRODUCT" && item.productId
        ? toObjectIdOptional(item.productId)
        : undefined,
    variantId:
      item.itemType === "PRODUCT" && item.productVariantId
        ? toObjectIdOptional(item.productVariantId)
        : undefined,
    giftId:
      item.itemType === "GIFT" && item.giftId
        ? toObjectIdOptional(item.giftId)
        : undefined,
  };
}

// ==================================================
// Atomic warehouse inventory operations
// ==================================================

/**
 * RESERVE: atomic — chỉ thành công nếu availableQuantity >= qty.
 * Sau update: reservedQuantity += qty, availableQuantity -= qty, quantity unchanged.
 */
async function applyReserve(
  warehouseId: mongoose.Types.ObjectId,
  item: StockLineItem,
  qty: number,
  session: mongoose.ClientSession
): Promise<OperationSnapshot> {
  const filter = buildInventoryFilter(warehouseId, item);
  const updated = await WarehouseInventory.findOneAndUpdate(
    { ...filter, availableQuantity: { $gte: qty } } as never,
    {
      $inc: {
        reservedQuantity: qty,
        availableQuantity: -qty,
      },
    },
    { returnDocument: "after", session }
  ).lean();

  if (!updated) {
    throw new InsufficientStockError({
      warehouseId: warehouseId.toString(),
      productVariantId: item.productVariantId
        ? toObjectIdString(item.productVariantId)
        : undefined,
      productId: item.productId ? toObjectIdString(item.productId) : undefined,
      giftId: item.giftId ? toObjectIdString(item.giftId) : undefined,
      availableQuantity: 0,
      requestedQuantity: qty,
    });
  }

  // Sync to shared Inventory model
  await syncProductToDual(warehouseId, item, 0, session, {
    reservedChange: qty,
    availableChange: -qty,
  });

  return {
    beforeQuantity: updated.quantity as number,
    changeQuantity: 0,
    afterQuantity: updated.quantity as number,
    beforeReserved: (updated.reservedQuantity as number) - qty,
    afterReserved: updated.reservedQuantity as number,
  };
}

/**
 * UNRESERVE: atomic — chỉ thành công nếu reservedQuantity >= qty.
 * Sau update: reservedQuantity -= qty, availableQuantity += qty, quantity unchanged.
 */
async function applyUnreserve(
  warehouseId: mongoose.Types.ObjectId,
  item: StockLineItem,
  qty: number,
  session: mongoose.ClientSession
): Promise<OperationSnapshot> {
  const filter = buildInventoryFilter(warehouseId, item);
  const updated = await WarehouseInventory.findOneAndUpdate(
    { ...filter, reservedQuantity: { $gte: qty } } as never,
    {
      $inc: {
        reservedQuantity: -qty,
        availableQuantity: qty,
      },
    },
    { returnDocument: "after", session }
  ).lean();

  if (!updated) {
    throw new InsufficientReservedStockError({
      warehouseId: warehouseId.toString(),
      productVariantId: item.productVariantId
        ? toObjectIdString(item.productVariantId)
        : undefined,
      productId: item.productId ? toObjectIdString(item.productId) : undefined,
      giftId: item.giftId ? toObjectIdString(item.giftId) : undefined,
      reservedQuantity: 0,
      requestedQuantity: qty,
    });
  }

  // Sync to shared Inventory model
  await syncProductToDual(warehouseId, item, 0, session, {
    reservedChange: -qty,
    availableChange: qty,
  });

  return {
    beforeQuantity: updated.quantity as number,
    changeQuantity: 0,
    afterQuantity: updated.quantity as number,
    beforeReserved: (updated.reservedQuantity as number) + qty,
    afterReserved: updated.reservedQuantity as number,
  };
}

/**
 * SHIP:
 *   - PRODUCT có variant: trừ quantity + reservedQuantity.
 *   - PRODUCT không variant: trừ quantity + reservedQuantity (cùng pattern).
 *   - GIFT: trừ quantity + availableQuantity (gift không qua reserve).
 *
 * Atomic — fail nếu điều kiện không thoả.
 */
async function applyShip(
  warehouseId: mongoose.Types.ObjectId,
  item: StockLineItem,
  qty: number,
  session: mongoose.ClientSession
): Promise<OperationSnapshot> {
  const filter = buildInventoryFilter(warehouseId, item);

  if (item.itemType === "GIFT") {
    // Gift: trừ availableQuantity + quantity (không qua reserve).
    const updated = await WarehouseInventory.findOneAndUpdate(
      { ...filter, availableQuantity: { $gte: qty } } as never,
      {
        $inc: {
          quantity: -qty,
          availableQuantity: -qty,
        },
      },
      { returnDocument: "after", session }
    ).lean();
    if (!updated) {
      throw new InsufficientStockError({
        warehouseId: warehouseId.toString(),
        giftId: toObjectIdString(item.giftId!),
        availableQuantity: 0,
        requestedQuantity: qty,
      });
    }
    // GIFT: no sync to Inventory (Inventory only tracks products)
    return {
      beforeQuantity: (updated.quantity as number) + qty,
      changeQuantity: -qty,
      afterQuantity: updated.quantity as number,
      beforeReserved: updated.reservedQuantity as number,
      afterReserved: updated.reservedQuantity as number,
    };
  }

  // PRODUCT (variant hoặc không variant): atomic trừ reserved + quantity.
  const updated = await WarehouseInventory.findOneAndUpdate(
    { ...filter, reservedQuantity: { $gte: qty } } as never,
    {
      $inc: {
        quantity: -qty,
        reservedQuantity: -qty,
      },
    },
    { returnDocument: "after", session }
  ).lean();
  if (!updated) {
    throw new InsufficientReservedStockError({
      warehouseId: warehouseId.toString(),
      productVariantId: item.productVariantId
        ? toObjectIdString(item.productVariantId)
        : undefined,
      productId: item.productId ? toObjectIdString(item.productId) : undefined,
      reservedQuantity: 0,
      requestedQuantity: qty,
    });
  }

  // Sync to shared Inventory model
  await syncProductToDual(warehouseId, item, -qty, session);

  return {
    beforeQuantity: (updated.quantity as number) + qty,
    changeQuantity: -qty,
    afterQuantity: updated.quantity as number,
    beforeReserved: (updated.reservedQuantity as number) + qty,
    afterReserved: updated.reservedQuantity as number,
  };
}

/**
 * RETURN: cộng quantity + availableQuantity (upsert nếu row chưa tồn tại).
 *
 * Idempotent theo caller — Stock Engine không check double-return. Caller
 * (orderShipment.service.returnOrder) phải check trước qua aggregate
 * WarehouseStockMovement.
 */
async function applyReturn(
  warehouseId: mongoose.Types.ObjectId,
  item: StockLineItem,
  qty: number,
  session: mongoose.ClientSession
): Promise<OperationSnapshot> {
  const filter = buildInventoryFilter(warehouseId, item);
  const existing = await WarehouseInventory.findOne(filter as never)
    .session(session)
    .lean();
  const beforeQty = existing?.quantity ?? 0;
  const beforeReserved = existing?.reservedQuantity ?? 0;

  const updated = await WarehouseInventory.findOneAndUpdate(
    filter as never,
    {
      $inc: {
        quantity: qty,
        availableQuantity: qty,
      },
      $setOnInsert: {
        inTransitQuantity: 0,
        shippedQuantity: 0,
        reservedQuantity: 0,
        isActive: true,
      },
    },
    { upsert: true, new: true, session }
  ).lean();

  if (!updated) throw new Error("Không thể hoàn hàng vào kho");

  // Sync to shared Inventory model (for PRODUCT items)
  await syncProductToDual(warehouseId, item, qty, session);

  return {
    beforeQuantity: beforeQty,
    changeQuantity: qty,
    afterQuantity: updated.quantity as number,
    beforeReserved,
    afterReserved: updated.reservedQuantity as number,
  };
}

// ==================================================
// Public API — 4 operations
// ==================================================

/**
 * RESERVE — giữ chỗ tồn kho cho 1 (hoặc nhiều) item.
 *
 * Semantics:
 *   - availableQuantity -= qty
 *   - reservedQuantity += qty
 *   - quantity: UNCHANGED
 *
 * Atomic condition: availableQuantity >= qty
 *
 * @throws InsufficientStockError
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
      const snapshot = await applyReserve(wid, item, item.quantity, session);
      const ids = extractIdFields(item);
      const historyId = await appendHistory({
        warehouseId: wid,
        productId: ids.productId ?? null,
        variantId: ids.variantId ?? null,
        giftId: ids.giftId ?? null,
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
        buildChangeResult(wid, item, InventoryAction.RESERVE, snapshot, historyId)
      );
    }
    return results;
  });
}

/**
 * UNRESERVE — trả lại chỗ đã giữ (vd: cancel trước khi SHIP).
 *
 * Semantics:
 *   - reservedQuantity -= qty
 *   - availableQuantity += qty
 *   - quantity: UNCHANGED
 *
 * Atomic condition: reservedQuantity >= qty
 *
 * @throws InsufficientReservedStockError
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
      const snapshot = await applyUnreserve(wid, item, item.quantity, session);
      const ids = extractIdFields(item);
      const historyId = await appendHistory({
        warehouseId: wid,
        productId: ids.productId ?? null,
        variantId: ids.variantId ?? null,
        giftId: ids.giftId ?? null,
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
        buildChangeResult(wid, item, InventoryAction.UNRESERVE, snapshot, historyId)
      );
    }
    return results;
  });
}

/**
 * SHIP — atomic deduct inventory cho ORDER_OUT.
 *
 * Semantics:
 *   - PRODUCT (variant hoặc không variant): quantity -= qty, reservedQuantity -= qty
 *   - GIFT:                                  quantity -= qty, availableQuantity -= qty
 *
 * Atomic condition:
 *   - PRODUCT: reservedQuantity >= qty
 *   - GIFT:    availableQuantity >= qty
 *
 * Stock Engine KHÔNG nhận comboId. Caller PHẢI truyền items đã resolve
 * (dùng `stockDemand` helper).
 */
export async function shipStock(
  warehouseId: string | mongoose.Types.ObjectId,
  items: StockLineItem[],
  ctx: StockContext,
  options: StockEngineOptions = {}
): Promise<StockChangeResult[]> {
  if (items.length === 0) {
    throw new InvalidStockInputError("shipStock: items rỗng");
  }
  items.forEach(ensureLineItem);

  const wid = toObjectId(warehouseId);

  return runInTransaction(options.session, async (session) => {
    const results: StockChangeResult[] = [];
    for (const item of items) {
      const snapshot = await applyShip(wid, item, item.quantity, session);
      const ids = extractIdFields(item);
      const historyId = await appendHistory({
        warehouseId: wid,
        productId: ids.productId ?? null,
        variantId: ids.variantId ?? null,
        giftId: ids.giftId ?? null,
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
        reservedChange:
          item.itemType === "GIFT" ? 0 : -item.quantity,
        note: ctx.note,
        session,
      });
      results.push(
        buildChangeResult(wid, item, InventoryAction.OUT, snapshot, historyId)
      );
    }
    return results;
  });
}

/**
 * RETURN — atomic credit inventory cho ORDER_RETURN.
 *
 * Semantics:
 *   - quantity += qty
 *   - availableQuantity += qty
 *   - reservedQuantity: UNCHANGED (upsert default = 0)
 *
 * Upsert nếu row chưa tồn tại (vd: kho vừa được tạo và lần đầu có return).
 *
 * Idempotency là trách nhiệm của caller — Stock Engine không check
 * ORDER_OUT vs ORDER_RETURN ratio. Caller dùng aggregate
 * WarehouseStockMovement để verify.
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
      const snapshot = await applyReturn(wid, item, item.quantity, session);
      const ids = extractIdFields(item);
      const historyId = await appendHistory({
        warehouseId: wid,
        productId: ids.productId ?? null,
        variantId: ids.variantId ?? null,
        giftId: ids.giftId ?? null,
        orderId: toObjectIdOptional(ctx.orderId),
        employeeId: toObjectId(ctx.actorEmployeeId),
        transactionType: InventoryTransactionType.INBOUND,
        action: InventoryAction.RETURN,
        reason: InventoryReason.ORDER_RETURNED,
        source: ctx.source ?? InventorySource.SYSTEM,
        referenceType: ctx.referenceType,
        referenceCode: ctx.referenceCode,
        beforeQuantity: snapshot.beforeQuantity,
        changeQuantity: snapshot.changeQuantity,
        afterQuantity: snapshot.afterQuantity,
        reservedChange: 0,
        note: ctx.note,
        session,
      });
      results.push(
        buildChangeResult(wid, item, InventoryAction.RETURN, snapshot, historyId)
      );
    }
    return results;
  });
}
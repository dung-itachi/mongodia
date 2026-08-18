/**
 * ==================================================
 * WAREHOUSE ADJUSTMENT SERVICE
 * ==================================================
 *
 * Service cho nghiệp vụ ĐIỀU CHỈNH TỒN KHO.
 * Dùng khi kiểm kê thực tế khác hệ thống.
 *
 * Nguyên tắc:
 * - Không cho sửa quantity trực tiếp
 * - Bắt buộc tạo transaction + history
 * - Atomic operation với MongoDB session
 *
 * Concurrency:
 * - Update path uses OPTIMISTIC CONCURRENCY: the write guards on
 *   the document's _id AND its currently-read quantity value.
 *   If two concurrent adjustments target the same WarehouseInventory
 *   record, only the first to commit succeeds; the second detects the
 *   stale read via the filter mismatch and aborts the transaction.
 *   This prevents silent overwrite of concurrent adjustments without
 *   introducing a distributed lock and without changing the schema.
 */

import mongoose from "mongoose";
import WarehouseInventory from "@/models/WarehouseInventory";
import WarehouseStockMovement from "@/models/WarehouseStockMovement";
import Gift from "@/models/Gift";
import ProductVariant from "@/models/ProductVariant";
import Product from "@/models/Product";
import Counter from "@/models/Counter";

/**
 * Movement types that contribute a SIGNED delta to `quantity`.
 * IMPORT and TRANSFER_IN add stock; TRANSFER_OUT, ORDER_OUT subtract stock.
 * ORDER_RETURN contributes a positive delta.
 *
 * ADJUSTMENT is NOT listed here because its magnitude is stored
 * without a sign in `WarehouseStockMovement` — see `replayAdjustmentSings`
 * for sign recovery using per-item history replay.
 */
const SIGNED_DELTA_TYPES: Record<string, number> = {
  IMPORT: 1,
  TRANSFER_IN: 1,
  TRANSFER_OUT: -1,
  ORDER_OUT: -1,
  ORDER_RETURN: 1,
};

/**
 * Pure helper: classify the magnitude + accumulated `before` value into
 * an adjustment direction. Extracted so it can be tested without MongoDB.
 *
 * Rules:
 *  - If signed change > 0 → INCREASE (cộng tồn kho)
 *  - If signed change < 0 → DECREASE (giảm tồn kho)
 *  - If signed change === 0 → NEUTRAL (chỉ sửa thông tin, không đổi số)
 */
export function classifyAdjustmentDirection(
  changeSigned: number
): "INCREASE" | "DECREASE" | "NEUTRAL" {
  if (changeSigned > 0) return "INCREASE";
  if (changeSigned < 0) return "DECREASE";
  return "NEUTRAL";
}

export type AdjustmentDirection = "INCREASE" | "DECREASE" | "NEUTRAL";

export interface AdjustmentListItem {
  _id: string;
  warehouseId?: { _id?: string; code?: string; name?: string } | string | null;
  itemType: string;
  productId?: { _id?: string; code?: string; name?: string } | null;
  variantId?: { _id?: string; sku?: string } | null;
  giftId?: { _id?: string; name?: string } | null;
  quantity: number;
  referenceCode?: string;
  createdBy?: { _id?: string; employeeCode?: string; fullName?: string } | null;
  createdAt: Date | string;
  /** Signed delta of this adjustment on the inventory quantity */
  changeSigned: number;
  /** Inventory quantity immediately before this adjustment */
  beforeQuantity: number;
  /** Inventory quantity immediately after this adjustment */
  afterQuantity: number;
  /** "INCREASE" | "DECREASE" | "NEUTRAL" */
  direction: AdjustmentDirection;
}

export interface AdjustmentListFilters {
  warehouseId?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export type AdjustmentItemInput = {
  productId?: string;
  variantId?: string;
  giftId?: string;
  newQuantity: number;
  reason: string;
  note?: string;
};

export interface AdjustmentResult {
  success: true;
  adjustmentCode: string;
  movements: Array<{
    itemType: string;
    productName?: string;
    giftName?: string;
    beforeQuantity: number;
    afterQuantity: number;
    change: number;
  }>;
}

export interface AdjustmentError {
  success: false;
  error: string;
  insufficientItems?: Array<{
    name: string;
    requested: number;
    available: number;
  }>;
}

function oid(value: string, field: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) throw new Error(`${field} không hợp lệ`);
  return new mongoose.Types.ObjectId(value);
}

/**
 * Allocates the next sequential adjustment code via the shared Counter
 * collection. Wrapped in a small retry loop because concurrent
 * transactions both upserting the same `key` can produce a MongoDB
 * `WriteConflict` (TransientTransactionError) on the unique-index
 * insert path. Retrying inside the same transaction is the standard
 * MongoDB-recommended recovery pattern.
 */
async function nextCode(session: mongoose.ClientSession) {
  const date = new Date();
  const key = `adj_${date.toISOString().slice(0, 10).replace(/-/g, "")}`;
  const MAX_RETRIES = 5;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { key },
        { $inc: { seq: 1 } },
        { upsert: true, new: true, session }
      );
      return `ADJ${key.slice(-8)}${String(counter?.seq ?? 1).padStart(4, "0")}`;
    } catch (err) {
      const isTransient =
        err instanceof Error &&
        (err.message.includes("WriteConflict") ||
          err.message.includes("TransientTransactionError"));
      attempt += 1;
      if (!isTransient || attempt >= MAX_RETRIES) throw err;
    }
  }
}

async function getItemInfo(
  item: AdjustmentItemInput
): Promise<{
  itemType: "PRODUCT" | "GIFT";
  productId?: mongoose.Types.ObjectId | null;
  variantId?: mongoose.Types.ObjectId | null;
  giftId?: mongoose.Types.ObjectId | null;
  name: string;
}> {
  if (item.giftId) {
    const giftId = oid(item.giftId, "Gift ID");
    const gift = await Gift.findOne({ _id: giftId, isActive: true }).lean();
    if (!gift) throw new Error("Gift không tồn tại hoặc đã ngừng hoạt động");
    return { itemType: "GIFT", giftId, productId: null, variantId: null, name: gift.name };
  }

  if (item.variantId) {
    const variantId = oid(item.variantId, "Variant ID");
    const variant = await ProductVariant.findOne({ _id: variantId, isActive: true })
      .populate("productId", "code name")
      .lean();
    if (!variant) throw new Error("ProductVariant không tồn tại hoặc đã ngừng hoạt động");
    const product = variant.productId as unknown as { _id: mongoose.Types.ObjectId; code: string; name: string } | mongoose.Types.ObjectId;
    const productId = typeof product === 'object' && '_id' in product ? product._id : product;
    return {
      itemType: "PRODUCT",
      productId: productId,
      variantId,
      giftId: null,
      name: `${(product as { name?: string }).name ?? "N/A"} • ${variant.sku ?? "N/A"}`,
    };
  }

  if (item.productId) {
    const productId = oid(item.productId, "Product ID");
    const product = await Product.findOne({ _id: productId, isActive: true }).lean();
    if (!product) throw new Error("Product không tồn tại hoặc đã ngừng hoạt động");
    return { itemType: "PRODUCT", productId, variantId: null, giftId: null, name: product.name };
  }

  throw new Error("Phải chọn giftId, variantId hoặc productId");
}

export class WarehouseAdjustmentService {
  /**
   * Tạo điều chỉnh tồn kho cho một kho
   *
   * @param warehouseId - ID của kho
   * @param items - Danh sách các mặt hàng cần điều chỉnh
   * @param employeeId - ID nhân viên thực hiện
   * @param note - Ghi chú chung (tùy chọn)
   * @returns Kết quả điều chỉnh
   */
  async createAdjustment(
    warehouseId: string,
    items: AdjustmentItemInput[],
    employeeId: string,
    note?: string
  ): Promise<AdjustmentResult | AdjustmentError> {
    if (!items.length) {
      return { success: false, error: "Danh sách điều chỉnh không được rỗng" };
    }

    if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
      return { success: false, error: "ID kho không hợp lệ" };
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const warehouseObjId = oid(warehouseId, "Warehouse ID");
      const employeeObjId = oid(employeeId, "Employee ID");
      const adjustmentCode = await nextCode(session);

      const movements: AdjustmentResult["movements"] = [];
      const errors: AdjustmentError["insufficientItems"] = [];

      for (const item of items) {
        const itemInfo = await getItemInfo(item);

        // Find current inventory
        const filter = {
          warehouseId: warehouseObjId,
          itemType: itemInfo.itemType,
          productId: itemInfo.productId ?? null,
          variantId: itemInfo.variantId ?? null,
          giftId: itemInfo.giftId ?? null,
          isActive: true,
        };

        const currentInventory = await WarehouseInventory.findOne(filter).session(session);

        if (!currentInventory) {
          // Tạo mới nếu chưa có (chỉ khi newQuantity > 0)
          if (item.newQuantity > 0) {
            await WarehouseInventory.create(
              [{
                ...filter,
                quantity: item.newQuantity,
                availableQuantity: item.newQuantity,
                inTransitQuantity: 0,
                shippedQuantity: 0,
                reservedQuantity: 0,
              }],
              { session }
            );

            // Tạo movement
            await WarehouseStockMovement.create(
              [{
                warehouseId: warehouseObjId,
                itemType: itemInfo.itemType,
                productId: itemInfo.productId,
                variantId: itemInfo.variantId,
                giftId: itemInfo.giftId,
                type: "ADJUSTMENT",
                quantity: item.newQuantity,
                referenceType: "ADJUSTMENT",
                referenceCode: adjustmentCode,
                createdBy: employeeObjId,
                note: note || item.reason,
              }],
              { session }
            );

            movements.push({
              itemType: itemInfo.itemType,
              productName: itemInfo.itemType === "PRODUCT" ? itemInfo.name : undefined,
              giftName: itemInfo.itemType === "GIFT" ? itemInfo.name : undefined,
              beforeQuantity: 0,
              afterQuantity: item.newQuantity,
              change: item.newQuantity,
            });
          } else {
            errors.push({
              name: itemInfo.name,
              requested: item.newQuantity,
              available: 0,
            });
          }
        } else {
          // ─── Update existing inventory ────────────────────────────────────
          // Read fresh state inside the active transaction/session so the
          // validation and the guarded write share the same snapshot.
          const beforeQuantity = currentInventory.quantity;
          const expectedLocked =
            currentInventory.reservedQuantity + currentInventory.inTransitQuantity;
          const change = item.newQuantity - beforeQuantity;

          // Validation: Không cho giảm dưới 0
          if (item.newQuantity < 0) {
            await session.abortTransaction();
            return {
              success: false,
              error: `Số lượng mới không được âm cho ${itemInfo.name}`,
            };
          }

          // Nếu giảm tồn, kiểm tra reserved + in transit
          // shippedQuantity là tracking, KHÔNG khóa tồn kho
          if (change < 0 && item.newQuantity < expectedLocked) {
            await session.abortTransaction();
            return {
              success: false,
              error: `Số lượng mới (${item.newQuantity}) không được nhỏ hơn số lượng đang chuyển/đã đặt (${expectedLocked}) cho ${itemInfo.name}`,
            };
          }

          // ─── Phase 7 no-op short-circuit ────────────────────────────────
          // If the requested quantity equals the current quantity, treat
          // this as a successful no-op: do NOT mutate inventory, do NOT
          // create a WarehouseStockMovement (its schema requires
          // `quantity >= 1`, and a zero-quantity ADJUSTMENT would fail
          // validation), and do NOT touch any related accounting fields.
          // The optimistic concurrency guard is intentionally bypassed
          // because no state is being written.
          if (change === 0) {
            movements.push({
              itemType: itemInfo.itemType,
              productName: itemInfo.itemType === "PRODUCT" ? itemInfo.name : undefined,
              giftName: itemInfo.itemType === "GIFT" ? itemInfo.name : undefined,
              beforeQuantity,
              afterQuantity: item.newQuantity,
              change: 0,
            });
            continue;
          }

          // Preserve reservedQuantity + inTransitQuantity; recompute availableQuantity
          // using the fresh in-transaction read.
          // availableQuantity = quantity - inTransitQuantity - reservedQuantity
          const newAvailable = Math.max(
            0,
            item.newQuantity -
              currentInventory.inTransitQuantity -
              currentInventory.reservedQuantity
          );

          // ─── Optimistic concurrency guard ────────────────────────────────
          // The filter pins both the unique _id AND the quantity value we
          // just read. If a concurrent adjustment has already mutated
          // `quantity` (committed before this transaction), the filter
          // mismatch causes findOneAndUpdate to return null, and we abort
          // the transaction. Without this guard, two concurrent
          // adjustments could both read quantity=Q0 and both overwrite
          // each other's intended `newQuantity` on commit.
          const guardedFilter = {
            ...filter,
            _id: currentInventory._id,
            quantity: beforeQuantity,
          };

          const updated = await WarehouseInventory.findOneAndUpdate(
            guardedFilter,
            {
              $set: {
                quantity: item.newQuantity,
                availableQuantity: newAvailable,
              },
            },
            { session, new: true }
          );

          if (!updated) {
            await session.abortTransaction();
            return {
              success: false,
              error: `Điều chỉnh thất bại do xung đột đồng thời trên ${itemInfo.name}. Vui lòng thử lại với số lượng mới nhất.`,
            };
          }

          // Tạo movement
          await WarehouseStockMovement.create(
            [{
              warehouseId: warehouseObjId,
              itemType: itemInfo.itemType,
              productId: itemInfo.productId,
              variantId: itemInfo.variantId,
              giftId: itemInfo.giftId,
              type: "ADJUSTMENT",
              quantity: Math.abs(change),
              referenceType: "ADJUSTMENT",
              referenceCode: adjustmentCode,
              createdBy: employeeObjId,
              note: note || item.reason,
            }],
            { session }
          );

          movements.push({
            itemType: itemInfo.itemType,
            productName: itemInfo.itemType === "PRODUCT" ? itemInfo.name : undefined,
            giftName: itemInfo.itemType === "GIFT" ? itemInfo.name : undefined,
            beforeQuantity,
            afterQuantity: item.newQuantity,
            change,
          });
        }
      }

      if (errors.length > 0 && movements.length === 0) {
        await session.abortTransaction();
        return { success: false, error: "Một số mặt hàng không thể điều chỉnh", insufficientItems: errors };
      }

      await session.commitTransaction();

      return {
        success: true,
        adjustmentCode,
        movements,
      };
    } catch (err) {
      await session.abortTransaction();
      console.error("WarehouseAdjustmentService.createAdjustment error:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Lỗi khi điều chỉnh tồn kho",
      };
    } finally {
      session.endSession();
    }
  }

  /**
   * Lấy danh sách điều chỉnh với phân trang.
   *
   * Each item is enriched with:
   *   - `direction`: "INCREASE" | "DECREASE" | "NEUTRAL"
   *   - `beforeQuantity` → `afterQuantity`
   *
   * We compute these by replaying the `WarehouseStockMovement`
   * history for each unique (warehouseId, itemType, productId/variantId/giftId)
   * trio in chronological order, summing signed deltas to get the
   * running total at each movement, and using it as `before`
   * for ADJUSTMENT movements.
   */
  async listAdjustments(filters: AdjustmentListFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const query: Record<string, unknown> = {};
    if (filters.warehouseId) {
      query.warehouseId = oid(filters.warehouseId, "Warehouse ID");
    }
    // If type filter is specified, filter by type; otherwise show all movements
    if (filters.type) {
      query.type = filters.type;
    }

    const [items, total] = await Promise.all([
      WarehouseStockMovement.find(query)
        .populate("warehouseId", "_id code name")
        .populate("productId", "_id code name")
        .populate("variantId", "_id sku")
        .populate("giftId", "_id name")
        .populate("createdBy", "_id employeeCode fullName")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      WarehouseStockMovement.countDocuments(query),
    ]);

    const enriched = await enrichAdjustmentsWithHistory(items);
    return { items: enriched, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }
}

/**
 * Pure helper: replay the inventory history for a single item
 * (same key: warehouseId + itemType + productId/variantId/giftId)
 * and recover the sign of each ADJUSTMENT row's change.
 *
 * Inputs:
 *   - `events`: full chronological list of `WarehouseStockMovement`
 *     for the item, each with `type`, `referenceType`,
 *     `quantity` (already absolute), and a stable `_id`.
 *   - `currentQuantity`: the actual `WarehouseInventory.quantity`
 *     after the last event (ground truth).
 *
 * Algorithm:
 *   - ADJUSTMENT rows store only an absolute magnitude; the sign is
 *     implicit and must be recovered. We do so by global sign
 *     assignment over the ADJUSTMENT rows, scored by:
 *       `100 × |finalSum − currentQuantity| + 1000 × (negative runs)`
 *     with a tiny secondary penalty per `+` sign as a tiebreaker.
 *   - For `k ≤ 16` ADJUSTMENTs, all `2^k` sign combinations are
 *     evaluated (≤ 65 536 evaluations, each O(n)) and the minimum-
 *     score assignment wins.
 *   - For `k > 16` ADJUSTMENTs, a greedy 1-bit-flip local search is
 *     used. Production adjustment history per item rarely exceeds
 *     `k = 16`, so this fallback is mostly defensive.
 *
 * The replay is deterministic: identical inputs always produce
 * identical outputs. Intermediate running totals are kept
 * non-negative whenever possible to respect the physical invariant
 * `quantity ≥ 0`.
 */
export function replayAdjustmentSings(input: {
  events: Array<{ _id: string; type: string; referenceType: string; quantity: number }>;
  currentQuantity: number;
}): Map<string, { before: number; after: number; signed: number }> {
  const resolved = new Map<string, { before: number; after: number; signed: number }>();
  const events = input.events;

  // Index positions of ADJUSTMENT events in the timeline.
  const adjustmentIndices: number[] = [];
  for (let i = 0; i < events.length; i++) {
    if (events[i].referenceType === "ADJUSTMENT") adjustmentIndices.push(i);
  }
  const k = adjustmentIndices.length;

  // Fast path: no ADJUSTMENT rows to resolve.
  if (k === 0) return resolved;

  // For each ADJUSTMENT event, store its magnitude and index.
  const adjAbs: number[] = adjustmentIndices.map((i) => Math.abs(events[i].quantity));

  // Evaluate a candidate sign assignment `signs[k]` (each +/-1).
  // Returns score (lower is better) and per-row (before, after).
  function evaluate(signs: number[]): {
    score: number;
    rows: Array<{ before: number; after: number }>;
  } {
    let negPenalty = 0;
    let running = 0;
    const rows: Array<{ before: number; after: number }> = [];
    let adjCursor = 0;
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (ev.referenceType !== "ADJUSTMENT") {
        const sign = SIGNED_DELTA_TYPES[ev.type] ?? 0;
        running += sign * Math.abs(ev.quantity);
        if (running < 0) negPenalty += 1000;
        continue;
      }
      const before = running;
      const signed = signs[adjCursor] * adjAbs[adjCursor];
      running = before + signed;
      if (running < 0) negPenalty += 1000;
      rows.push({ before, after: running });
      adjCursor++;
    }
    const finalSum = running;
    const distPenalty = 100 * Math.abs(finalSum - input.currentQuantity);
    // Tie-breaker: prefer DECREASE so we tend to record negative signs
    // for adjustments when both assignments are equally plausible.
    const incTiebreaker = signs.reduce((s, x) => s + (x > 0 ? 1 : 0), 0);
    return { score: negPenalty + distPenalty + incTiebreaker, rows };
  }

  // Pick the best global assignment.
  // Brute force for k ≤ 16 (2^16 = 65536, fast).
  // For larger k fall back to greedy with two passes.
  let best: { score: number; signs: number[]; rows: Array<{ before: number; after: number }> } | null = null;
  if (k <= 16) {
    const total = 1 << k;
    for (let mask = 0; mask < total; mask++) {
      const signs: number[] = new Array(k);
      for (let j = 0; j < k; j++) signs[j] = ((mask >> j) & 1) === 0 ? -1 : 1;
      const ev = evaluate(signs);
      if (best === null || ev.score < best.score) {
        best = { score: ev.score, signs, rows: ev.rows };
      }
    }
  } else {
    // Greedy fallback: start from all-positive and flip one bit
    // at a time while the score improves.
    const signs: number[] = new Array(k).fill(1);
    const startScore = evaluate(signs).score;
    best = { score: startScore, signs: [...signs], rows: evaluate(signs).rows };
    let improved = true;
    let passes = 0;
    while (improved && passes < 8) {
      improved = false;
      passes++;
      for (let j = 0; j < k; j++) {
        const original = signs[j];
        signs[j] = -original;
        const ev = evaluate(signs);
        if (ev.score < (best?.score ?? Infinity)) {
          best = { score: ev.score, signs: [...signs], rows: ev.rows };
          improved = true;
        } else {
          signs[j] = original;
        }
      }
    }
  }

  // Materialize results.
  const finalSigns = best?.signs ?? new Array(k).fill(1);
  const finalRows = best?.rows ?? [];
  for (let j = 0; j < k; j++) {
    const idx = adjustmentIndices[j];
    const evId = String(events[idx]._id);
    const row = finalRows[j];
    resolved.set(evId, {
      before: row.before,
      after: row.after,
      signed: finalSigns[j] * adjAbs[j],
    });
  }
  return resolved;
}

async function enrichAdjustmentsWithHistory(
  items: unknown[]
): Promise<AdjustmentListItem[]> {
  type Row = {
    _id: unknown;
    warehouseId?: unknown;
    itemType?: string;
    productId?: unknown;
    variantId?: unknown;
    giftId?: unknown;
    quantity: number;
    type: string;
    referenceCode?: string;
    createdBy?: unknown;
    createdAt: Date | string;
  };

  const rows = items as Row[];

  const keyOf = (r: Row) =>
    [
      String((r.warehouseId as { _id?: unknown } | null | undefined)?._id ?? r.warehouseId ?? ""),
      r.itemType ?? "",
      String((r.productId as { _id?: unknown } | null | undefined)?._id ?? r.productId ?? ""),
      String((r.variantId as { _id?: unknown } | null | undefined)?._id ?? r.variantId ?? ""),
      String((r.giftId as { _id?: unknown } | null | undefined)?._id ?? r.giftId ?? ""),
    ].join("|");

  const keyToEnriched = new Map<
    string,
    Map<string, { before: number; after: number; signed: number }>
  >();

  const uniqueKeys = Array.from(new Set(rows.map(keyOf)));
  for (const key of uniqueKeys) {
    const [warehouseId, itemType, productId, variantId, giftId] = key.split("|");
    const baseQuery: Record<string, unknown> = {
      itemType,
      productId: productId ? new mongoose.Types.ObjectId(productId) : null,
      variantId: variantId ? new mongoose.Types.ObjectId(variantId) : null,
      giftId: giftId ? new mongoose.Types.ObjectId(giftId) : null,
    };
    if (warehouseId) baseQuery.warehouseId = new mongoose.Types.ObjectId(warehouseId);

    const allMovements = await WarehouseStockMovement.find(baseQuery)
      .sort({ createdAt: 1 })
      .select({ type: 1, quantity: 1, createdAt: 1, referenceType: 1 })
      .lean();
    const currentInventory = await WarehouseInventory.findOne({
      ...baseQuery,
      isActive: true,
    })
      .select({ quantity: 1 })
      .lean();

    const currentQuantity =
      currentInventory && typeof currentInventory.quantity === "number"
        ? currentInventory.quantity
        : 0;

    const replay = replayAdjustmentSings({
      events: allMovements.map((m) => ({
        _id: String(m._id),
        type: String(m.type),
        referenceType: String(m.referenceType),
        quantity: Number(m.quantity ?? 0),
      })),
      currentQuantity,
    });

    keyToEnriched.set(key, replay);
  }

  return rows.map((r) => {
    const found = keyToEnriched.get(keyOf(r))?.get(String(r._id));
    const signedChange = found?.signed ?? 0;
    const direction = classifyAdjustmentDirection(signedChange);
    return {
      ...r,
      quantity: Number(r.quantity ?? 0),
      changeSigned: signedChange,
      beforeQuantity: found?.before ?? 0,
      afterQuantity: found?.after ?? Number(r.quantity ?? 0),
      direction,
    } as AdjustmentListItem;
  });
}

export const warehouseAdjustmentService = new WarehouseAdjustmentService();

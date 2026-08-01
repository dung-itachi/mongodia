/**
 * ==================================================
 * ORDER STOCK WIRING HELPER
 * ==================================================
 *
 * Wire layer — tính toán xem Order cần RESERVE / RELEASE / không làm gì
 * với Stock Engine, dựa trên diff giữa oldOrder vs newOrder.
 *
 * KHÔNG tự viết Business Rule.
 * KHÔNG gọi Stock Engine — chỉ trả về plan, caller thực thi.
 *
 * Quy ước:
 *   - Stock Engine chỉ làm việc với `productVariantId` (không phải `productId`).
 *   - Stock Engine chỉ chấp nhận `comboId` khi schema mở rộng (hiện throw).
 *   - Order NON_REVENUE (GIFT / EXCHANGE / REPLACEMENT) KHÔNG giữ kho.
 *   - Một Order = 1 StockLineItem (productVariantId + quantity).
 *
 * ─────────────────────────────────────────────────
 *  SOURCE OF TRUTH cho "Order đang giữ chỗ hay không"
 * ─────────────────────────────────────────────────
 *
 * KHÔNG dùng `Order.stockReserved` (boolean) — boolean rất dễ lệch sau chuỗi
 *   Reserve ↓ Release ↓ Reserve.
 *
 * Source of truth là `InventoryHistory` (append-only log):
 *   netReserved(orderId, productVariantId)
 *     = Σ(InventoryHistory.action = RESERVE    , quantity)
 *     − Σ(InventoryHistory.action = UNRESERVE  , quantity)
 *
 * Khi `netReserved >= oldOrder.quantity` → Order đang thực sự giữ chỗ cho
 *   variant đó. Khi đó mới được phép gọi `releaseReservedStock()`.
 *
 * Hàm `queryNetReserved()` đọc InventoryHistory qua aggregate (cùng session),
 * trả về Map<productVariantId, netReserved>.
 * ==================================================
 */

import mongoose from "mongoose";

import { OrderType, NON_REVENUE_ORDER_TYPES } from "@/constants/orderStatus";

import { InventoryHistory } from "@/models/InventoryHistory";

import type { StockLineItem } from "@/services/warehouse/stockEngine.service";

// ==================================================
// Snapshot — chỉ chứa field cần thiết để quyết định
// ==================================================

export interface OrderStockSnapshot {
  warehouseId?: string | null;
  productVariantId?: string | null;
  comboId?: string | null;
  /** quantity đã lưu trên Order (>= 1). */
  quantity: number;
  /** OrderType — quyết định có giữ kho không. */
  orderType: OrderType;
}

// ==================================================
// Plan — kết quả tính toán
// ==================================================

export interface StockPlan {
  /**
   * Có cần RELEASE reserved stock cũ không?
   * Trả về `StockLineItem` cho Stock Engine releaseReservedStock() gọi.
   * null = không cần release.
   */
  release: StockLineItem | null;
  /**
   * Có cần RESERVE stock mới không?
   * Trả về `StockLineItem` cho Stock Engine reserveStock() gọi.
   * null = không cần reserve.
   */
  reserve: StockLineItem | null;
}

// ==================================================
// Helpers
// ==================================================

function isNonRevenueOrderType(t: OrderType): boolean {
  return NON_REVENUE_ORDER_TYPES.has(t);
}

function canHaveStockReserve(snap: OrderStockSnapshot): boolean {
  // Cần: warehouse + (productVariantId hoặc comboId) + quantity > 0 + không phải non-revenue order.
  if (isNonRevenueOrderType(snap.orderType)) return false;
  if (!snap.warehouseId) return false;
  if (!snap.productVariantId && !snap.comboId) return false;
  if (!snap.quantity || snap.quantity <= 0) return false;
  return true;
}

function toStockLineItem(snap: OrderStockSnapshot): StockLineItem {
  if (snap.productVariantId) {
    return { productVariantId: snap.productVariantId, quantity: snap.quantity };
  }
  // comboId branch — Stock Engine hiện throw, nhưng vẫn để đúng shape.
  return { comboId: snap.comboId as string, quantity: snap.quantity };
}

/**
 * Query `InventoryHistory` aggregate để tính `netReserved` theo `orderId`.
 *
 *   netReserved(productVariantId)
 *     = Σ reservedChange (where orderId = X and productVariantId = Y)
 *
 * `reservedChange` chỉ non-zero cho RESERVE (+qty) và UNRESERVE (−qty).
 *
 * @param orderId   ObjectId của Order cần kiểm tra.
 * @param session   Transaction session (để đảm bảo nhất quán với PUT/DELETE flow).
 * @returns Map<productVariantId (string), netReserved (number)>.
 *
 * Lưu ý:
 *   - Kết quả có thể rỗng (Order chưa từng reserve) → Map rỗng → caller
 *     coi như netReserved = 0 cho mọi variant.
 *   - Aggregate lọc trực tiếp `reservedChange !== 0` để bỏ qua các row
 *     OUT / RETURN / ADJUST / TRANSFER (reservedChange = 0).
 */
export async function queryNetReserved(
  orderId: string | mongoose.Types.ObjectId,
  session?: mongoose.ClientSession
): Promise<Map<string, number>> {
  const oid = typeof orderId === "string"
    ? new mongoose.Types.ObjectId(orderId)
    : orderId;

  const rows = await InventoryHistory.aggregate([
    { $match: { orderId: oid, reservedChange: { $ne: 0 } } },
    {
      $group: {
        _id: "$productVariantId",
        total: { $sum: "$reservedChange" },
      },
    },
  ]).session(session ?? null);

  const map = new Map<string, number>();
  for (const row of rows) {
    const variantId = row._id?.toString();
    if (!variantId) continue; // bỏ qua combo / null variant
    map.set(variantId, row.total);
  }
  return map;
}

/**
 * Order hiện có đang thực sự giữ chỗ cho variant này không?
 *
 * = netReserved(orderId, productVariantId) >= oldOrder.quantity.
 *
 * @param oldOrder   Snapshot cũ (đã lưu trên Order).
 * @param netMap     Map<productVariantId, netReserved> do queryNetReserved trả về.
 */
function isCurrentlyHoldingReserved(
  oldOrder: OrderStockSnapshot,
  netMap: Map<string, number>
): boolean {
  if (!oldOrder.productVariantId) return false;
  const net = netMap.get(oldOrder.productVariantId) ?? 0;
  return net >= oldOrder.quantity;
}

// ==================================================
// Core
// ==================================================

/**
 * Tính kế hoạch RESERVE / RELEASE cho Order giữa oldOrder ↔ newOrder.
 *
 * Rule (theo đúng flow Order PUT):
 *   - Nếu KHÔNG thay đổi (warehouse, productVariantId, comboId, quantity)
 *     → không đụng Stock Engine.
 *   - Nếu oldOrder đang thực sự giữ stock (query từ InventoryHistory):
 *       - Hình thái mới KHÔNG giữ được (thiếu field / non-revenue) → release.
 *       - Hình thái mới vẫn giữ được nhưng khác (warehouse/productVariant/qty) → release + reserve.
 *       - Hình thái giữ nguyên → skip.
 *   - Nếu oldOrder KHÔNG giữ stock:
 *       - Hình thái mới giữ được → reserve.
 *
 * Caller phải truyền `netMap` (từ `queryNetReserved()`) để biết Order hiện
 * có đang giữ chỗ không — không dùng `Order.stockReserved` (đã bỏ).
 *
 * Return plan — caller tự gọi Stock Engine.
 */
export function buildStockWiringPlan(
  oldOrder: OrderStockSnapshot,
  newOrder: OrderStockSnapshot,
  netMap: Map<string, number>
): StockPlan {
  const oldCanReserve = canHaveStockReserve(oldOrder);
  const newCanReserve = canHaveStockReserve(newOrder);

  // ---- 1) Không thay đổi hình thái → skip ----------------------------
  if (
    oldCanReserve === newCanReserve &&
    oldOrder.warehouseId === newOrder.warehouseId &&
    oldOrder.productVariantId === newOrder.productVariantId &&
    oldOrder.comboId === newOrder.comboId &&
    oldOrder.quantity === newOrder.quantity
  ) {
    return { release: null, reserve: null };
  }

  // ---- 2) Tính release (chỉ khi oldOrder đang thực sự giữ kho) ------
  let release: StockLineItem | null = null;
  if (oldCanReserve && isCurrentlyHoldingReserved(oldOrder, netMap)) {
    release = toStockLineItem(oldOrder);
  }

  // ---- 3) Tính reserve (chỉ khi newOrder có thể giữ kho) ----------
  let reserve: StockLineItem | null = null;
  if (newCanReserve) {
    reserve = toStockLineItem(newOrder);
  }

  return { release, reserve };
}

/**
 * Helper cho POST Order — Order mới chưa từng reserve.
 *   - Nếu newOrder đủ điều kiện → reserve.
 *   - Ngược lại → không giữ kho.
 *
 * POST Order không cần query netMap (luôn = Map rỗng).
 */
export function buildStockWiringPlanForCreate(
  newOrder: OrderStockSnapshot
): StockPlan {
  const newCanReserve = canHaveStockReserve(newOrder);
  return {
    release: null,
    reserve: newCanReserve ? toStockLineItem(newOrder) : null,
  };
}

/**
 * Helper cho DELETE Order — release nếu đang giữ stock.
 *
 * Caller phải truyền `netMap` (từ `queryNetReserved()`).
 */
export function buildStockWiringPlanForDelete(
  oldOrder: OrderStockSnapshot,
  netMap: Map<string, number>
): StockPlan {
  const oldCanReserve = canHaveStockReserve(oldOrder);
  return {
    release:
      oldCanReserve && isCurrentlyHoldingReserved(oldOrder, netMap)
        ? toStockLineItem(oldOrder)
        : null,
    reserve: null,
  };
}
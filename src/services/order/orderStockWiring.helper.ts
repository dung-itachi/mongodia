/**
 * ==================================================
 * ORDER STOCK WIRING HELPER
 * ==================================================
 *
 * Wire layer — tính toán xem Order cần RESERVE / RELEASE / không làm gì
 * với Stock Engine, dựa trên diff giữa oldOrder vs newOrder.
 *
 * Phase 4.5 refactor (Inventory Identity Consistency):
 *   - KHÔNG dùng Order.productVariantId / Order.comboId / OrderItem.quantity
 *     làm source of truth cho inventory identity.
 *   - Source of truth là `Order.orderItems[].details[]` (PRODUCT) và
 *     `Order.orderItems[].giftSelections[]` (GIFT) — đã được validateItem
 *     resolve variantId và TOTAL gift quantity.
 *   - Helper này nhận vào 2 mảng `StockDemand[]` (oldDemands / newDemands)
 *     và tính release/reserve diff.
 *
 * Quy ước:
 *   - Stock Engine nhận `StockLineItem[]` (không có comboId).
 *   - Order NON_REVENUE (GIFT / EXCHANGE / REPLACEMENT) KHÔNG giữ kho.
 *   - Một Order có thể có NHIỀU `StockDemand` (combo multi-variant, multi-gift).
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
 * Khi `netReserved >= oldDemand.quantity` → Order đang thực sự giữ chỗ cho
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
import {
  type StockDemand,
  stockDemandKey,
} from "@/services/warehouse/stockDemand";

// ==================================================
// Snapshot — chỉ chứa field cần thiết để quyết định
// ==================================================

/**
 * Snapshot cho Order — chỉ chứa `orderType` + `warehouseId` + danh
 * sách `StockDemand[]` đã resolve. KHÔNG còn `productVariantId` /
 * `comboId` / `quantity` legacy.
 */
export interface OrderStockSnapshot {
  warehouseId?: string | null;
  /** OrderType — quyết định có giữ kho không. */
  orderType: OrderType;
  /** Danh sách demand đã normalize từ orderItems. */
  demands: StockDemand[];
}

// ==================================================
// Plan — kết quả tính toán
// ==================================================

export interface StockPlan {
  /**
   * Có cần RELEASE reserved stock cũ không?
   * Trả về `StockLineItem[]` cho Stock Engine releaseReservedStock().
   * rỗng = không cần release.
   */
  release: StockLineItem[];
  /**
   * Có cần RESERVE stock mới không?
   * Trả về `StockLineItem[]` cho Stock Engine reserveStock().
   * rỗng = không cần reserve.
   */
  reserve: StockLineItem[];
}

// ==================================================
// Helpers
// ==================================================

function isNonRevenueOrderType(t: OrderType): boolean {
  return NON_REVENUE_ORDER_TYPES.has(t);
}

function canHaveStockReserve(snap: OrderStockSnapshot): boolean {
  // Cần: warehouse + ít nhất 1 demand + không phải non-revenue order.
  if (isNonRevenueOrderType(snap.orderType)) return false;
  if (!snap.warehouseId) return false;
  if (!snap.demands || snap.demands.length === 0) return false;
  return true;
}

/**
 * Convert một `StockDemand` (PRODUCT có variant hoặc GIFT) → `StockLineItem`
 * cho Stock Engine. Trả về `null` nếu demand không thể map (vd: PRODUCT
 * không variant — Stock Engine hiện không có API riêng cho nó; caller
 * phải xử lý qua đường khác).
 */
export function demandToEngineLineItem(d: StockDemand): StockLineItem | null {
  if (d.itemType === "GIFT") {
    return {
      itemType: "GIFT",
      giftId: d.giftId as string | mongoose.Types.ObjectId,
      quantity: d.quantity,
    };
  }
  // PRODUCT có variant
  if (d.variantId) {
    return {
      itemType: "PRODUCT",
      productVariantId: d.variantId as string | mongoose.Types.ObjectId,
      quantity: d.quantity,
    };
  }
  // PRODUCT không variant — Stock Engine hiện không có entry point riêng.
  // Caller (route / api) phải skip hoặc dùng `WarehouseInventory` trực tiếp.
  return null;
}

/**
 * Convert `StockDemand[]` → `StockLineItem[]` (chỉ PRODUCT có variant + GIFT).
 *
 * PRODUCT không variant bị BỎ QUA — chúng phải được xử lý riêng qua
 * WarehouseInventory.findOneAndUpdate (không qua Stock Engine).
 */
export function demandsToEngineLineItems(demands: StockDemand[]): StockLineItem[] {
  const result: StockLineItem[] = [];
  for (const d of demands) {
    const li = demandToEngineLineItem(d);
    if (li) result.push(li);
  }
  return result;
}

// ==================================================
// Query helpers
// ==================================================

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
    if (!variantId) continue; // bỏ qua null variant
    map.set(variantId, row.total);
  }
  return map;
}

/**
 * Order hiện có đang thực sự giữ chỗ cho variant này không?
 *
 * = netReserved(orderId, productVariantId) >= oldOrder demand quantity.
 *
 * @param oldDemands   Danh sách demand cũ (đã lưu trên Order).
 * @param netMap       Map<productVariantId, netReserved> do queryNetReserved trả về.
 */
function isCurrentlyHoldingReserved(
  oldDemands: StockDemand[],
  netMap: Map<string, number>
): boolean {
  for (const d of oldDemands) {
    if (d.itemType !== "PRODUCT" || !d.variantId) continue;
    const net = netMap.get(d.variantId.toString()) ?? 0;
    if (net < d.quantity) return false;
  }
  return oldDemands.length > 0;
}

// ==================================================
// Core — wiring plans
// ==================================================

/**
 * Tính kế hoạch RESERVE / RELEASE cho Order giữa oldOrder ↔ newOrder.
 *
 * Rule (theo đúng flow Order PUT):
 *   - Nếu KHÔNG thay đổi (warehouseId, demands) → không đụng Stock Engine.
 *   - Nếu oldOrder đang thực sự giữ stock (query từ InventoryHistory):
 *       - Hình thái mới KHÔNG giữ được (thiếu field / non-revenue) → release.
 *       - Hình thái mới vẫn giữ được nhưng khác demands → release + reserve.
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
  const oldKeys = new Set(oldOrder.demands.map(stockDemandKey));
  const newKeys = new Set(newOrder.demands.map(stockDemandKey));
  const sameDemands =
    oldKeys.size === newKeys.size &&
    [...oldKeys].every((k) => newKeys.has(k)) &&
    oldOrder.demands.every((d) => {
      const newD = newOrder.demands.find((x) => stockDemandKey(x) === stockDemandKey(d));
      return newD && newD.quantity === d.quantity;
    });

  if (
    oldCanReserve === newCanReserve &&
    oldOrder.warehouseId === newOrder.warehouseId &&
    sameDemands
  ) {
    return { release: [], reserve: [] };
  }

  // ---- 2) Tính release (chỉ khi oldOrder đang thực sự giữ kho) ------
  const release: StockLineItem[] = [];
  if (oldCanReserve && isCurrentlyHoldingReserved(oldOrder.demands, netMap)) {
    // Release TẤT CẢ old demands (không phải chỉ phần diff) — vì cấu trúc
    // demand có thể thay đổi hoàn toàn (vd: thêm 1 variant mới).
    const releaseItems = demandsToEngineLineItems(oldOrder.demands);
    release.push(...releaseItems);
  }

  // ---- 3) Tính reserve (chỉ khi newOrder có thể giữ kho) ----------
  const reserve: StockLineItem[] = [];
  if (newCanReserve) {
    reserve.push(...demandsToEngineLineItems(newOrder.demands));
  }

  return { release, reserve };
}

/**
 * Helper cho POST Order — Order mới chưa từng reserve.
 *   - Nếu newOrder đủ điều kiện → reserve toàn bộ demands.
 *   - Ngược lại → không giữ kho.
 *
 * POST Order không cần query netMap (luôn = Map rỗng).
 */
export function buildStockWiringPlanForCreate(
  newOrder: OrderStockSnapshot
): StockPlan {
  const newCanReserve = canHaveStockReserve(newOrder);
  return {
    release: [],
    reserve: newCanReserve
      ? demandsToEngineLineItems(newOrder.demands)
      : [],
  };
}

/**
 * Helper cho DELETE Order — release TẤT CẢ reserved demands nếu đang giữ.
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
      oldCanReserve && isCurrentlyHoldingReserved(oldOrder.demands, netMap)
        ? demandsToEngineLineItems(oldOrder.demands)
        : [],
    reserve: [],
  };
}
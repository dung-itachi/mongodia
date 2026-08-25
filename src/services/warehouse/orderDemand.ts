/**
 * ==================================================
 * ORDER → STOCK DEMAND NORMALIZER
 * ==================================================
 *
 * Đây là CẦU NỐI duy nhất giữa Order (top-level + orderItems)
 * và StockDemand[] (inventory identity).
 *
 * ─────────────────────────────────────────────────
 *  Invariants (đã chốt)
 * ─────────────────────────────────────────────────
 *
 *   1. Source of truth cho inventory là `orderItems[].details[]`
 *      (PRODUCT) và `orderItems[].giftSelections[]` (GIFT).
 *
 *   2. KHÔNG dùng:
 *        - Order.productVariantId
 *        - Order.comboId
 *        - OrderItem.quantity (legacy)
 *
 *   3. Sau `saleOrderService.validateItem`, MỌI detail của product
 *      có variant PHẢI có variantId đã resolve. Detail không có
 *      variant (product không variant) → variantId = null.
 *
 *   4. Gift quantity là TOTAL trên toàn đơn (KHÔNG nhân thêm
 *      comboQuantity). validateItem đã đảm bảo.
 *
 * ─────────────────────────────────────────────────
 *  Hai luồng sử dụng
 * ─────────────────────────────────────────────────
 *
 *   - `normalizeOrderToDemands(order)` — dùng khi cần 1 danh sách
 *     đầy đủ (RESERVE từ validatedOrderItems, hoặc ship từ order đã lưu).
 *
 *   - `normalizeItemsToDemands(orderItems)` — dùng khi đã có mảng
 *     validated items (vd: trong POST /api/orders).
 */

import type { StockDemand } from "./stockDemand";
import { dedupeDemands } from "./stockDemand";

// ─────────────────────────────────────────────────
// Minimal shapes (tránh phụ thuộc vào Order mongoose model)
// ─────────────────────────────────────────────────

export interface NormalizedOrderItemShape {
  comboId?: unknown;
  productId?: unknown;
  comboQuantity?: number;
  packageQuantity?: number;
  giftMode?: "RANDOM" | "CUSTOMER_SELECTED";
  giftSelections?: Array<{
    giftProductId: unknown;
    quantity: number;
  }>;
  details?: Array<{
    quantity: number;
    variantId?: string | null;
  }>;
}

export interface NormalizedOrderShape {
  orderItems?: NormalizedOrderItemShape[];
}

// ─────────────────────────────────────────────────
// Pure helpers (idempotent + testable)
// ─────────────────────────────────────────────────

/**
 * Convert 1 detail row → 1 PRODUCT demand.
 *
 * - variantId !== null/undefined → demand với variantId đó.
 * - variantId === null → demand với productId, variantId=null.
 * - variantId undefined (lỗi) → throw rõ ràng.
 */
export function detailToDemand(
  productId: string,
  detail: { quantity: number; variantId?: string | null }
): StockDemand {
  if (typeof detail.variantId === "undefined") {
    throw new Error(
      `Order item detail cho product ${productId} thiếu variantId đã resolve. ` +
        `Phải chạy saleOrderService.validateItem trước.`
    );
  }
  if (detail.variantId === null) {
    return {
      itemType: "PRODUCT",
      productId,
      variantId: null,
      quantity: detail.quantity,
    };
  }
  return {
    itemType: "PRODUCT",
    productId,
    variantId: detail.variantId,
    quantity: detail.quantity,
  };
}

/**
 * Convert orderItems → demands (PRODUCT + GIFT).
 *
 * Quy ước quantity:
 *   - PRODUCT: tổng `details[].quantity` cho mỗi variant.
 *   - GIFT: TỔNG `giftSelections[].quantity` đã được validateItem lưu
 *     (TOTAL — không nhân thêm comboQuantity).
 */
export function orderItemsToDemands(
  orderItems: NormalizedOrderItemShape[]
): StockDemand[] {
  const demands: StockDemand[] = [];

  for (const item of orderItems ?? []) {
    if (item.productId === undefined || item.productId === null) {
      // Order item không gắn product (lỗi validate ở upstream).
      // Bỏ qua — không gây crash inventory flow.
      continue;
    }
    const productId = String(item.productId);

    // ---- PRODUCT demands (từ details[]) --------------------------
    const details = item.details ?? [];
    for (const detail of details) {
      demands.push(detailToDemand(productId, detail));
    }

    // ---- GIFT demands (từ giftSelections[]) ----------------------
    // CHỈ lấy từ giftSelections (đã là TOTAL theo validateItem).
    if (item.giftMode === "CUSTOMER_SELECTED") {
      for (const sel of item.giftSelections ?? []) {
        if (!sel.giftProductId) continue;
        demands.push({
          itemType: "GIFT",
          giftId: String(sel.giftProductId),
          quantity: sel.quantity,
        });
      }
    }
    // RANDOM: giftSelections = [] → không suy ra demand. Kho tự chọn
    // (không reserve trước cho gift RANDOM — theo business rule hiện tại).
  }

  return dedupeDemands(demands);
}

/**
 * Wrapper cho cả Order.
 */
export function normalizeOrderToDemands(
  order: NormalizedOrderShape
): StockDemand[] {
  return orderItemsToDemands(order.orderItems ?? []);
}

// ─────────────────────────────────────────────────
// Helper: truy vấn Order từ DB
// ─────────────────────────────────────────────────

/**
 * Query Order đầy đủ (orderItems[]) và normalize thành demands.
 *
 * Dùng cho:
 *   - shipOrder khi caller không truyền actualShipments.
 *   - returnOrder khi cần derive lại identity.
 *
 * `session` optional — truyền vào để đảm bảo consistency với transaction.
 */
export async function loadOrderDemands(
  OrderModel: {
    findById(id: unknown): {
      select(fields: string): {
        session(s: unknown): { lean(): Promise<NormalizedOrderShape | null> };
        lean(): Promise<NormalizedOrderShape | null>;
      };
    };
  },
  orderId: string,
  session?: unknown
): Promise<StockDemand[]> {
  const q = OrderModel.findById(orderId).select("orderItems");
  const order = session ? await q.session(session).lean() : await q.lean();
  if (!order) {
    throw new Error("Đơn hàng không tồn tại");
  }
  if (!order.orderItems || order.orderItems.length === 0) {
    throw new Error("Đơn hàng chưa có sản phẩm để xuất kho");
  }
  return orderItemsToDemands(order.orderItems as NormalizedOrderItemShape[]);
}
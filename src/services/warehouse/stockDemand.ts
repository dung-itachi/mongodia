/**
 * ==================================================
 * INVENTORY IDENTITY — STOCK DEMAND
 * ==================================================
 *
 * Single source of truth cho mọi item tồn kho cần thao tác
 * trên Order CREATE / RESERVE / SHIP / RETURN.
 *
 * Mọi layer trong hệ thống phải dùng `StockDemand` để nói
 * về "cần bao nhiêu variant/product/gift nào". KHÔNG layer
 * nào tự đoán variant từ `ProductVariant.find(...)[0]` hoặc
 * từ `Order.productVariantId` / `Order.comboId`.
 *
 * ─────────────────────────────────────────────────
 *  Inventory identity (khoá duy nhất trên WarehouseInventory)
 * ─────────────────────────────────────────────────
 *
 *   PRODUCT có variant    → (warehouseId, itemType=PRODUCT, productId, variantId)
 *   PRODUCT không variant → (warehouseId, itemType=PRODUCT, productId, variantId=null)
 *   GIFT                  → (warehouseId, itemType=GIFT, giftId)
 *
 * Combo KHÔNG phải inventory identity — combo chỉ là cấu trúc
 * bán hàng. Inventory được derive từ `Order.orderItems[].details[]`
 * (đã resolve variantId) + `Order.orderItems[].giftSelections[]`.
 *
 * ─────────────────────────────────────────────────
 *  Quy ước số lượng (semantics duy nhất)
 * ─────────────────────────────────────────────────
 *
 *   - PRODUCT quantity: số đơn vị vật lý của variant/product đó.
 *     Đọc từ `details[].quantity` (đã được validateItem resolve).
 *
 *   - GIFT quantity: TỔNG số quà khách yêu cầu trên đơn.
 *     `giftSelections[].quantity` đã được validateItem normalize
 *     thành TOTAL (không nhân thêm comboQuantity).
 *
 * Các layer trên đều dùng cùng một semantics — tránh double-multiply.
 */

import mongoose from "mongoose";

// ─────────────────────────────────────────────────
// Identity primitives
// ─────────────────────────────────────────────────

/**
 * Một yêu cầu tồn kho đã được resolve đầy đủ — không còn phụ thuộc
 * vào `Order.productVariantId` / `Order.comboId` / `OrderItem.quantity`.
 */
export interface StockDemand {
  /** PRODUCT (variant hoặc product không variant) hoặc GIFT. */
  itemType: "PRODUCT" | "GIFT";
  /** Bắt buộc cho PRODUCT. */
  productId?: string | mongoose.Types.ObjectId | null;
  /** Bắt buộc cho PRODUCT có variant. Null cho PRODUCT không variant. */
  variantId?: string | mongoose.Types.ObjectId | null;
  /** Bắt buộc cho GIFT. */
  giftId?: string | mongoose.Types.ObjectId | null;
  /** Số lượng vật lý (luôn dương, integer). */
  quantity: number;
}

// ─────────────────────────────────────────────────
// Key helpers (dùng cho Map / Set dedupe)
// ─────────────────────────────────────────────────

/**
 * Khoá identity cho PRODUCT — duy nhất trong 1 đơn hàng.
 *
 *   PRODUCT có variant    → "P:<productId>:<variantId>"
 *   PRODUCT không variant → "P:<productId>:null"
 *
 * KHÔNG dùng comboId.
 */
export function productKey(
  productId: string | mongoose.Types.ObjectId,
  variantId: string | mongoose.Types.ObjectId | null | undefined
): string {
  const p = productId.toString();
  const v = variantId ? variantId.toString() : "null";
  return `P:${p}:${v}`;
}

/** Khoá identity cho GIFT. */
export function giftKey(giftId: string | mongoose.Types.ObjectId): string {
  return `G:${giftId.toString()}`;
}

/** Khoá identity cho một StockDemand bất kỳ. */
export function stockDemandKey(d: StockDemand): string {
  if (d.itemType === "GIFT") {
    return giftKey(d.giftId!);
  }
  return productKey(d.productId!, d.variantId ?? null);
}

// ─────────────────────────────────────────────────
// Dedupe + sum (dùng cho nhiều orderItems trong cùng đơn)
// ─────────────────────────────────────────────────

/**
 * Gộp nhiều `StockDemand` theo identity key, cộng quantity.
 *
 * Dùng khi:
 *   - Đơn có nhiều `orderItems` (nhiều combo) cùng tham chiếu 1 variant.
 *   - Đơn có 2 detail khác nhau nhưng cùng variant (không nên xảy ra, nhưng
 *     vẫn an toàn cộng dồn thay vì 1 row 2 lần).
 */
export function dedupeDemands(demands: StockDemand[]): StockDemand[] {
  const map = new Map<string, StockDemand>();
  for (const d of demands) {
    const key = stockDemandKey(d);
    const existing = map.get(key);
    if (existing) {
      existing.quantity += d.quantity;
    } else {
      map.set(key, { ...d });
    }
  }
  return [...map.values()];
}

// ─────────────────────────────────────────────────
// Convert to engine-level line items
// ─────────────────────────────────────────────────

import type { StockLineItem as EngineLineItem } from "@/services/warehouse/stockEngine.service";

/**
 * Convert `StockDemand` → `StockLineItem` cho Stock Engine.
 *
 * Stock Engine hiện chỉ hiểu 2 loại:
 *   - PRODUCT có variant: `productVariantId`
 *   - GIFT:               (engine chưa hỗ trợ trực tiếp — caller
 *                           phải dùng đường riêng, vd:
 *                           `WarehouseInventory.findOneAndUpdate` trực tiếp).
 *
 * Hàm này KHÔNG được nhận comboId.
 */
export function toEngineLineItem(
  d: StockDemand
): EngineLineItem | null {
  if (d.itemType === "PRODUCT") {
    // PRODUCT không variant → KHÔNG thể build EngineLineItem vì engine
    // hiện tại yêu cầu productVariantId. Caller phải xử lý qua đường
    // khác (vd: WarehouseInventory trực tiếp).
    if (!d.variantId) return null;
    return {
      itemType: "PRODUCT" as const,
      productVariantId: d.variantId as string | mongoose.Types.ObjectId,
      quantity: d.quantity,
    };
  }
  // GIFT: hiện không qua Stock Engine.
  return null;
}
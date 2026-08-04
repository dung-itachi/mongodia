/**
 * ==================================================
 * REVENUE RULE CONSTANTS
 * ==================================================
 *
 * Pure constants + enums dùng cho Order Revenue Engine.
 * KHÔNG phụ thuộc Mongo, KHÔNG có side-effect.
 *
 * Phân biệt rõ:
 * - OrderStatus (PENDING / CONFIRMED / SHIPPING / ...) - trạng thái đơn hàng.
 * - RevenueLockReason (NONE / WAITING_PREVIOUS_ORDER / PREPAID_PRIORITY / ...)
 *   - LÝ DO một Order bị lock / unlock revenue.
 * - RevenueOwnerType (CUSTOMER_SAME_PRODUCT_FAMILY / GIFT / ...)
 *   - AI đang giữ slot revenue.
 *
 * Rule service (`revenueRule.service.ts`) dùng các enum này để
 * trả lời các câu hỏi: ai là owner? Order này có được lock không?
 * có được unlock không? có phải transfer revenue không?
 *
 * Rule Layer KHÔNG ghi DB. Chỉ trả lời boolean / enum.
 * Engine Layer (Phase 4) sẽ wire các rule này vào persist.
 * ==================================================
 */

import {
  OrderStatus,
  OrderType,
  NON_REVENUE_ORDER_TYPES,
} from "./orderStatus";

// ==================================================
// RevenueOwnerType
// ==================================================
//
// Ai đang sở hữu slot revenue trong một family?
//
export enum RevenueOwnerType {
  /** Order CÙNG productId/comboId, CÙNG customer, là candidate đầu tiên. */
  SAME_PRODUCT_FAMILY = "SAME_PRODUCT_FAMILY",
  /** Đơn GIFT / EXCHANGE / REPLACEMENT — KHÔNG bao giờ là owner. */
  NON_REVENUE_ORDER = "NON_REVENUE_ORDER",
  /** Order cùng customer nhưng KHÁC product/combo → không tranh slot. */
  DIFFERENT_PRODUCT_FAMILY = "DIFFERENT_PRODUCT_FAMILY",
  /** Order thuộc CUSTOMER khác → không tranh slot. */
  DIFFERENT_CUSTOMER = "DIFFERENT_CUSTOMER",
}

// ==================================================
// RevenueLockReason
// ==================================================
//
// Lý do một Order bị KHÔNG được tính revenue.
// (Bổ sung từ orderStatus.ts để độc lập khỏi OrderStatus module.)
//
export enum RevenueLockReason {
  /** Order được tính revenue bình thường. */
  NONE = "NONE",
  /** Có đơn trước cùng family đang active, chờ đơn trước hoàn tất/hủy. */
  WAITING_PREVIOUS_ORDER = "WAITING_PREVIOUS_ORDER",
  /** Có đơn trước cùng family đang active VÀ order này đã PREPAID
   *  → order này giành slot, đẩy đơn trước sang WAITING. */
  PREPAID_PRIORITY = "PREPAID_PRIORITY",
  /** Đơn sau (cùng family, đã PREPAID) đã chiếm slot của đơn này. */
  CUSTOMER_ALREADY_BUYING = "CUSTOMER_ALREADY_BUYING",
  /** Order đã bị hủy / từ chối / giao thất bại. */
  ORDER_CANCELLED = "ORDER_CANCELLED",
  /** Order là GIFT / EXCHANGE / REPLACEMENT — không tham gia revenue. */
  NON_REVENUE_ORDER = "NON_REVENUE_ORDER",
}

// ==================================================
// RevenueUnlockReason
// ==================================================
//
// Lý do một Order được MỞ KHÓA (unlock) revenue.
// Khi đơn trước cancel, đơn sau đang WAITING sẽ được unlock.
//
export enum RevenueUnlockReason {
  /** Đơn đang chờ được unlock vì đơn trước đã cancel. */
  PREVIOUS_ORDER_CANCELLED = "PREVIOUS_ORDER_CANCELLED",
  /** Đơn trước vẫn active nhưng đơn sau đã PREPAID — slot chuyển. */
  NEXT_ORDER_PREPAID = "NEXT_ORDER_PREPAID",
  /** Order chuyển sang status unlock (CANCELLED / REJECTED / FAILED). */
  ORDER_STATUS_UNLOCKED = "ORDER_STATUS_UNLOCKED",
}

// ==================================================
// RevenuePriority
// ==================================================
//
// Độ ưu tiên của một Order trong family (cao = giành slot trước).
// Dùng để so sánh khi có nhiều đơn cùng lúc muốn owner slot.
//
export enum RevenuePriority {
  /** GIFT / EXCHANGE / REPLACEMENT: không tham gia. */
  NONE = "NONE",
  /** Đơn thường chưa PREPAID. */
  NORMAL = "NORMAL",
  /** Đơn đã PREPAID — cao hơn NORMAL. */
  PREPAID = "PREPAID",
  /** Đơn COMPLETED — cao nhất (đã xong, không thể tranh cãi). */
  COMPLETED = "COMPLETED",
}

// ==================================================
// RevenueState
// ==================================================
//
// Trạng thái về mặt revenue của một Order.
// Độc lập với OrderStatus — 1 đơn COMPLETED vẫn có thể ở state LOCKED.
//
export enum RevenueState {
  /** Đang được tính revenue. */
  ELIGIBLE = "ELIGIBLE",
  /** Đang chờ (có đơn trước active cùng family). */
  LOCKED = "LOCKED",
  /** Đã bị cancel / reject / fail — không tính, không thể unlock. */
  UNLOCKED = "UNLOCKED",
  /** Không tham gia revenue (GIFT / EXCHANGE / REPLACEMENT). */
  EXEMPTED = "EXEMPTED",
}

// ==================================================
// Status helpers — re-export + classify
// ==================================================

/**
 * Status là "đang giữ slot" (chưa thể kết thúc revenue).
 * Đây là REVENUE_LOCKING_STATUSES, mirror từ orderStatus.ts
 * để rule layer đứng độc lập.
 */
export const REVENUE_ACTIVE_STATUSES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPAID,
  OrderStatus.SHIPPING,
  OrderStatus.DELIVERED,
]);

/**
 * Status mở khóa revenue (đơn đã kết thúc vòng đời, không lock ai).
 */
export const REVENUE_UNLOCK_STATUSES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.CANCELLED,
  OrderStatus.REJECTED,
  OrderStatus.FAILED,
]);

/** Order có phải non-revenue (không tham gia) không? */
export function isNonRevenueOrderType(orderType: OrderType): boolean {
  return NON_REVENUE_ORDER_TYPES.has(orderType);
}

/** Status có phải "đang active giữ slot" không? */
export function isRevenueActiveStatus(status: OrderStatus): boolean {
  return REVENUE_ACTIVE_STATUSES.has(status);
}

/** Status có phải "đã mở khóa vĩnh viễn" không? */
export function isRevenueUnlockStatus(status: OrderStatus): boolean {
  return REVENUE_UNLOCK_STATUSES.has(status);
}

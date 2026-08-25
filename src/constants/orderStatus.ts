/**
 * ==================================================
 * ORDER STATUS & REVENUE LOCK CONSTANTS
 * ==================================================
 *
 * Sprint 8.5: Refactor Order Workflow
 *
 * Workflow mới:
 * WAIT_CONFIRM → CONFIRMED → PACKING → SHIPPING → DELIVERED
 *                                        ↓
 *                                    RETURNED
 *
 * Đối soát: KHÔNG phải status riêng, chỉ là flag isReconciled
 * trên đơn DELIVERED hoặc RETURNED.
 */

/** Status values used by an Order throughout its lifecycle. */
export enum OrderStatus {
  /** Sale vừa chốt, chưa xác nhận lại với khách. */
  WAIT_CONFIRM = "WAIT_CONFIRM",
  /** Đã xác nhận / chốt đơn. */
  CONFIRMED = "CONFIRMED",
  /** Đang đóng gói. */
  PACKING = "PACKING",
  /** Đang vận chuyển. */
  SHIPPING = "SHIPPING",
  /** Giao thành công. */
  DELIVERED = "DELIVERED",
  /** Đơn hoàn. */
  RETURNED = "RETURNED",
  /** @deprecated - Không còn là status. Dùng isReconciled flag thay thế. */
  RECONCILED = "RECONCILED",
  /** Đã hủy. */
  CANCELLED = "CANCELLED",

  // Legacy aliases (same string values, for backward compatibility)
  PENDING = "WAIT_CONFIRM",
  PREPAID = "CONFIRMED",
  REJECTED = "CANCELLED",
  FAILED = "CANCELLED",
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.WAIT_CONFIRM]: "Chờ xác nhận",
  [OrderStatus.CONFIRMED]: "Đã xác nhận",
  [OrderStatus.PACKING]: "Đang đóng gói",
  [OrderStatus.SHIPPING]: "Đang giao",
  [OrderStatus.DELIVERED]: "Đã giao",
  [OrderStatus.RETURNED]: "Đã hoàn trả",
  [OrderStatus.CANCELLED]: "Đã hủy",
};

/** Valid order statuses for workflow (Sprint 8.5) */
export const VALID_ORDER_STATUSES: ReadonlyArray<OrderStatus> = [
  OrderStatus.WAIT_CONFIRM,
  OrderStatus.CONFIRMED,
  OrderStatus.PACKING,
  OrderStatus.SHIPPING,
  OrderStatus.DELIVERED,
  OrderStatus.RETURNED,
  OrderStatus.CANCELLED,
];

/** Status set that frees revenue slot for the next Order of the same customer+product/combo. */
export const REVENUE_UNLOCK_STATUSES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.CANCELLED,
  OrderStatus.RETURNED,
  OrderStatus.DELIVERED,
]);

/**
 * Why an Order is excluded from marketing/sale revenue calculation.
 *
 * NONE                       → bình thường, được tính doanh thu.
 * WAITING_PREVIOUS_ORDER     → có đơn trước cùng Customer+Product/Combo
 *                              đang chiếm slot revenue.
 * CUSTOMER_ALREADY_BUYING    → (reserved) khách đã mua đơn khác đang active.
 * PREPAID_PRIORITY           → đơn sau đã trả trước, đơn trước bị mất quyền
 *                              tính doanh thu (chuyển slot cho đơn sau).
 * ORDER_CANCELLED            → đơn đã bị hủy/từ chối/thất bại, không tính.
 */
export enum RevenueLockReason {
  NONE = "NONE",
  WAITING_PREVIOUS_ORDER = "WAITING_PREVIOUS_ORDER",
  CUSTOMER_ALREADY_BUYING = "CUSTOMER_ALREADY_BUYING",
  PREPAID_PRIORITY = "PREPAID_PRIORITY",
  ORDER_CANCELLED = "ORDER_CANCELLED",
}

export const REVENUE_LOCK_LABELS: Record<RevenueLockReason, string> = {
  [RevenueLockReason.NONE]: "Được tính doanh thu",
  [RevenueLockReason.WAITING_PREVIOUS_ORDER]: "Chờ đơn trước hoàn tất",
  [RevenueLockReason.CUSTOMER_ALREADY_BUYING]: "Khách đang có đơn khác",
  [RevenueLockReason.PREPAID_PRIORITY]: "Đơn sau đã trả trước",
  [RevenueLockReason.ORDER_CANCELLED]: "Đơn đã hủy / từ chối / thất bại",
};

/**
 * Action types recorded in OrderHistory audit log.
 * Mirrors the LeadHistory pattern for consistency across the system.
 *
 * Sprint 8.5: Updated to match new workflow
 * - WAIT_CONFIRM, CONFIRMED, PACKING, SHIPPING, DELIVERED, RETURNED, RECONCILED
 */
export enum OrderAction {
  CREATED = "CREATED",
  UPDATED = "UPDATED",
  // Status change actions (Sprint 8.5)
  WAIT_CONFIRM = "WAIT_CONFIRM",
  CONFIRMED = "CONFIRMED",
  PACKING = "PACKING",
  SHIPPING = "SHIPPING",
  DELIVERED = "DELIVERED",
  RETURNED = "RETURNED",
  RECONCILED = "RECONCILED",
  CANCELLED = "CANCELLED",
  // Legacy status change (kept for backward compatibility)
  STATUS_CHANGED = "STATUS_CHANGED",
  PAYMENT_ADDED = "PAYMENT_ADDED",
  PAYMENT_REMOVED = "PAYMENT_REMOVED",
  SHIPPING_UPDATED = "SHIPPING_UPDATED",
  REVENUE_LOCKED = "REVENUE_LOCKED",
  REVENUE_UNLOCKED = "REVENUE_UNLOCKED",
  REVENUE_RECALCULATED = "REVENUE_RECALCULATED",
  NOTE_UPDATED = "NOTE_UPDATED",
  /** Phase 4.3 refactor: Stock Engine đã giữ chỗ (RESERVE) cho Order. */
  STOCK_RESERVED = "STOCK_RESERVED",
  /** Phase 4.3 refactor: Stock Engine đã trả lại chỗ giữ (UNRESERVE) cho Order. */
  STOCK_RELEASED = "STOCK_RELEASED",
  DELETED = "DELETED",
}

export const ORDER_ACTION_LABELS: Record<OrderAction, string> = {
  [OrderAction.CREATED]: "Tạo đơn",
  [OrderAction.UPDATED]: "Cập nhật",
  // Status-specific actions (Sprint 8.5)
  [OrderAction.WAIT_CONFIRM]: "Chờ xác nhận",
  [OrderAction.CONFIRMED]: "Xác nhận đơn",
  [OrderAction.PACKING]: "Đóng gói",
  [OrderAction.SHIPPING]: "Giao hàng",
  [OrderAction.DELIVERED]: "Đã giao",
  [OrderAction.RETURNED]: "Hoàn trả",
  [OrderAction.RECONCILED]: "Đối soát",
  [OrderAction.CANCELLED]: "Hủy đơn",
  // Legacy
  [OrderAction.STATUS_CHANGED]: "Đổi trạng thái",
  [OrderAction.PAYMENT_ADDED]: "Thêm thanh toán",
  [OrderAction.PAYMENT_REMOVED]: "Xóa thanh toán",
  [OrderAction.SHIPPING_UPDATED]: "Cập nhật vận chuyển",
  [OrderAction.REVENUE_LOCKED]: "Khóa doanh thu",
  [OrderAction.REVENUE_UNLOCKED]: "Mở khóa doanh thu",
  [OrderAction.REVENUE_RECALCULATED]: "Tính lại doanh thu",
  [OrderAction.NOTE_UPDATED]: "Cập nhật ghi chú",
  [OrderAction.STOCK_RESERVED]: "Giữ chỗ tồn kho",
  [OrderAction.STOCK_RELEASED]: "Trả chỗ tồn kho",
  [OrderAction.DELETED]: "Xóa đơn",
};

/**
 * Loại đơn hàng.
 *
 * NORMAL      - Đơn mua bình thường (tính revenue).
 * COMBO       - Đơn mua combo (tính revenue, vẫn chiếm slot).
 * GIFT        - Đơn quà tặng (KHÔNG tính revenue, không chiếm slot).
 * EXCHANGE    - Đơn đổi hàng (KHÔNG tính revenue).
 * REPLACEMENT - Đơn bù hàng / bảo hành (KHÔNG tính revenue).
 *
 * Lưu ý: đây không phải status, mà là BẢN CHẤT đơn.
 * Revenue Lock Engine dùng field này để bỏ qua các đơn
 * GIFT / EXCHANGE / REPLACEMENT khi check slot - không cần đoán
 * `comboId != null` nữa.
 */
export enum OrderType {
  NORMAL = "NORMAL",
  COMBO = "COMBO",
  GIFT = "GIFT",
  EXCHANGE = "EXCHANGE",
  REPLACEMENT = "REPLACEMENT",
}

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  [OrderType.NORMAL]: "Đơn thường",
  [OrderType.COMBO]: "Đơn combo",
  [OrderType.GIFT]: "Đơn quà tặng",
  [OrderType.EXCHANGE]: "Đơn đổi hàng",
  [OrderType.REPLACEMENT]: "Đơn bù / bảo hành",
};

/**
 * Set of OrderTypes that do NOT occupy a revenue slot.
 * (GIFT / EXCHANGE / REPLACEMENT đều không tính doanh thu)
 */
export const NON_REVENUE_ORDER_TYPES: ReadonlySet<OrderType> = new Set([
  OrderType.GIFT,
  OrderType.EXCHANGE,
  OrderType.REPLACEMENT,
]);

/**
 * Nguồn tạo Order. KHÁC với `Lead.sourceType`:
 * - `Lead.sourceType` = nguồn KHÁCH (Facebook / TikTok / Zalo / Landing page).
 * - `Order.orderSource` = kênh SALE chốt đơn.
 *
 * Ví dụ: khách vào từ Facebook (Lead.sourceType = FACEBOOK_COMMENT)
 * nhưng Sale chốt đơn qua điện thoại (Order.orderSource = PHONE).
 */
export enum OrderSource {
  FACEBOOK = "FACEBOOK",
  IMPORT = "IMPORT",
  PHONE = "PHONE",
  WEBSITE = "WEBSITE",
  MANUAL = "MANUAL",
}

export const ORDER_SOURCE_LABELS: Record<OrderSource, string> = {
  [OrderSource.FACEBOOK]: "Facebook",
  [OrderSource.IMPORT]: "Import",
  [OrderSource.PHONE]: "Điện thoại",
  [OrderSource.WEBSITE]: "Website",
  [OrderSource.MANUAL]: "Tạo tay",
};
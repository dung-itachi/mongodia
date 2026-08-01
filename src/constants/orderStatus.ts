/**
 * ==================================================
 * ORDER STATUS & REVENUE LOCK CONSTANTS
 * ==================================================
 *
 * Centralised enums for Order lifecycle and the Revenue Lock Engine.
 * The Order Model and the orderRevenue service both consume from here.
 */

/** Status values used by an Order throughout its lifecycle. */
export enum OrderStatus {
  /** Customer đã đặt, chưa chốt. */
  PENDING = "PENDING",
  /** Đã xác nhận / chốt đơn, chờ thanh toán hoặc vận chuyển. */
  CONFIRMED = "CONFIRMED",
  /** Khách đã thanh toán một phần hoặc toàn bộ trước khi giao. */
  PREPAID = "PREPAID",
  /** Đang vận chuyển. */
  SHIPPING = "SHIPPING",
  /** Giao thành công - revenue finalised. */
  COMPLETED = "COMPLETED",
  /** Đã hủy - revenue bị mở khóa cho đơn sau. */
  CANCELLED = "CANCELLED",
  /** Bị từ chối (giống CANCELLED về revenue). */
  REJECTED = "REJECTED",
  /** Giao thất bại - revenue bị mở khóa cho đơn sau. */
  FAILED = "FAILED",
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "Chờ xử lý",
  [OrderStatus.CONFIRMED]: "Đã xác nhận",
  [OrderStatus.PREPAID]: "Đã cọc / Trả trước",
  [OrderStatus.SHIPPING]: "Đang giao",
  [OrderStatus.COMPLETED]: "Hoàn tất",
  [OrderStatus.CANCELLED]: "Đã hủy",
  [OrderStatus.REJECTED]: "Bị từ chối",
  [OrderStatus.FAILED]: "Giao thất bại",
};

/** Status set that frees revenue slot for the next Order of the same customer+product/combo. */
export const REVENUE_UNLOCK_STATUSES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.CANCELLED,
  OrderStatus.REJECTED,
  OrderStatus.FAILED,
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
 */
export enum OrderAction {
  CREATED = "CREATED",
  UPDATED = "UPDATED",
  STATUS_CHANGED = "STATUS_CHANGED",
  PAYMENT_ADDED = "PAYMENT_ADDED",
  PAYMENT_REMOVED = "PAYMENT_REMOVED",
  SHIPPING_UPDATED = "SHIPPING_UPDATED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  REJECTED = "REJECTED",
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
  [OrderAction.STATUS_CHANGED]: "Đổi trạng thái",
  [OrderAction.PAYMENT_ADDED]: "Thêm thanh toán",
  [OrderAction.PAYMENT_REMOVED]: "Xóa thanh toán",
  [OrderAction.SHIPPING_UPDATED]: "Cập nhật vận chuyển",
  [OrderAction.DELIVERED]: "Giao hàng",
  [OrderAction.CANCELLED]: "Hủy đơn",
  [OrderAction.REJECTED]: "Từ chối đơn",
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
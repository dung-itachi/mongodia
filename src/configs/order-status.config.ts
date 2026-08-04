/**
 * ==================================================
 * ORDER STATUS CONFIG
 * ==================================================
 *
 * Sprint 6.2 — Order Workflow
 *
 * Centralised config for Order Status:
 * - Labels
 * - Colors (for StatusBadge)
 * - Icons (for Timeline, Dashboard, Warehouse)
 * - Allowed transitions (workflow rules)
 * - Action labels
 *
 * Workflow:
 *   PENDING → CONFIRMED → PACKING → SHIPPING → DELIVERED
 *                                     ↓
 *                                 DELIVERED
 *                                     ↓
 *                                 RETURNED
 *
 *   PENDING → CANCELLED
 *   CONFIRMED → CANCELLED
 *   PACKING → CANCELLED
 */

/**
 * Status colors for UI display
 */
export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: "default",
  CONFIRMED: "processing",
  PACKING: "warning",
  SHIPPING: "blue",
  DELIVERED: "success",
  RETURNED: "error",
  CANCELLED: "default",
  PREPAID: "cyan",
  REJECTED: "error",
  FAILED: "error",
};

/**
 * Status icons for Timeline, Dashboard, Warehouse (Ant Design icons)
 * Sprint 6.2
 */
export const ORDER_STATUS_ICONS: Record<string, string> = {
  PENDING: "ClockCircleOutlined",
  CONFIRMED: "CheckOutlined",
  PACKING: "InboxOutlined",
  SHIPPING: "CarOutlined",
  DELIVERED: "CheckCircleOutlined",
  RETURNED: "UndoOutlined",
  CANCELLED: "CloseCircleOutlined",
  PREPAID: "WalletOutlined",
  REJECTED: "StopOutlined",
  FAILED: "WarningOutlined",
};

/**
 * Allowed status transitions
 * Key = current status, Value = array of allowed next statuses
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKING", "CANCELLED"],
  PACKING: ["SHIPPING", "CANCELLED"],
  SHIPPING: ["DELIVERED"],
  DELIVERED: ["RETURNED"],
  RETURNED: [],
  CANCELLED: [],
  PREPAID: ["PACKING", "CANCELLED"],
  REJECTED: [],
  FAILED: [],
};

/**
 * Status actions (buttons/dropdown items)
 * Key = current status, Value = array of actions with label and target status
 */
export interface StatusAction {
  label: string;
  targetStatus: string;
  color?: string;
}

export const STATUS_ACTIONS: Record<string, StatusAction[]> = {
  PENDING: [
    { label: "Xác nhận", targetStatus: "CONFIRMED", color: "blue" },
    { label: "Hủy đơn", targetStatus: "CANCELLED", color: "red" },
  ],
  CONFIRMED: [
    { label: "Đóng gói", targetStatus: "PACKING", color: "orange" },
    { label: "Hủy đơn", targetStatus: "CANCELLED", color: "red" },
  ],
  PACKING: [
    { label: "Giao hàng", targetStatus: "SHIPPING", color: "cyan" },
    { label: "Hủy đơn", targetStatus: "CANCELLED", color: "red" },
  ],
  SHIPPING: [
    { label: "Đã giao", targetStatus: "DELIVERED", color: "green" },
  ],
  DELIVERED: [
    { label: "Hoàn trả", targetStatus: "RETURNED", color: "red" },
  ],
  RETURNED: [],
  CANCELLED: [],
  PREPAID: [
    { label: "Đóng gói", targetStatus: "PACKING", color: "orange" },
    { label: "Hủy đơn", targetStatus: "CANCELLED", color: "red" },
  ],
  REJECTED: [],
  FAILED: [],
};

/**
 * Check if a status transition is allowed
 */
export function isStatusTransitionAllowed(
  currentStatus: string,
  newStatus: string
): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(newStatus);
}

/**
 * Get allowed next statuses for a given status
 */
export function getAllowedNextStatuses(currentStatus: string): string[] {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Get actions available for a given status
 */
export function getStatusActions(currentStatus: string): StatusAction[] {
  return STATUS_ACTIONS[currentStatus] || [];
}

/**
 * Check if order can be cancelled from current status
 */
export function canCancelFromStatus(currentStatus: string): boolean {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus]?.includes("CANCELLED") ?? false;
}

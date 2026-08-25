/**
 * ==================================================
 * ORDER STATUS CONFIG
 * ==================================================
 *
 * Sprint 8.5: Refactor Order Workflow
 *
 * Workflow mới:
 * WAIT_CONFIRM → CONFIRMED → SHIPPING → DELIVERED → RECONCILED
 *                                  ↓
 *                              RETURNED
 *                                  ↓
 *                             RECONCILED
 *
 * Business Rules:
 * - SHIPPING: Chỉ ở đây mới export Inventory
 * - RETURNED: Rollback Inventory
 * - RECONCILED: Doanh thu thực được ghi nhận
 */

/**
 * Status colors for UI display
 */
export const ORDER_STATUS_COLORS: Record<string, string> = {
  WAIT_CONFIRM: "warning",
  CONFIRMED: "processing",
  SHIPPING: "blue",
  DELIVERED: "success",
  RETURNED: "error",
  RECONCILED: "purple",
  CANCELLED: "default",
};

/**
 * Status icons for Timeline, Dashboard, Warehouse (Ant Design icons)
 * Sprint 8.5
 */
export const ORDER_STATUS_ICONS: Record<string, string> = {
  WAIT_CONFIRM: "ClockCircleOutlined",
  CONFIRMED: "CheckOutlined",
  SHIPPING: "CarOutlined",
  DELIVERED: "CheckCircleOutlined",
  RETURNED: "UndoOutlined",
  RECONCILED: "DollarOutlined",
  CANCELLED: "CloseCircleOutlined",
};

/**
 * Allowed status transitions (Sprint 8.5)
 * Key = current status, Value = array of allowed next statuses
 *
 * WAIT_CONFIRM → CONFIRMED → SHIPPING → DELIVERED → RECONCILED
 *                                  ↓
 *                              RETURNED → RECONCILED
 *
 * CANCELLED có thể từ bất kỳ trạng thái nào trước SHIPPING
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  WAIT_CONFIRM: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPING", "CANCELLED"],
  SHIPPING: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RECONCILED"],
  RETURNED: ["RECONCILED"],
  RECONCILED: [],
  CANCELLED: [],
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
  WAIT_CONFIRM: [
    { label: "Xác nhận", targetStatus: "CONFIRMED", color: "blue" },
    { label: "Hủy đơn", targetStatus: "CANCELLED", color: "red" },
  ],
  CONFIRMED: [
    { label: "Giao hàng", targetStatus: "SHIPPING", color: "cyan" },
    { label: "Hủy đơn", targetStatus: "CANCELLED", color: "red" },
  ],
  SHIPPING: [
    { label: "Đã giao", targetStatus: "DELIVERED", color: "green" },
    { label: "Hoàn trả", targetStatus: "RETURNED", color: "red" },
  ],
  DELIVERED: [
    { label: "Đối soát", targetStatus: "RECONCILED", color: "purple" },
  ],
  RETURNED: [
    { label: "Đối soát", targetStatus: "RECONCILED", color: "purple" },
  ],
  RECONCILED: [],
  CANCELLED: [],
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

/**
 * Check if status requires inventory export (Sprint 8.5)
 * Only SHIPPING status exports inventory
 */
export function requiresInventoryExport(status: string): boolean {
  return status === "SHIPPING";
}

/**
 * Check if status requires inventory rollback (Sprint 8.5)
 * RETURNED status rolls back inventory
 */
export function requiresInventoryRollback(status: string): boolean {
  return status === "RETURNED";
}

/**
 * Check if status is a revenue milestone (Sprint 8.5)
 * Only RECONCILED is the true revenue milestone
 */
export function isRevenueMilestone(status: string): boolean {
  return status === "RECONCILED";
}

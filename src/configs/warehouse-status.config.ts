/**
 * ==================================================
 * WAREHOUSE STATUS CONFIG
 * ==================================================
 *
 * Sprint 6.3 — Warehouse Integration
 *
 * Centralised config for Warehouse Status:
 * - Labels
 * - Colors (for StatusBadge)
 * - Icons (for Timeline, Dashboard)
 * - Allowed transitions (workflow rules)
 * - Action labels
 *
 * Workflow:
 *   WAITING_PICK → PICKING → PACKED → READY_TO_SHIP → SHIPPED
 */

/**
 * Status colors for UI display
 */
export const WAREHOUSE_STATUS_COLORS: Record<string, string> = {
  WAITING_PICK: "warning",
  PICKING: "processing",
  PACKED: "blue",
  READY_TO_SHIP: "cyan",
  SHIPPED: "success",
};

/**
 * Status icons for Timeline, Dashboard (Ant Design icons)
 * Sprint 6.3
 */
export const WAREHOUSE_STATUS_ICONS: Record<string, string> = {
  WAITING_PICK: "ClockCircleOutlined",
  PICKING: "SyncOutlined",
  PACKED: "InboxOutlined",
  READY_TO_SHIP: "CarOutlined",
  SHIPPED: "CheckCircleOutlined",
};

/**
 * Allowed status transitions
 * Key = current status, Value = array of allowed next statuses
 */
export const ALLOWED_WAREHOUSE_TRANSITIONS: Record<string, string[]> = {
  WAITING_PICK: ["PICKING"],
  PICKING: ["PACKED"],
  PACKED: ["READY_TO_SHIP"],
  READY_TO_SHIP: ["SHIPPED"],
  SHIPPED: [],
};

/**
 * Status action interface
 */
export interface WarehouseStatusAction {
  label: string;
  targetStatus: string;
  color?: string;
}

/**
 * Status actions (buttons/dropdown)
 */
export const WAREHOUSE_STATUS_ACTIONS: Record<string, WarehouseStatusAction[]> = {
  WAITING_PICK: [
    { label: "Bắt đầu nhặt", targetStatus: "PICKING", color: "blue" },
  ],
  PICKING: [
    { label: "Đóng gói xong", targetStatus: "PACKED", color: "cyan" },
  ],
  PACKED: [
    { label: "Sẵn sàng giao", targetStatus: "READY_TO_SHIP", color: "purple" },
  ],
  READY_TO_SHIP: [
    { label: "Bàn giao shipper", targetStatus: "SHIPPED", color: "green" },
  ],
  SHIPPED: [],
};

/**
 * Helper: Check if transition is allowed
 */
export function isWarehouseTransitionAllowed(
  currentStatus: string,
  newStatus: string
): boolean {
  const allowed = ALLOWED_WAREHOUSE_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(newStatus);
}

/**
 * Helper: Get allowed next statuses
 */
export function getAllowedWarehouseTransitions(currentStatus: string): string[] {
  return ALLOWED_WAREHOUSE_TRANSITIONS[currentStatus] || [];
}

/**
 * Helper: Get status actions
 */
export function getWarehouseStatusActions(
  currentStatus: string
): WarehouseStatusAction[] {
  return WAREHOUSE_STATUS_ACTIONS[currentStatus] || [];
}

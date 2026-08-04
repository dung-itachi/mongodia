/**
 * ==================================================
 * WAREHOUSE STATUS CONSTANTS
 * ==================================================
 *
 * Sprint 6.3 — Warehouse Integration
 *
 * Status values used by WarehouseTask throughout its lifecycle.
 *
 * Workflow:
 *   WAITING_PICK → PICKING → PACKED → READY_TO_SHIP → SHIPPED
 */

export enum WarehouseStatus {
  /** Chờ nhận việc nhặt hàng. */
  WAITING_PICK = "WAITING_PICK",
  /** Đang nhặt hàng. */
  PICKING = "PICKING",
  /** Đã đóng gói xong. */
  PACKED = "PACKED",
  /** Sẵn sàng giao cho shipper. */
  READY_TO_SHIP = "READY_TO_SHIP",
  /** Đã bàn giao cho shipper / hoàn tất warehouse. */
  SHIPPED = "SHIPPED",
}

export const WAREHOUSE_STATUS_LABELS: Record<WarehouseStatus, string> = {
  [WarehouseStatus.WAITING_PICK]: "Chờ nhặt hàng",
  [WarehouseStatus.PICKING]: "Đang nhặt hàng",
  [WarehouseStatus.PACKED]: "Đã đóng gói",
  [WarehouseStatus.READY_TO_SHIP]: "Sẵn sàng giao",
  [WarehouseStatus.SHIPPED]: "Đã bàn giao",
};

/**
 * Warehouse Action types recorded in WarehouseHistory audit log.
 */
export enum WarehouseAction {
  CREATED = "CREATED",
  UPDATED = "UPDATED",
  WAITING_PICK = "WAITING_PICK",
  PICKING = "PICKING",
  PACKED = "PACKED",
  READY_TO_SHIP = "READY_TO_SHIP",
  SHIPPED = "SHIPPED",
  ASSIGNED = "ASSIGNED",
  NOTE_UPDATED = "NOTE_UPDATED",
}

export const WAREHOUSE_ACTION_LABELS: Record<WarehouseAction, string> = {
  [WarehouseAction.CREATED]: "Tạo task",
  [WarehouseAction.UPDATED]: "Cập nhật",
  [WarehouseAction.WAITING_PICK]: "Chờ nhặt hàng",
  [WarehouseAction.PICKING]: "Bắt đầu nhặt",
  [WarehouseAction.PACKED]: "Đóng gói xong",
  [WarehouseAction.READY_TO_SHIP]: "Sẵn sàng giao",
  [WarehouseAction.SHIPPED]: "Bàn giao shipper",
  [WarehouseAction.ASSIGNED]: "Giao việc",
  [WarehouseAction.NOTE_UPDATED]: "Cập nhật ghi chú",
};

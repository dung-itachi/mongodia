/**
 * ==================================================
 * INVENTORY MOVEMENT CONFIG
 * ==================================================
 *
 * Sprint 6.4 — Inventory Movement
 *
 * Centralised config cho Inventory Movement:
 * - Labels
 * - Colors (for StatusBadge)
 * - Icons
 */

/**
 * Movement type colors for UI display
 */
export const MOVEMENT_TYPE_COLORS: Record<string, string> = {
  EXPORT: "red",
  IMPORT: "green",
  ADJUSTMENT: "orange",
};

/**
 * Movement type icons (Ant Design icons)
 */
export const MOVEMENT_TYPE_ICONS: Record<string, string> = {
  EXPORT: "ArrowUpOutlined",
  IMPORT: "ArrowDownOutlined",
  ADJUSTMENT: "EditOutlined",
};

/**
 * Movement type labels
 */
export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  EXPORT: "Xuất kho",
  IMPORT: "Nhập kho",
  ADJUSTMENT: "Điều chỉnh",
};

/**
 * Status colors for stock display
 */
export const STOCK_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "green",
  LOW_STOCK: "orange",
  OUT_OF_STOCK: "red",
};

/**
 * Helper: Get stock status based on quantity
 */
export function getStockStatus(quantity: number): "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK" {
  if (quantity <= 0) return "OUT_OF_STOCK";
  if (quantity <= 10) return "LOW_STOCK"; // Threshold có thể config sau
  return "AVAILABLE";
}

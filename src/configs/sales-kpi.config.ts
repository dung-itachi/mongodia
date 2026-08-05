/**
 * ==================================================
 * SALES KPI CONFIG
 * ==================================================
 *
 * Sprint 8.3 — Sales KPI & Target
 *
 * Configuration for Sales KPI Dashboard Cards.
 */

export interface KPICardConfig {
  key: string;
  title: string;
  type: "revenue" | "orders" | "customers" | "closedLeads";
  icon: string;
  color: string;
  format: "currency" | "number" | "percent";
}

export const KPI_CARDS: KPICardConfig[] = [
  {
    key: "revenue",
    title: "Doanh thu",
    type: "revenue",
    icon: "DollarOutlined",
    color: "#1890ff",
    format: "currency",
  },
  {
    key: "orders",
    title: "Đơn hàng",
    type: "orders",
    icon: "ShoppingCartOutlined",
    color: "#52c41a",
    format: "number",
  },
  {
    key: "customers",
    title: "Khách hàng mới",
    type: "customers",
    icon: "UserAddOutlined",
    color: "#722ed1",
    format: "number",
  },
  {
    key: "closedLeads",
    title: "Lead đã chốt",
    type: "closedLeads",
    icon: "TrophyOutlined",
    color: "#fa8c16",
    format: "number",
  },
];

export const CARD_COLORS = {
  revenue: "#1890ff",
  orders: "#52c41a",
  customers: "#722ed1",
  closedLeads: "#fa8c16",
  success: "#52c41a",
  warning: "#faad14",
  danger: "#f5222d",
};

export function formatKPICardValue(
  value: number,
  format: "currency" | "number" | "percent"
): string {
  switch (format) {
    case "currency":
      if (value >= 1_000_000_000) {
        return `${(value / 1_000_000_000).toFixed(1)}B`;
      }
      if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M`;
      }
      if (value >= 1_000) {
        return `${(value / 1_000).toFixed(1)}K`;
      }
      return value.toLocaleString("vi-VN");
    case "percent":
      return `${value.toFixed(1)}%`;
    case "number":
    default:
      return value.toLocaleString("vi-VN");
  }
}

export function getAchievementColor(achievement: number): string {
  if (achievement >= 100) return CARD_COLORS.success;
  if (achievement >= 70) return CARD_COLORS.warning;
  return CARD_COLORS.danger;
}

export function getAchievementLabel(achievement: number): string {
  if (achievement >= 100) return "Đạt";
  if (achievement >= 70) return "Gần đạt";
  return "Chưa đạt";
}

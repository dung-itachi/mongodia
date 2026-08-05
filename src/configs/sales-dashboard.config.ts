/**
 * ==================================================
 * SALES DASHBOARD CONFIG
 * ==================================================
 *
 * Sprint 8.2 — Sales Dashboard
 *
 * Configuration for dashboard cards.
 */

export type CardConfig = {
  key: string;
  label: string;
  icon: string;
  color: string;
  format?: "currency" | "number" | "percent";
  suffix?: string;
};

export const DASHBOARD_CARDS: CardConfig[] = [
  {
    key: "todayRevenue",
    label: "Doanh thu hôm nay",
    icon: "💰",
    color: "green",
    format: "currency",
  },
  {
    key: "monthRevenue",
    label: "Doanh thu tháng",
    icon: "📊",
    color: "blue",
    format: "currency",
  },
  {
    key: "todayOrders",
    label: "Đơn hàng hôm nay",
    icon: "📦",
    color: "purple",
    format: "number",
  },
  {
    key: "monthOrders",
    label: "Đơn hàng tháng",
    icon: "📋",
    color: "cyan",
    format: "number",
  },
  {
    key: "newCustomers",
    label: "Khách hàng mới",
    icon: "👤",
    color: "orange",
    format: "number",
  },
  {
    key: "activeCustomers",
    label: "KH đang chăm sóc",
    icon: "🤝",
    color: "gold",
    format: "number",
  },
  {
    key: "todayFollowUps",
    label: "Follow-up hôm nay",
    icon: "📅",
    color: "magenta",
    format: "number",
  },
  {
    key: "missedFollowUps",
    label: "Follow-up quá hạn",
    icon: "⚠️",
    color: "red",
    format: "number",
  },
];

export const CARD_COLORS: Record<string, string> = {
  green: "#52c41a",
  blue: "#1890ff",
  purple: "#722ed1",
  cyan: "#13c2c2",
  orange: "#fa8c16",
  gold: "#faad14",
  magenta: "#eb2f96",
  red: "#f5222d",
};

export function formatCardValue(
  value: number,
  format?: "currency" | "number" | "percent",
  suffix?: string
): string {
  if (format === "currency") {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B${suffix || "đ"}`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M${suffix || "đ"}`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K${suffix || "đ"}`;
    }
    return `${value.toLocaleString("vi-VN")}${suffix || "đ"}`;
  }

  if (format === "percent") {
    return `${value.toFixed(1)}%${suffix || ""}`;
  }

  return `${value.toLocaleString("vi-VN")}${suffix || ""}`;
}

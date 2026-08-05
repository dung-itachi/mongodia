/**
 * ==================================================
 * SALES KPI CHART CONFIG
 * ==================================================
 *
 * Sprint 8.3 — Sales KPI & Target
 *
 * Configuration for Sales KPI Charts.
 */

export interface KPIChartConfig {
  key: string;
  title: string;
  type: "revenue" | "orders";
  color: string;
  targetColor: string;
}

export const KPI_CHARTS: KPIChartConfig[] = [
  {
    key: "revenue",
    title: "Doanh thu vs Mục tiêu",
    type: "revenue",
    color: "#1890ff",
    targetColor: "#e6f7ff",
  },
  {
    key: "orders",
    title: "Đơn hàng vs Mục tiêu",
    type: "orders",
    color: "#52c41a",
    targetColor: "#f6ffed",
  },
];

export const CHART_COLORS = {
  revenue: "#1890ff",
  revenueTarget: "#91d5ff",
  orders: "#52c41a",
  ordersTarget: "#b7eb8f",
  customers: "#722ed1",
  customersTarget: "#d3adf7",
  achievement: "#faad14",
};

export const CHART_CONFIG = {
  revenue: {
    yAxisPrefix: "",
    yAxisSuffix: "",
    unit: "VNĐ",
  },
  orders: {
    yAxisPrefix: "",
    yAxisSuffix: " đơn",
    unit: "đơn",
  },
};

export const RANKING_COLORS = {
  gold: "#ffd700",
  silver: "#c0c0c0",
  bronze: "#cd7f32",
  excellent: "#52c41a",
  good: "#1890ff",
  warning: "#faad14",
  danger: "#f5222d",
};

export function getRankIcon(rank: number): string {
  switch (rank) {
    case 1:
      return "Cúp vàng";
    case 2:
      return "Huy hiệu bạc";
    case 3:
      return "Huy hiệu đồng";
    default:
      return `Hạng ${rank}`;
  }
}

export function getPerformanceLevel(achievement: number): {
  level: string;
  color: string;
} {
  if (achievement >= 100) return { level: "Xuất sắc", color: RANKING_COLORS.excellent };
  if (achievement >= 80) return { level: "Tốt", color: RANKING_COLORS.good };
  if (achievement >= 60) return { level: "Trung bình", color: RANKING_COLORS.warning };
  return { level: "Cần cải thiện", color: RANKING_COLORS.danger };
}

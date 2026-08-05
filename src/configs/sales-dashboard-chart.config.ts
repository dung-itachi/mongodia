/**
 * ==================================================
 * SALES DASHBOARD CHART CONFIG
 * ==================================================
 *
 * Sprint 8.2 — Sales Dashboard
 *
 * Configuration for dashboard charts.
 */

export type ChartType = "line" | "bar" | "area";
export type TrendPeriod = "daily" | "weekly" | "monthly";

export type ChartConfig = {
  key: string;
  label: string;
  color: string;
  chartType: ChartType;
};

export const DASHBOARD_CHARTS: ChartConfig[] = [
  {
    key: "revenue",
    label: "Doanh thu",
    color: "#1890ff",
    chartType: "area",
  },
  {
    key: "orders",
    label: "Đơn hàng",
    color: "#52c41a",
    chartType: "bar",
  },
  {
    key: "customers",
    label: "Khách hàng",
    color: "#722ed1",
    chartType: "line",
  },
];

export const CHART_COLORS = {
  revenue: {
    primary: "#1890ff",
    secondary: "#e6f7ff",
    gradient: ["#1890ff", "#69c0ff"],
  },
  orders: {
    primary: "#52c41a",
    secondary: "#f6ffed",
    gradient: ["#52c41a", "#b7eb8f"],
  },
  customers: {
    primary: "#722ed1",
    secondary: "#f9f0ff",
    gradient: ["#722ed1", "#d3adf7"],
  },
};

export const CHART_CONFIG = {
  height: 300,
  padding: [20, 20, 40, 50],
  animation: {
    duration: 500,
  },
  tooltip: {
    trigger: "axis",
  },
  legend: {
    position: "top" as const,
    align: "auto" as const,
  },
  grid: {
    left: "3%",
    right: "4%",
    bottom: "3%",
    containLabel: true,
  },
};

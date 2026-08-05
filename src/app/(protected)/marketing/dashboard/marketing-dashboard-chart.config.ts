/**
 * Marketing Dashboard Chart Config (Sprint 7.3 — Drill-down & Export)
 *
 * Config-driven chart definitions.
 * Add/remove charts by modifying this array.
 */

import type {
  ChartData,
  LeadTrendData,
  ExpenseTrendData,
  RevenueTrendData,
  ROASTrendData,
  ConversionTrendData,
  TrendDataPoint,
} from "@/types/marketing-dashboard";

export type ChartType = "line" | "bar" | "area";

export type ChartPermission =
  | "marketing.dashboard.chart"
  | "marketing.dashboard.expense"
  | "marketing.dashboard.revenue";

export type ChartDataSelector = (data: ChartData) => TrendDataPoint[];

interface ChartDefinition {
  id: string;
  title: string;
  type: ChartType;
  selector: ChartDataSelector;
  permission: ChartPermission;
  color: string;
  yAxisFormat?: "number" | "currency" | "percent";
  drillDown?: boolean;
  exportable?: boolean;
}

export const MARKETING_DASHBOARD_CHARTS: ChartDefinition[] = [
  {
    id: "leadTrend",
    title: "Xu hướng Lead",
    type: "line",
    selector: (data) => data.leadTrend,
    permission: "marketing.dashboard.chart",
    color: "#1890ff",
    yAxisFormat: "number",
    drillDown: true,
    exportable: true,
  },
  {
    id: "expenseRevenue",
    title: "Chi phí vs Doanh thu",
    type: "bar",
    selector: (data) => data.expenseTrend,
    permission: "marketing.dashboard.expense",
    color: "#ff4d4f",
    yAxisFormat: "currency",
    drillDown: true,
    exportable: true,
  },
  {
    id: "roasTrend",
    title: "Xu hướng ROAS",
    type: "area",
    selector: (data) => data.roasTrend,
    permission: "marketing.dashboard.expense",
    color: "#52c41a",
    yAxisFormat: "number",
    drillDown: true,
    exportable: true,
  },
  {
    id: "conversionTrend",
    title: "Xu hướng Conversion",
    type: "line",
    selector: (data) => data.conversionTrend,
    permission: "marketing.dashboard.chart",
    color: "#722ed1",
    yAxisFormat: "percent",
    drillDown: true,
    exportable: true,
  },
];

export type { ChartData };

/**
 * Marketing Dashboard Chart Config (Sprint 7.3 — Drill-down & Export)
 *
 * Config-driven chart definitions.
 * Add/remove charts by modifying this array.
 */

import { t } from "@/lib/i18n";
import type {
  ChartData,
  LeadTrendData,
  ExpenseTrendData,
  RevenueTrendData,
  ROASTrendData,
  ConversionTrendData,
  TrendDataPoint,
} from "@/types/marketing-dashboard";
import type { Language } from "@/store/language.store";

export type ChartType = "line" | "bar" | "area";

export type ChartPermission =
  | "marketing.dashboard.chart"
  | "marketing.dashboard.expense"
  | "marketing.dashboard.revenue";

export type ChartDataSelector = (data: ChartData) => TrendDataPoint[];

interface ChartDefinition {
  id: string;
  titleKey: string;
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
    titleKey: "Xu hướng Lead",
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
    titleKey: "Chi phí vs Doanh thu",
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
    titleKey: "Xu hướng ROAS",
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
    titleKey: "Xu hướng Conversion",
    type: "line",
    selector: (data) => data.conversionTrend,
    permission: "marketing.dashboard.chart",
    color: "#722ed1",
    yAxisFormat: "percent",
    drillDown: true,
    exportable: true,
  },
  {
    id: "revenueTrend",
    titleKey: "📈 Doanh số theo ngày",
    type: "bar",
    selector: (data) => data.revenueTrend,
    permission: "marketing.dashboard.revenue",
    color: "#13c2c2",
    yAxisFormat: "currency",
    drillDown: true,
    exportable: true,
  },
  {
    id: "adsExpenseTrend",
    titleKey: "📊 Báo cáo Ads theo ngày",
    type: "bar",
    selector: (data) => data.expenseTrend,
    permission: "marketing.dashboard.expense",
    color: "#fa8c16",
    yAxisFormat: "currency",
    drillDown: true,
    exportable: true,
  },
];

export function translateChartTitle(chart: ChartDefinition, lang: Language): string {
  return t(chart.titleKey, lang);
}

export type { ChartData };

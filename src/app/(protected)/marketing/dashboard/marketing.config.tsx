/**
 * Marketing Dashboard Config (Sprint 7.1 — Card Config Refactor)
 *
 * Cards defined as array with:
 * - selector: (data) => value — no switch needed
 * - formatter: "currency" | "percent" | "number" | "roas" | "cpa"
 * - permission: optional — for role-based visibility
 *
 * Sprint 7.4: trend chuyển từ hardcoded ↦ `trendSelector: (data) => TrendValue`
 * để lấy phần trăm thật từ `data.trend.*` (so sánh kỳ này vs kỳ trước).
 */

import {
  ThunderboltOutlined,
  CalendarOutlined,
  UserSwitchOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  RiseOutlined,
  PercentageOutlined,
  FundOutlined,
  ShoppingCartOutlined,
  PhoneOutlined,
  PhoneFilled,
  PieChartOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import type { StatCardProps } from "@/components/common/cards/StatCard";
import type {
  MarketingSummary,
  MarketingExpenseSummary,
  MarketingRevenueSummary,
  MarketingOrderSummary,
  MarketingDashboardData,
  MarketingTrend,
} from "@/types/marketing-dashboard";
import { formatNumber } from "@/lib/format";

export type MarketingStatItem = {
  title: string;
  value: string;
  icon: StatCardProps["icon"];
  color: StatCardProps["color"];
  trend: NonNullable<StatCardProps["trend"]>;
};

export type CardPermission = "marketing.dashboard.lead" | "marketing.dashboard.expense" | "marketing.dashboard.revenue";

type CardDataSelector = (data: MarketingDashboardData) => number;

type CardFormatter = "number" | "currency" | "percent" | "roas" | "cpa";

type CardTrendSelector = (data: MarketingDashboardData) => MarketingTrend;

interface CardDefinition {
  key: string;
  title: string;
  icon: StatCardProps["icon"];
  color: StatCardProps["color"];
  selector: CardDataSelector;
  formatter: CardFormatter;
  permission?: CardPermission;
  drillDown?: boolean;
  exportable?: boolean;
  trendSelector: CardTrendSelector;
}

/**
 * Convert MarketingTrend → StatCard trend (value + direction).
 * - Nếu pctChange=null → trả về "—" / neutral (không có dữ liệu kỳ trước).
 */
function trendToCardTrend(trend: MarketingTrend): NonNullable<StatCardProps["trend"]> {
  if (trend.pctChange === null) {
    return { value: "—", direction: "neutral" };
  }
  const prefix = trend.pctChange > 0 ? "+" : "";
  return {
    value: `${prefix}${trend.pctChange.toFixed(1)}%`,
    direction: trend.direction,
  };
}

/**
 * Marketing Dashboard Cards — array for easy extension.
 *
 * Future cards (tương lai):
 * - Profit (revenue - expense)
 * - Average Order (revenue / orderCount)
 * - Average Lead Cost (expense / leads)
 * - Customer Lifetime Value
 */
export const MARKETING_DASHBOARD_CARDS: CardDefinition[] = [
  // Lead cards
  {
    key: "todayLead",
    title: "Lead hôm nay",
    icon: <ThunderboltOutlined />,
    color: "orange",
    selector: (data) => data.summary.todayLead,
    formatter: "number",
    permission: "marketing.dashboard.lead",
    drillDown: true,
    exportable: true,
    trendSelector: (data) => data.trend.todayLead,
  },
  {
    key: "monthLead",
    title: "Lead tháng",
    icon: <CalendarOutlined />,
    color: "blue",
    selector: (data) => data.summary.monthLead,
    formatter: "number",
    permission: "marketing.dashboard.lead",
    drillDown: true,
    exportable: true,
    trendSelector: (data) => data.trend.monthLead,
  },
  {
    key: "assignedLead",
    title: "Lead đã giao Sale",
    icon: <UserSwitchOutlined />,
    color: "purple",
    selector: (data) => data.summary.assignedLead,
    formatter: "number",
    permission: "marketing.dashboard.lead",
    drillDown: true,
    exportable: true,
    trendSelector: (data) => data.trend.assignedLead,
  },
  {
    key: "closedLead",
    title: "Lead chốt",
    icon: <CheckCircleOutlined />,
    color: "green",
    selector: (data) => data.summary.closedLead,
    formatter: "number",
    permission: "marketing.dashboard.lead",
    drillDown: true,
    exportable: true,
    trendSelector: (data) => data.trend.closedLead,
  },
  // Expense cards
  {
    key: "totalSpent",
    title: "Chi phí quảng cáo",
    icon: <DollarOutlined />,
    color: "red",
    selector: (data) => data.expense.totalSpent,
    formatter: "currency",
    permission: "marketing.dashboard.expense",
    drillDown: true,
    exportable: true,
    trendSelector: (data) => data.trend.totalSpent,
  },
  {
    key: "roas",
    title: "ROAS",
    icon: <RiseOutlined />,
    color: "green",
    selector: (data) => data.expense.roas,
    formatter: "roas",
    permission: "marketing.dashboard.expense",
    drillDown: true,
    exportable: true,
    trendSelector: (data) => data.trend.roas,
  },
  // Revenue cards
  {
    key: "monthRevenue",
    title: "Doanh thu",
    icon: <FundOutlined />,
    color: "green",
    selector: (data) => data.revenue.monthRevenue,
    formatter: "currency",
    permission: "marketing.dashboard.revenue",
    drillDown: true,
    exportable: true,
    trendSelector: (data) => data.trend.monthRevenue,
  },
  // Conversion cards
  {
    key: "conversionRate",
    title: "Conversion Rate",
    icon: <PercentageOutlined />,
    color: "blue",
    selector: (data) => data.expense.averageConversionRate,
    formatter: "percent",
    permission: "marketing.dashboard.expense",
    drillDown: true,
    exportable: true,
    trendSelector: (data) => data.trend.conversionRate,
  },
  // ===== Order KPIs (Sprint 7.4 — tính từ collection Orders) =====
  {
    key: "totalPushed",
    title: "Tổng Đã đẩy",
    icon: <ShoppingCartOutlined />,
    color: "blue",
    selector: (data) => data.order.totalPushed,
    formatter: "number",
    permission: "marketing.dashboard.revenue",
    drillDown: true,
    exportable: true,
    trendSelector: (data) => data.trend.totalPushed,
  },
  {
    key: "called",
    title: "Đã gọi",
    icon: <PhoneOutlined />,
    color: "green",
    selector: (data) => data.order.called,
    formatter: "number",
    permission: "marketing.dashboard.revenue",
    drillDown: true,
    exportable: true,
    trendSelector: (data) => data.trend.called,
  },
  {
    key: "notCalled",
    title: "Chưa gọi",
    icon: <PhoneFilled />,
    color: "orange",
    selector: (data) => data.order.notCalled,
    formatter: "number",
    permission: "marketing.dashboard.revenue",
    drillDown: true,
    exportable: true,
    trendSelector: (data) => data.trend.notCalled,
  },
  {
    key: "closingRate",
    title: "Tỉ lệ chốt",
    icon: <PieChartOutlined />,
    color: "purple",
    selector: (data) => data.order.closingRate,
    formatter: "percent",
    permission: "marketing.dashboard.revenue",
    drillDown: true,
    exportable: true,
    trendSelector: (data) => data.trend.closingRate,
  },
  {
    key: "orderRevenue",
    title: "Doanh thu (đơn)",
    icon: <FundOutlined />,
    color: "green",
    selector: (data) => data.order.totalRevenue,
    formatter: "currency",
    permission: "marketing.dashboard.revenue",
    drillDown: true,
    exportable: true,
    trendSelector: (data) => data.trend.orderRevenue,
  },
  {
    key: "deliveredOk",
    title: "Giao TC",
    icon: <TruckOutlined />,
    color: "green",
    selector: (data) => data.order.deliveredOk,
    formatter: "number",
    permission: "marketing.dashboard.revenue",
    drillDown: true,
    exportable: true,
    trendSelector: (data) => data.trend.deliveredOk,
  },
];

// ============================================================================
// Formatter Functions
// ============================================================================

function formatCardValue(value: number, formatter: CardFormatter): string {
  switch (formatter) {
    case "currency":
      return formatNumber(value);
    case "percent":
      return `${formatNumber(value)}%`;
    case "roas":
      return `${value.toFixed(2)}x`;
    case "cpa":
      return formatNumber(value);
    case "number":
    default:
      return formatNumber(value);
  }
}

// ============================================================================
// Build Stats
// ============================================================================

/**
 * Build stat items from dashboard data.
 * Permission check done outside (useCan hook in page).
 */
export function buildMarketingStats(data: MarketingDashboardData): MarketingStatItem[] {
  return MARKETING_DASHBOARD_CARDS.map((card) => ({
    title: card.title,
    value: formatCardValue(card.selector(data), card.formatter),
    icon: card.icon,
    color: card.color,
    trend: trendToCardTrend(card.trendSelector(data)),
  }));
}

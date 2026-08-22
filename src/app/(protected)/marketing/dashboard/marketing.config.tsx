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
import { t } from "@/lib/i18n";
import type { Language } from "@/store/language.store";

export type MarketingStatItem = {
  key: string;
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
  titleKey: string;
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
 * Sprint 8.0: Order KPIs moved to top as primary metrics.
 *
 * Order: Tổng Đã đẩy → Đã gọi → Chưa gọi → Tỉ lệ chốt → Doanh thu → Giao TC
 * Then: Lead cards, Expense cards, Revenue, Conversion
 */
export const MARKETING_DASHBOARD_CARDS: CardDefinition[] = [
  // ===== Order KPIs (Sprint 7.4 — tính từ collection Orders) =====
  // Primary metrics — moved to top (Sprint 8.0)
  {
    key: "totalPushed",
    titleKey: "Tổng Đã đẩy",
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
    titleKey: "Đã gọi",
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
    titleKey: "Chưa gọi",
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
    titleKey: "Tỉ lệ chốt",
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
    titleKey: "Doanh thu",
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
    titleKey: "Giao TC",
    icon: <TruckOutlined />,
    color: "green",
    selector: (data) => data.order.deliveredOk,
    formatter: "number",
    permission: "marketing.dashboard.revenue",
    drillDown: true,
    exportable: true,
    trendSelector: (data) => data.trend.deliveredOk,
  },
  // Lead cards
  {
    key: "todayLead",
    titleKey: "Khách hàng hôm nay",
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
    titleKey: "Khách hàng tháng",
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
    titleKey: "Đã giao Sale",
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
    titleKey: "Đã chốt",
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
    titleKey: "Chi phí quảng cáo",
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
    titleKey: "ROAS",
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
    titleKey: "Doanh thu tháng",
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
    titleKey: "Conversion Rate",
    icon: <PercentageOutlined />,
    color: "blue",
    selector: (data) => data.expense.averageConversionRate,
    formatter: "percent",
    permission: "marketing.dashboard.expense",
    drillDown: true,
    exportable: true,
    trendSelector: (data) => data.trend.conversionRate,
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
export function buildMarketingStats(
  data: MarketingDashboardData,
  lang: Language
): MarketingStatItem[] {
  return MARKETING_DASHBOARD_CARDS.map((card) => ({
    key: card.key,
    title: t(card.titleKey, lang),
    value: formatCardValue(card.selector(data), card.formatter),
    icon: card.icon,
    color: card.color,
    trend: trendToCardTrend(card.trendSelector(data)),
  }));
}

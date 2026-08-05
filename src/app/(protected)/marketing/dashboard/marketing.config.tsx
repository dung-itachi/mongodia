/**
 * Marketing Dashboard Config (Sprint 7.1 — Card Config Refactor)
 *
 * Cards defined as array with:
 * - selector: (data) => value — no switch needed
 * - formatter: "currency" | "percent" | "number" | "roas" | "cpa"
 * - permission: optional — for role-based visibility
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
} from "@ant-design/icons";
import type { StatCardProps } from "@/components/common/cards/StatCard";
import type {
  MarketingSummary,
  MarketingExpenseSummary,
  MarketingRevenueSummary,
  MarketingDashboardData,
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
  trend: { value: string; direction: "up" | "down" };
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
    trend: { value: "+5.2%", direction: "up" },
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
    trend: { value: "+12.5%", direction: "up" },
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
    trend: { value: "+3.1%", direction: "up" },
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
    trend: { value: "+8.7%", direction: "up" },
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
    trend: { value: "-2.3%", direction: "down" },
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
    trend: { value: "+15.4%", direction: "up" },
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
    trend: { value: "+22.1%", direction: "up" },
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
    trend: { value: "+0.6%", direction: "up" },
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
    trend: card.trend,
  }));
}

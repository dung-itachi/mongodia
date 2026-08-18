/**
 * Dashboard Stat Configuration (Sprint 4.4 — Dashboard Polish)
 *
 * Centralized KPI definitions so the Dashboard page stays clean.
 * Trend giờ lấy từ API (DashboardSummary.trend) — không hard-code "+12.5%" nữa.
 */

import {
  TeamOutlined,
  CheckCircleOutlined,
  CarOutlined,
  SmileOutlined,
  RollbackOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import type { StatCardProps } from "@/components/common/cards/StatCard";
import type { DashboardSummary, DashboardTrend } from "@/types/dashboard";
import { formatCurrency, formatNumber, formatVND, convertMNTtoVND } from "@/lib/format";

export type DashboardStatItem = {
  title: string;
  value: string;
  icon: StatCardProps["icon"];
  color: StatCardProps["color"];
  trend: NonNullable<StatCardProps["trend"]>;
  onCurrencyToggle?: () => void;
  displayCurrency?: "MNT" | "VND";
};

function trendToStatTrend(trend: DashboardTrend): NonNullable<StatCardProps["trend"]> {
  const sign = trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : "";
  return {
    value: `${sign}${trend.percent.toFixed(1)}%`,
    direction: trend.direction === "flat" ? "neutral" : trend.direction,
  };
}

/**
 * Build the KPI stat cards from a dashboard summary.
 *
 * @param summary  - Dashboard summary data
 * @param displayCurrency - "MNT" | "VND" — currency to display for the revenue card
 * @param exchangeRate    - VND per 1 MNT (from /api/settings/exchange-rate)
 * @param onCurrencyToggle - Called when the user clicks the currency toggle button
 */
export function buildDashboardStats(
  summary: DashboardSummary,
  displayCurrency: "MNT" | "VND" = "MNT",
  exchangeRate: number = 7,
  onCurrencyToggle?: () => void,
): DashboardStatItem[] {
  const trend = trendToStatTrend(summary.trend);

  const revenueInMNT = summary.revenue;
  const revenueDisplay =
    displayCurrency === "VND"
      ? formatVND(convertMNTtoVND(revenueInMNT, exchangeRate))
      : formatCurrency(revenueInMNT);

  return [
    {
      title: "Tổng số khách hàng",
      value: formatNumber(summary.totalLeads),
      icon: <TeamOutlined />,
      color: "blue",
      trend,
    },
    {
      title: "Chốt",
      value: formatNumber(summary.closedLeads),
      icon: <CheckCircleOutlined />,
      color: "purple",
      trend,
    },
    {
      title: "Đang giao",
      value: formatNumber(summary.shippingOrders),
      icon: <CarOutlined />,
      color: "orange",
      trend,
    },
    {
      title: "Giao TC",
      value: formatNumber(summary.deliveredOrders),
      icon: <SmileOutlined />,
      color: "green",
      trend,
    },
    {
      title: "Hoàn hàng",
      value: formatNumber(summary.returnedOrders),
      icon: <RollbackOutlined />,
      color: "red",
      trend,
    },
    {
      title: "Doanh thu",
      value: revenueDisplay,
      icon: <DollarOutlined />,
      color: "green",
      trend,
      onCurrencyToggle,
      displayCurrency,
    },
  ];
}
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
import { formatCurrency, formatNumber } from "@/lib/format";

export type DashboardStatItem = {
  title: string;
  value: string;
  icon: StatCardProps["icon"];
  color: StatCardProps["color"];
  trend: NonNullable<StatCardProps["trend"]>;
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
 */
export function buildDashboardStats(summary: DashboardSummary): DashboardStatItem[] {
  const trend = trendToStatTrend(summary.trend);

  return [
    {
      title: "Tổng Leads",
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
      value: formatCurrency(summary.revenue),
      icon: <DollarOutlined />,
      color: "green",
      trend,
    },
  ];
}
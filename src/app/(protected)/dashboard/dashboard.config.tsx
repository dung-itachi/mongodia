/**
 * Dashboard Stat Configuration (Sprint 4.4 — Dashboard Polish)
 *
 * Centralized KPI definitions so the Dashboard page stays clean.
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
import type { DashboardSummary } from "@/types/dashboard";
import { formatCurrency, formatNumber } from "@/lib/format";

export type DashboardStatItem = {
  title: string;
  value: string;
  icon: StatCardProps["icon"];
  color: StatCardProps["color"];
  trend: NonNullable<StatCardProps["trend"]>;
};

/**
 * Build the KPI stat cards from a dashboard summary.
 */
export function buildDashboardStats(summary: DashboardSummary): DashboardStatItem[] {
  return [
    {
      title: "Tổng Leads",
      value: formatNumber(summary.totalLeads),
      icon: <TeamOutlined />,
      color: "blue",
      trend: { value: "+12.5%", direction: "up" },
    },
    {
      title: "Chốt",
      value: formatNumber(summary.closedLeads),
      icon: <CheckCircleOutlined />,
      color: "purple",
      trend: { value: "+8.3%", direction: "up" },
    },
    {
      title: "Đang giao",
      value: formatNumber(summary.shippingOrders),
      icon: <CarOutlined />,
      color: "orange",
      trend: { value: "-2.1%", direction: "down" },
    },
    {
      title: "Giao TC",
      value: formatNumber(summary.deliveredOrders),
      icon: <SmileOutlined />,
      color: "green",
      trend: { value: "+15.7%", direction: "up" },
    },
    {
      title: "Hoàn hàng",
      value: formatNumber(summary.returnedOrders),
      icon: <RollbackOutlined />,
      color: "red",
      trend: { value: "-3.4%", direction: "down" },
    },
    {
      title: "Doanh thu",
      value: formatCurrency(summary.revenue),
      icon: <DollarOutlined />,
      color: "green",
      trend: { value: "+22.8%", direction: "up" },
    },
  ];
}
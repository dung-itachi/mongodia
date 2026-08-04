/**
 * Marketing Dashboard Config (Sprint 5.1 — Marketing Dashboard)
 *
 * KPI definitions for the marketing dashboard.
 */

import {
  TeamOutlined,
  ThunderboltOutlined,
  UsergroupAddOutlined,
  CheckCircleOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import type { StatCardProps } from "@/components/common/cards/StatCard";
import type { MarketingSummary } from "@/types/marketing-dashboard";
import { formatNumber } from "@/lib/format";

export type MarketingStatItem = {
  title: string;
  value: string;
  icon: StatCardProps["icon"];
  color: StatCardProps["color"];
  trend: NonNullable<StatCardProps["trend"]>;
};

export function buildMarketingStats(
  summary: MarketingSummary
): MarketingStatItem[] {
  return [
    {
      title: "Hôm nay",
      value: formatNumber(summary.todayLead),
      icon: <ThunderboltOutlined />,
      color: "orange",
      trend: { value: "+5.2%", direction: "up" },
    },
    {
      title: "Tuần này",
      value: formatNumber(summary.weekLead),
      icon: <TeamOutlined />,
      color: "blue",
      trend: { value: "+12.5%", direction: "up" },
    },
    {
      title: "Tháng này",
      value: formatNumber(summary.monthLead),
      icon: <TeamOutlined />,
      color: "purple",
      trend: { value: "+18.3%", direction: "up" },
    },
    {
      title: "Tổng Leads",
      value: formatNumber(summary.totalLead),
      icon: <TeamOutlined />,
      color: "blue",
      trend: { value: "+12.5%", direction: "up" },
    },
    {
      title: "Đã phân công",
      value: formatNumber(summary.assignedLead),
      icon: <UsergroupAddOutlined />,
      color: "purple",
      trend: { value: "+3.1%", direction: "up" },
    },
    {
      title: "Chốt",
      value: formatNumber(summary.closedLead),
      icon: <CheckCircleOutlined />,
      color: "green",
      trend: { value: "+8.7%", direction: "up" },
    },
    {
      title: "Tỷ lệ chuyển đổi",
      value: `${formatNumber(summary.conversionRate)}%`,
      icon: <RiseOutlined />,
      color: "default",
      trend: { value: "+0.6%", direction: "up" },
    },
  ];
}
"use client";

/**
 * Dashboard Page (Sprint 4.3 - Dashboard Activity & Quick Actions)
 *
 * Real dashboard using the common UI Kit from Sprint 3,
 * charts from Sprint 4.2, and widgets from Sprint 4.3.
 */

import {
  PageContainer,
  PageHeader,
  StatGrid,
  StatCard,
  LoadingOverlay,
  EmptyState,
} from "@/components/common";
import {
  TeamOutlined,
  CheckCircleOutlined,
  CarOutlined,
  SmileOutlined,
  RollbackOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { useDashboard } from "@/hooks/useDashboard";
import { formatCurrency, formatNumber } from "@/lib/format";
import DashboardCharts from "./charts/DashboardCharts";
import DashboardWidgets from "./widgets/DashboardWidgets";

export default function DashboardPage() {
  const [{ data, loading, error }, { refetch }] = useDashboard();

  // Loading state
  if (loading) {
    return <LoadingOverlay text="Đang tải dashboard..." />;
  }

  // Error state
  if (error || !data) {
    return (
      <PageContainer>
        <EmptyState
          icon={<TeamOutlined />}
          title="Không thể tải dashboard"
          description={error || "Đã xảy ra lỗi khi tải dữ liệu"}
          action={
            <button
              type="button"
              onClick={() => refetch()}
              style={{
                padding: "8px 16px",
                border: "1px solid #1890ff",
                borderRadius: 6,
                background: "#fff",
                color: "#1890ff",
                cursor: "pointer",
              }}
            >
              Thử lại
            </button>
          }
        />
      </PageContainer>
    );
  }

  const { summary } = data;

  // KPI data array
  const stats = [
    {
      title: "Tổng Leads",
      value: formatNumber(summary.totalLeads),
      icon: <TeamOutlined />,
      color: "blue" as const,
      trend: {
        value: "+12.5%",
        direction: "up" as const,
      },
    },
    {
      title: "Chốt",
      value: formatNumber(summary.closedLeads),
      icon: <CheckCircleOutlined />,
      color: "purple" as const,
      trend: {
        value: "+8.3%",
        direction: "up" as const,
      },
    },
    {
      title: "Đang giao",
      value: formatNumber(summary.shippingOrders),
      icon: <CarOutlined />,
      color: "orange" as const,
      trend: {
        value: "-2.1%",
        direction: "down" as const,
      },
    },
    {
      title: "Giao TC",
      value: formatNumber(summary.deliveredOrders),
      icon: <SmileOutlined />,
      color: "green" as const,
      trend: {
        value: "+15.7%",
        direction: "up" as const,
      },
    },
    {
      title: "Hoàn hàng",
      value: formatNumber(summary.returnedOrders),
      icon: <RollbackOutlined />,
      color: "red" as const,
      trend: {
        value: "-3.4%",
        direction: "down" as const,
      },
    },
    {
      title: "Doanh thu",
      value: formatCurrency(summary.revenue),
      icon: <DollarOutlined />,
      color: "green" as const,
      trend: {
        value: "+22.8%",
        direction: "up" as const,
      },
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard tổng quan"
        subtitle="Tổng quan hoạt động của hệ thống"
      />

      <StatGrid columns={3}>
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            trend={stat.trend}
          />
        ))}
      </StatGrid>

      <div style={{ marginTop: 16 }}>
        <DashboardCharts />
      </div>

      <div style={{ marginTop: 16 }}>
        <DashboardWidgets />
      </div>
    </PageContainer>
  );
}
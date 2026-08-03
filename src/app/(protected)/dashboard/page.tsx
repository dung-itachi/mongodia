"use client";

/**
 * Dashboard Page (Sprint 4.4 — Dashboard Polish)
 *
 * Clean composition: PageContainer + PageHeader + StatGrid + Charts + Widgets.
 * - No fetch (handled by hooks inside children).
 * - No format (handled by lib/format inside children).
 * - No business logic (config is delegated to dashboard.config.ts).
 */

import { useMemo, useCallback } from "react";
import {
  PageContainer,
  PageHeader,
  LoadingOverlay,
} from "@/components/common";
import { TeamOutlined } from "@ant-design/icons";
import { useDashboard } from "@/hooks/useDashboard";
import { buildDashboardStats } from "./dashboard.config";
import DashboardStatsGrid from "./DashboardStatsGrid";
import DashboardRefreshButton from "./DashboardRefreshButton";
import DashboardErrorState from "./DashboardErrorState";
import DashboardCharts from "./charts/DashboardCharts";
import DashboardWidgets from "./widgets/DashboardWidgets";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const [{ data, loading, error }, { refetch }] = useDashboard();

  const stats = useMemo(
    () => (data ? buildDashboardStats(data.summary) : []),
    [data]
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (loading) {
    return <LoadingOverlay text="Đang tải dashboard..." />;
  }

  if (error || !data) {
    return (
      <PageContainer>
        <PageHeader
          title="Dashboard tổng quan"
          subtitle="Tổng quan hoạt động của hệ thống"
          actions={<DashboardRefreshButton />}
        />
        <DashboardErrorState
          icon={<TeamOutlined />}
          title="Không thể tải dashboard"
          message={error || "Đã xảy ra lỗi khi tải dữ liệu"}
          onRetry={handleRetry}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard tổng quan"
        subtitle="Tổng quan hoạt động của hệ thống"
        actions={<DashboardRefreshButton />}
      />

      <div className={styles["d4-page"]}>
        <DashboardStatsGrid stats={stats} />
        <DashboardCharts />
        <DashboardWidgets />
      </div>
    </PageContainer>
  );
}
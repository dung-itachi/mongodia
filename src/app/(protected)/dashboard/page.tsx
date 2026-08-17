"use client";

/**
 * Dashboard Page (Sprint 4.4 — Dashboard Polish)
 *
 * Clean composition: PageContainer + PageHeader + StatGrid + Charts + Widgets.
 * - No fetch (handled by hooks inside children).
 * - No format (handled by lib/format inside children).
 * - No business logic (config is delegated to dashboard.config.ts).
 */

import { useMemo, useCallback, useState } from "react";
import {
  PageContainer,
  PageHeader,
  LoadingOverlay,
} from "@/components/common";
import { TeamOutlined } from "@ant-design/icons";
import { useDashboard } from "@/hooks/useDashboard";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { buildDashboardStats } from "./dashboard.config";
import DashboardStatsGrid from "./DashboardStatsGrid";
import DashboardFilters from "./DashboardFilters";
import DashboardRefreshButton from "./DashboardRefreshButton";
import DashboardErrorState from "./DashboardErrorState";
import DashboardCharts from "./charts/DashboardCharts";
import DashboardWidgets from "./widgets/DashboardWidgets";
import type { DashboardPeriod } from "@/types/dashboard";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [{ data, loading, error }, { refetch }] = useDashboard(period);
  const { data: exchangeRateData } = useExchangeRate();

  const [displayCurrency, setDisplayCurrency] = useState<"MNT" | "VND">("MNT");

  const stats = useMemo(
    () =>
      data
        ? buildDashboardStats(
            data.summary,
            displayCurrency,
            exchangeRateData?.rate ?? 7,
            () =>
              setDisplayCurrency((prev) => (prev === "MNT" ? "VND" : "MNT")),
          )
        : [],
    [data, displayCurrency, exchangeRateData]
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
        <DashboardFilters period={period} onPeriodChange={setPeriod} />
        <DashboardStatsGrid stats={stats} />
        <DashboardCharts />
        <DashboardWidgets />
      </div>
    </PageContainer>
  );
}
"use client";

/**
 * Marketing Dashboard Page (Sprint 5.1 — Marketing Dashboard)
 *
 * Composition: PageContainer + PageHeader + MarketingStatsGrid + MarketingCharts.
 * - No fetch (handled by useMarketingDashboard hook inside children).
 * - No format (handled by lib/format inside children).
 * - No business logic (config delegated to marketing.config.tsx).
 */

import { useMemo } from "react";
import {
  PageContainer,
  PageHeader,
  LoadingOverlay,
} from "@/components/common";
import { useMarketingDashboard } from "@/hooks/useMarketingDashboard";
import { buildMarketingStats } from "./marketing.config";
import MarketingStatsGrid from "./MarketingStatsGrid";
import MarketingCharts from "./MarketingCharts";
import MarketingErrorState from "./MarketingErrorState";
import { TeamOutlined } from "@ant-design/icons";
import styles from "./marketing.module.css";

export default function MarketingDashboardPage() {
  const { data, loading, error } = useMarketingDashboard();

  const stats = useMemo(
    () => (data ? buildMarketingStats(data.summary) : []),
    [data]
  );

  if (loading) {
    return <LoadingOverlay text="Đang tải marketing dashboard..." />;
  }

  if (error || !data) {
    return (
      <PageContainer>
        <PageHeader
          title="Dashboard Marketing"
          subtitle="Tổng quan hoạt động marketing"
        />
        <MarketingErrorState
          icon={<TeamOutlined />}
          title="Không thể tải marketing dashboard"
          message={error || "Đã xảy ra lỗi khi tải dữ liệu"}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard Marketing"
        subtitle="Tổng quan hoạt động marketing"
      />

      <div className={styles["mk-page"]}>
        <MarketingStatsGrid stats={stats} />
        <MarketingCharts />
      </div>
    </PageContainer>
  );
}
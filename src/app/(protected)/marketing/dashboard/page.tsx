"use client";

/**
 * Marketing Dashboard Page (Sprint 7.3 — Drill-down & Export)
 *
 * Data Flow:
 * React Query → API Route → MarketingDashboardService → DashboardRepository → MongoDB
 */

import { useState, useCallback } from "react";
import {
  PageContainer,
  PageHeader,
  LoadingOverlay,
} from "@/components/common";
import { useMarketingDashboard } from "@/hooks/useMarketingDashboard";
import { useMarketingDashboardExport } from "@/hooks/useMarketingDashboardExport";
import { buildMarketingStats, type MarketingStatItem } from "./marketing.config";
import MarketingDashboardFilters from "./MarketingDashboardFilters";
import MarketingDashboardAdvancedFilters from "./MarketingDashboardAdvancedFilters";
import MarketingStatsGrid from "./MarketingStatsGrid";
import MarketingDashboardCharts from "./MarketingDashboardCharts";
import DailyRevenueReport from "./DailyRevenueReport";
import DailyAdsReport from "./DailyAdsReport";
import MarketingDashboardRanking from "./MarketingDashboardRanking";
import MarketingDashboardDrillDownDrawer from "./MarketingDashboardDrillDownDrawer";
import MarketingErrorState from "./MarketingErrorState";
import { TeamOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import { Button, message, Segmented, Space } from "antd";
import type { ChartPeriod } from "@/types/marketing-dashboard";
import type { MarketingDashboardFilter, DrillDownContext } from "@/types/marketing-dashboard-filter";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import styles from "./marketing.module.css";

export default function MarketingDashboardPage() {
  const [period, setPeriod] = useState<ChartPeriod>("7d");
  const [advancedFilter, setAdvancedFilter] = useState<MarketingDashboardFilter>({ period });
  const [drillDownContext, setDrillDownContext] = useState<DrillDownContext | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const { data, loading, error, refetch } = useMarketingDashboard();
  const { data: exportData } = useMarketingDashboardExport(advancedFilter);

  const handlePeriodChange = useCallback((newPeriod: ChartPeriod) => {
    setPeriod(newPeriod);
    setAdvancedFilter((prev) => ({ ...prev, period: newPeriod }));
  }, []);

  const handleFilterChange = useCallback((filter: MarketingDashboardFilter) => {
    setAdvancedFilter(filter);
    setPeriod(filter.period);
    // Refetch data with new filter
    void refetch();
  }, [refetch]);

  const handleDrillDown = useCallback((context: DrillDownContext) => {
    setDrillDownContext(context);
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrillDownContext(null);
  }, []);

  const handleExportExcel = useCallback(async () => {
    if (!exportData) {
      message.warning("Vui lòng đợi dữ liệu export được tải");
      return;
    }
    setExportLoading(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      exportToExcel(exportData, `marketing-dashboard-${timestamp}`);
      message.success("Đã xuất file Excel thành công");
    } catch {
      message.error("Lỗi khi xuất file Excel");
    } finally {
      setExportLoading(false);
    }
  }, [exportData]);

  const handleExportPDF = useCallback(async () => {
    if (!exportData) {
      message.warning("Vui lòng đợi dữ liệu export được tải");
      return;
    }
    setExportLoading(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      exportToPDF(exportData, `marketing-dashboard-${timestamp}`);
      message.success("Đã xuất file PDF thành công");
    } catch {
      message.error("Lỗi khi xuất file PDF");
    } finally {
      setExportLoading(false);
    }
  }, [exportData]);

  const stats = data ? buildMarketingStats(data) : null;

  if (loading) {
    return <LoadingOverlay text="Đang tải marketing dashboard..." />;
  }

  if (error || !data || !stats) {
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
        actions={
          <Space>
            <Button
              icon={<FileExcelOutlined />}
              onClick={handleExportExcel}
              loading={exportLoading}
            >
              Export Excel
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              onClick={handleExportPDF}
              loading={exportLoading}
            >
              Export PDF
            </Button>
          </Space>
        }
      />

      <div className={styles["mk-page"]}>
        {/* Stats Grid */}
        <MarketingStatsGrid
          stats={stats}
          onCardClick={(key, label) => {
            handleDrillDown({
              type: "card",
              id: key,
              label,
              filter: advancedFilter,
            });
          }}
        />

        {/* Basic Period Filter */}
        <MarketingDashboardFilters period={period} onPeriodChange={handlePeriodChange} />

        {/* Advanced Filters */}
        <MarketingDashboardAdvancedFilters
          filter={advancedFilter}
          onFilterChange={handleFilterChange}
          facebookPageOptions={[]}
          employeeOptions={[]}
          campaignOptions={[]}
          loading={loading}
        />

        {/* Charts */}
        <MarketingDashboardCharts
          period={period}
          onChartClick={(chartId, label) => {
            handleDrillDown({
              type: "chart",
              id: chartId,
              label,
              filter: advancedFilter,
            });
          }}
        />

        {/* Daily Report - Doanh số theo ngày */}
        <DailyRevenueReport period={period} />

        {/* Daily Report - Báo cáo Ads theo ngày */}
        <DailyAdsReport period={period} />

        {/* Ranking */}
        <MarketingDashboardRanking
          onRowClick={(rankingId, rankingType, label) => {
            handleDrillDown({
              type: "ranking",
              id: `${rankingId}-${rankingType}`,
              label,
              filter: advancedFilter,
            });
          }}
        />
      </div>

      {/* Drill-down Drawer */}
      <MarketingDashboardDrillDownDrawer
        open={drawerOpen}
        context={drillDownContext}
        onClose={handleCloseDrawer}
      />
    </PageContainer>
  );
}

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
import { useMarketingDailyReport } from "@/hooks/useMarketingDailyReport";
import { useMarketingDailyAdsReport } from "@/hooks/useMarketingDailyAdsReport";
import { useMarketingBestProducts } from "@/hooks/useMarketingBestProducts";
import {
  useFacebookPages,
  useMarketingEmployees,
  useCampaignsForSelect,
} from "@/hooks/useMarketingExpenseLookups";
import { useAuthStore } from "@/store/auth.store";
import { buildMarketingStats } from "./marketing.config";
import MarketingDashboardFilters from "./MarketingDashboardFilters";
import MarketingDashboardAdvancedFilters from "./MarketingDashboardAdvancedFilters";
import MarketingStatsGrid from "./MarketingStatsGrid";
import MarketingDashboardCharts from "./MarketingDashboardCharts";
import DailyRevenueReport from "./DailyRevenueReport";
import DailyAdsReport from "./DailyAdsReport";
import MKTOverviewBanner from "./MKTOverviewBanner";
import MktAdsCostCard from "./MktAdsCostCard";
import BestSellingProductsCard from "./BestSellingProductsCard";
import MarketingDashboardRanking from "./MarketingDashboardRanking";
import MarketingDashboardDrillDownDrawer from "./MarketingDashboardDrillDownDrawer";
import MarketingErrorState from "./MarketingErrorState";
import { TeamOutlined, FileExcelOutlined, FilePdfOutlined, UserOutlined } from "@ant-design/icons";
import { Button, message, Space, Select } from "antd";
import type { ChartPeriod } from "@/types/marketing-dashboard";
import type { MarketingDashboardFilter, DrillDownContext } from "@/types/marketing-dashboard-filter";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import styles from "./marketing.module.css";

/**
 * ADMIN (role=ADMIN) hoặc user có wildcard permission "*" được xem tất cả MKT.
 */
function isGlobalUser(user: { role: string; permissions: string[] } | null): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.permissions.includes("*");
}

export default function MarketingDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isGlobal = isGlobalUser(user);

  const [period, setPeriod] = useState<ChartPeriod>("7d");
  const [advancedFilter, setAdvancedFilter] = useState<MarketingDashboardFilter>({ period });
  const [drillDownContext, setDrillDownContext] = useState<DrillDownContext | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedMktForOverview, setSelectedMktForOverview] = useState<
    string | undefined
  >(undefined);

  const { data, loading, error, refetch } = useMarketingDashboard();
  const { data: exportData } = useMarketingDashboardExport(advancedFilter);

  // Lookup options cho advanced filters (Sprint 7.4 — fix "nodata" dropdowns)
  const { pages: facebookPageOptions } = useFacebookPages();
  const { employees: employeeOptions } = useMarketingEmployees();
  const { campaigns: campaignOptions } = useCampaignsForSelect();

  // ===== Lấy dữ liệu cho dải tóm tắt & cards mới =====
  const mktIdForOverview = isGlobal ? selectedMktForOverview : undefined;
  const { data: dailyReport } = useMarketingDailyReport({
    period,
    marketingEmployeeId: mktIdForOverview,
  });
  const { data: adsReport } = useMarketingDailyAdsReport({
    period,
    marketingEmployeeId: mktIdForOverview,
  });
  const { data: bestProducts } = useMarketingBestProducts({
    period,
    marketingEmployeeId: mktIdForOverview,
    limit: 8,
  });

  // Tính các giá trị cho banner tổng quan
  const summary = adsReport?.summary;
  const adsRows = adsReport?.data ?? [];
  const totalRevenue = dailyReport?.summary.totalRevenue ?? 0;
  const totalXin = summary?.tongXin ?? 0;
  const totalSpent = summary?.tongTieu ?? 0;
  const totalClosed = dailyReport?.summary.totalClosed ?? 0;
  const cpa = totalClosed > 0 ? Math.round(totalXin / totalClosed) : 0;

  // Sum Chi phí Ads breakdown từ rows
  const totalMorning = adsRows.reduce((s, r) => s + (r.xinSang ?? 0), 0);
  const totalAfternoon = adsRows.reduce((s, r) => s + (r.xinChieu ?? 0), 0);
  const totalUrgent = adsRows.reduce((s, r) => s + (r.xinGap ?? 0), 0);

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

        {/* MKT Overview Banner — DS | Ads xin | Đã tiêu | Dư | %Ads | CPA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 280 }}>
            <MKTOverviewBanner
              totalRevenue={totalRevenue}
              totalXin={totalXin}
              totalSpent={totalSpent}
              cpa={cpa}
              loading={!adsReport}
            />
          </div>
          {isGlobal && (
            <Select
              allowClear
              placeholder="Chọn MKT cho tổng quan"
              value={selectedMktForOverview}
              onChange={(v) => setSelectedMktForOverview(v)}
              options={[
                { value: "__all__", label: "Tất cả MKT" },
                ...employeeOptions,
              ]}
              showSearch
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              size="small"
              style={{ width: 220 }}
              suffixIcon={<UserOutlined />}
            />
          )}
        </div>

        {/* Chi phí Ads (Tổng / Xin sáng / Xin chiều / Xin gấp) + Best Products */}
        <div className={styles["mk-charts-grid"]}>
          <MktAdsCostCard
            totalSpent={totalSpent}
            totalMorning={totalMorning}
            totalAfternoon={totalAfternoon}
            totalUrgent={totalUrgent}
            totalRevenue={summary?.totalRevenue ?? 0}
            loading={!adsReport}
          />
          <BestSellingProductsCard
            bestProducts={(bestProducts?.data ?? []).map((p) => ({
              name: p.name,
              count: p.count,
            }))}
            loading={!bestProducts}
          />
        </div>

        {/* Basic Period Filter */}
        <MarketingDashboardFilters period={period} onPeriodChange={handlePeriodChange} />

        {/* Advanced Filters */}
        <MarketingDashboardAdvancedFilters
          filter={advancedFilter}
          onFilterChange={handleFilterChange}
          facebookPageOptions={facebookPageOptions}
          employeeOptions={employeeOptions}
          campaignOptions={campaignOptions}
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

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
  useTeamsForMarketingDashboard,
  useAreasForMarketingDashboard,
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
import { TeamOutlined, FileExcelOutlined, FilePdfOutlined, UserOutlined, EnvironmentOutlined, ClusterOutlined } from "@ant-design/icons";
import { Button, Space, Select } from "antd";
import type { ChartPeriod } from "@/types/marketing-dashboard";
import type { MarketingDashboardFilter, DrillDownContext } from "@/types/marketing-dashboard-filter";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import styles from "./marketing.module.css";
import { useMessage } from "@/contexts/MessageContext";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

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
  const message = useMessage();
  const lang = useLanguageStore((s) => s.language);

  const [period, setPeriod] = useState<ChartPeriod>("7d");
  const [advancedFilter, setAdvancedFilter] = useState<MarketingDashboardFilter>({ period });
  const [drillDownContext, setDrillDownContext] = useState<DrillDownContext | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedMktForOverview, setSelectedMktForOverview] = useState<
    string | undefined
  >(undefined);
  const [selectedTeamForOverview, setSelectedTeamForOverview] = useState<string | undefined>(undefined);
  const [selectedAreaForOverview, setSelectedAreaForOverview] = useState<string | undefined>(undefined);

  // Build filter cho main dashboard
  const dashboardFilter: MarketingDashboardFilter = {
    period,
    marketingEmployeeId: selectedAreaForOverview || selectedTeamForOverview ? undefined : selectedMktForOverview,
    teamId: selectedTeamForOverview && selectedTeamForOverview !== "__all__" ? selectedTeamForOverview : undefined,
    areaId: selectedAreaForOverview && selectedAreaForOverview !== "__all__" ? selectedAreaForOverview : undefined,
  };

  // Build filter cho drill-down (bao gồm Area/Team/MKT)
  const drillDownFilter: MarketingDashboardFilter = {
    ...advancedFilter,
    teamId: selectedTeamForOverview && selectedTeamForOverview !== "__all__" ? selectedTeamForOverview : undefined,
    areaId: selectedAreaForOverview && selectedAreaForOverview !== "__all__" ? selectedAreaForOverview : undefined,
  };

  const { data, loading, error, refetch } = useMarketingDashboard({ filter: dashboardFilter });
  const { data: exportData } = useMarketingDashboardExport(advancedFilter);

  // Lookup options cho advanced filters (Sprint 7.4 — fix "nodata" dropdowns)
  const { pages: facebookPageOptions } = useFacebookPages();
  const { employees: employeeOptions } = useMarketingEmployees();
  const { campaigns: campaignOptions } = useCampaignsForSelect();
  const { teams: teamOptions } = useTeamsForMarketingDashboard();
  const { areas: areaOptions } = useAreasForMarketingDashboard();

  // ===== Lấy dữ liệu cho dải tóm tắt & cards mới =====
  // Filter priority: Area > Team > MKT
  // Nếu chọn Area thì bỏ qua Team và MKT
  // Nếu chọn Team thì bỏ qua MKT
  const mktIdForOverview = selectedAreaForOverview || selectedTeamForOverview ? undefined : selectedMktForOverview;

  const effectiveTeamId = selectedTeamForOverview && selectedTeamForOverview !== "__all__"
    ? selectedTeamForOverview
    : undefined;
  const effectiveAreaId = selectedAreaForOverview && selectedAreaForOverview !== "__all__"
    ? selectedAreaForOverview
    : undefined;

  const { data: dailyReport } = useMarketingDailyReport({
    period,
    marketingEmployeeId: mktIdForOverview,
    teamId: effectiveTeamId,
    areaId: effectiveAreaId,
  });
  const { data: adsReport } = useMarketingDailyAdsReport({
    period,
    marketingEmployeeId: mktIdForOverview,
    teamId: effectiveTeamId,
    areaId: effectiveAreaId,
  });
  const { data: bestProducts } = useMarketingBestProducts({
    period,
    marketingEmployeeId: mktIdForOverview,
    teamId: effectiveTeamId,
    areaId: effectiveAreaId,
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
      message.warning(t("Vui lòng đợi dữ liệu export được tải", lang));
      return;
    }
    setExportLoading(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      exportToExcel(exportData, `marketing-dashboard-${timestamp}`);
      message.success(t("Đã xuất file Excel thành công", lang));
    } catch {
      message.error(t("Lỗi khi xuất file Excel", lang));
    } finally {
      setExportLoading(false);
    }
  }, [exportData, lang]);

  const handleExportPDF = useCallback(async () => {
    if (!exportData) {
      message.warning(t("Vui lòng đợi dữ liệu export được tải", lang));
      return;
    }
    setExportLoading(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      exportToPDF(exportData, `marketing-dashboard-${timestamp}`);
      message.success(t("Đã xuất file PDF thành công", lang));
    } catch {
      message.error(t("Lỗi khi xuất file PDF", lang));
    } finally {
      setExportLoading(false);
    }
  }, [exportData, lang]);

  const stats = data ? buildMarketingStats(data) : null;

  if (loading) {
    return <LoadingOverlay text={t("Đang tải marketing dashboard...", lang)} />;
  }

  if (error || !data || !stats) {
    return (
      <PageContainer>
        <PageHeader
          title={t("Dashboard Marketing", lang)}
          subtitle={t("Tổng quan hoạt động marketing", lang)}
        />
        <MarketingErrorState
          icon={<TeamOutlined />}
          title={t("Không thể tải marketing dashboard", lang)}
          message={error || t("Đã xảy ra lỗi khi tải dữ liệu", lang)}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={t("Dashboard Marketing", lang)}
        subtitle={t("Tổng quan hoạt động marketing", lang)}
        actions={
          <Space>
            <Button
              icon={<FileExcelOutlined />}
              onClick={handleExportExcel}
              loading={exportLoading}
            >
              {t("Export Excel", lang)}
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              onClick={handleExportPDF}
              loading={exportLoading}
            >
              {t("Export PDF", lang)}
            </Button>
          </Space>
        }
      />

      <div className={styles["mk-page"]}>
        {/* Stats Grid */}
        <MarketingStatsGrid
          stats={stats}
          onCardClick={(cardKey, label) => {
            handleDrillDown({
              type: "card",
              id: cardKey,
              label,
              cardKey,
              filter: drillDownFilter,
            });
          }}
        />

        {/* Filters Row — Period + Area/Team/MKT (Sprint 8.0) */}
        <div className={styles["mk-filters-row"]}>
          <MKTOverviewBanner
            totalRevenue={totalRevenue}
            totalXin={totalXin}
            totalSpent={totalSpent}
            cpa={cpa}
            loading={!adsReport}
          />
          <MarketingDashboardFilters period={period} onPeriodChange={handlePeriodChange} />
          {isGlobal && (
            <div className={styles["mk-area-filters"]}>
              <Select
                allowClear
                placeholder={t("Khu vực", lang)}
                value={selectedAreaForOverview}
                onChange={(v) => {
                  setSelectedAreaForOverview(v);
                  setSelectedTeamForOverview(undefined);
                  setSelectedMktForOverview(undefined);
                }}
                options={[
                  { value: "__all__", label: t("Tất cả Khu vực", lang) },
                  ...areaOptions,
                ]}
                showSearch
                optionFilterProp="label"
                filterOption={(input, option) =>
                  String(option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                size="small"
                style={{ width: 140 }}
                suffixIcon={<EnvironmentOutlined />}
              />
              <Select
                allowClear
                placeholder={t("Team", lang)}
                value={selectedTeamForOverview}
                onChange={(v) => {
                  setSelectedTeamForOverview(v);
                  setSelectedMktForOverview(undefined);
                }}
                options={[
                  { value: "__all__", label: t("Tất cả Team", lang) },
                  ...teamOptions,
                ]}
                showSearch
                optionFilterProp="label"
                filterOption={(input, option) =>
                  String(option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                size="small"
                style={{ width: 140 }}
                suffixIcon={<ClusterOutlined />}
                disabled={!!selectedAreaForOverview}
              />
              <Select
                allowClear
                placeholder={t("MKT", lang)}
                value={selectedMktForOverview}
                onChange={(v) => setSelectedMktForOverview(v)}
                options={[
                  { value: "__all__", label: t("Tất cả MKT", lang) },
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
                style={{ width: 160 }}
                suffixIcon={<UserOutlined />}
                disabled={!!selectedAreaForOverview || !!selectedTeamForOverview}
              />
            </div>
          )}
        </div>

        {/* 🏆 Top sản phẩm bán chạy + 💰 Chi phí Ads */}
        <div className={styles["mk-charts-grid"]}>
          <BestSellingProductsCard
            bestProducts={(bestProducts?.data ?? []).map((p) => ({
              name: p.name,
              count: p.count,
            }))}
            loading={!bestProducts}
          />
          <MktAdsCostCard
            totalSpent={totalSpent}
            totalMorning={totalMorning}
            totalAfternoon={totalAfternoon}
            totalUrgent={totalUrgent}
            totalRevenue={summary?.totalRevenue ?? 0}
            loading={!adsReport}
          />
        </div>

        {/* Doanh số theo ngày */}
        <DailyRevenueReport period={period} />

        {/* Báo cáo Ads theo ngày */}
        <DailyAdsReport period={period} />

        {/* Basic Period Filter */}
        <div className={styles["mk-filters-row"]} />

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

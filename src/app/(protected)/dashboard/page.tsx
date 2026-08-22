"use client";

/**
 * Dashboard Page (Sprint 4.4 — Dashboard Polish)
 *
 * Progressive loading: mỗi section (Stats, Charts, Widgets) sẽ hiển thị
 * skeleton riêng khi đang load, không block toàn trang.
 * Stats được ưu tiên hiển thị trước (API nhỏ nhất, nhanh nhất).
 */

import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/common";
import { useDashboard } from "@/hooks/useDashboard";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { buildDashboardStats } from "./dashboard.config";
import DashboardStatsGrid from "./DashboardStatsGrid";
import StatsSkeleton from "./StatsSkeleton";
import DashboardFilters from "./DashboardFilters";
import DashboardRefreshButton from "./DashboardRefreshButton";
import DashboardCharts from "./charts/DashboardCharts";
import DashboardWidgets from "./widgets/DashboardWidgets";
import type { DashboardPeriod } from "@/types/dashboard";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const lang = useLanguageStore((s) => s.language);
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [{ data }, { refetch }] = useDashboard(period);
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

  return (
    <PageContainer>
      <PageHeader
        title={t("Dashboard tổng quan", lang)}
        subtitle={t("Tổng quan hoạt động của hệ thống", lang)}
        actions={<DashboardRefreshButton />}
      />

      <div className={styles["d4-page"]}>
        <DashboardFilters period={period} onPeriodChange={setPeriod} />

        {/* Stats: ưu tiên hiển thị trước */}
        {data ? (
          <DashboardStatsGrid stats={stats} />
        ) : (
          <StatsSkeleton />
        )}

        {/* Charts: có skeleton riêng */}
        <DashboardCharts />

        {/* Widgets: có skeleton riêng */}
        <DashboardWidgets />
      </div>
    </PageContainer>
  );
}
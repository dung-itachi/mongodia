"use client";

/**
 * Marketing Dashboard Filters (Sprint 8.0 — Thêm filter 1/3/7/Từ đầu tháng/1 tháng)
 *
 * Config-driven filter for dashboard.
 */

import { useMemo } from "react";
import { Segmented } from "antd";
import type { ChartPeriod } from "@/types/marketing-dashboard";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./marketing.module.css";

export type MarketingDashboardFiltersProps = {
  period: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
};

export default function MarketingDashboardFilters({
  period,
  onPeriodChange,
}: MarketingDashboardFiltersProps) {
  const lang = useLanguageStore((s) => s.language);

  const periodOptions = useMemo(
    () => [
      { label: t("1 ngày", lang), value: "1d" },
      { label: t("3 ngày", lang), value: "3d" },
      { label: t("7 ngày", lang), value: "7d" },
      { label: t("Đầu tháng", lang), value: "monthStart" },
      { label: t("1 tháng", lang), value: "1month" },
      { label: t("30 ngày", lang), value: "30d" },
      { label: t("90 ngày", lang), value: "90d" },
    ],
    [lang]
  );

  return (
    <div className={styles["mk-filters"]}>
      <Segmented
        value={period}
        onChange={(value) => onPeriodChange(value as ChartPeriod)}
        options={periodOptions}
        size="small"
      />
    </div>
  );
}

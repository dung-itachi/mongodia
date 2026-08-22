/**
 * Dashboard Filters (Sprint 4.4 — Dashboard Polish)
 *
 * Period filter for dashboard KPI stats.
 * Mirrors the marketing dashboard filter UX.
 */

import { useMemo } from "react";
import { Segmented } from "antd";
import type { DashboardPeriod } from "@/types/dashboard";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./dashboard.module.css";

export type DashboardFiltersProps = {
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
};

export default function DashboardFilters({
  period,
  onPeriodChange,
}: DashboardFiltersProps) {
  const lang = useLanguageStore((s) => s.language);

  const periodOptions = useMemo(
    () => [
      { label: t("1 ngày", lang), value: "1d" },
      { label: t("3 ngày", lang), value: "3d" },
      { label: t("7 ngày", lang), value: "7d" },
      { label: t("Từ đầu tháng", lang), value: "month" },
      { label: t("Tháng trước", lang), value: "prev_month" },
    ],
    [lang]
  );

  return (
    <div className={styles["d4-row"]}>
      <div className={styles["d4-grow"]} />
      <Segmented
        value={period}
        onChange={(value) => onPeriodChange(value as DashboardPeriod)}
        options={periodOptions}
        size="small"
      />
    </div>
  );
}
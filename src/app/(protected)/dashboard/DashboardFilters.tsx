/**
 * Dashboard Filters (Sprint 4.4 — Dashboard Polish)
 *
 * Period filter for dashboard KPI stats.
 * Mirrors the marketing dashboard filter UX.
 */

import { Segmented } from "antd";
import type { DashboardPeriod } from "@/types/dashboard";
import styles from "./dashboard.module.css";

export type DashboardFiltersProps = {
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
};

const PERIOD_OPTIONS = [
  { label: "1 ngày", value: "1d" },
  { label: "3 ngày", value: "3d" },
  { label: "7 ngày", value: "7d" },
  { label: "Từ đầu tháng", value: "month" },
  { label: "Tháng trước", value: "prev_month" },
];

export default function DashboardFilters({
  period,
  onPeriodChange,
}: DashboardFiltersProps) {
  return (
    <div className={styles["d4-row"]}>
      <div className={styles["d4-grow"]} />
      <Segmented
        value={period}
        onChange={(value) => onPeriodChange(value as DashboardPeriod)}
        options={PERIOD_OPTIONS}
        size="small"
      />
    </div>
  );
}

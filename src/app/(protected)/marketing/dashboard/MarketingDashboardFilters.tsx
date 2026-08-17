/**
 * Marketing Dashboard Filters (Sprint 8.0 — Thêm filter 1/3/7/Từ đầu tháng/1 tháng)
 *
 * Config-driven filter for dashboard.
 */

import { Segmented } from "antd";
import type { ChartPeriod } from "@/types/marketing-dashboard";
import styles from "./marketing.module.css";

export type MarketingDashboardFiltersProps = {
  period: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
};

const PERIOD_OPTIONS = [
  { label: "1 ngày", value: "1d" },
  { label: "3 ngày", value: "3d" },
  { label: "7 ngày", value: "7d" },
  { label: "Đầu tháng", value: "monthStart" },
  { label: "1 tháng", value: "1month" },
  { label: "30 ngày", value: "30d" },
  { label: "90 ngày", value: "90d" },
];

export default function MarketingDashboardFilters({
  period,
  onPeriodChange,
}: MarketingDashboardFiltersProps) {
  return (
    <div className={styles["mk-filters"]}>
      <Segmented
        value={period}
        onChange={(value) => onPeriodChange(value as ChartPeriod)}
        options={PERIOD_OPTIONS}
        size="small"
      />
    </div>
  );
}

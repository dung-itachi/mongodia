/**
 * MarketingFilterBar Component (Sprint 5.1A — Marketing Dashboard)
 *
 * Filter bar with time range selection.
 * Currently UI only — no API calls.
 *
 * TODO: Wire up to API when backend supports time filtering.
 */

import { memo, useState } from "react";
import { Segmented } from "antd";
import styles from "./marketing.module.css";

type FilterOption = "today" | "7days" | "30days" | "quarter" | "year";

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: "today", label: "Hôm nay" },
  { value: "7days", label: "7 ngày" },
  { value: "30days", label: "30 ngày" },
  { value: "quarter", label: "Quý" },
  { value: "year", label: "Năm" },
];

export type MarketingFilterBarProps = {
  // TODO: onFilterChange callback for future API integration
  onFilterChange?: (filter: FilterOption) => void;
};

function MarketingFilterBarInner(_props: MarketingFilterBarProps) {
  const [activeFilter, setActiveFilter] = useState<FilterOption>("7days");

  const handleChange = (value: FilterOption) => {
    setActiveFilter(value);
    // TODO: Call onFilterChange(value) when API supports filtering
  };

  return (
    <div className={styles["mk-filter-bar"]}>
      <Segmented
        value={activeFilter}
        onChange={(value) => handleChange(value as FilterOption)}
        options={FILTER_OPTIONS.map((opt) => ({
          label: opt.label,
          value: opt.value,
        }))}
      />
    </div>
  );
}

const MarketingFilterBar = memo(MarketingFilterBarInner);
export default MarketingFilterBar;

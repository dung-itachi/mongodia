/**
 * MarketingCharts Component (Sprint 5.1 — Marketing Dashboard)
 *
 * Container component for chart placeholders.
 * Actual charts will be implemented in Sprint Analytics.
 */

import { memo } from "react";
import DailyLeadChart from "./charts/DailyLeadChart";
import LeadSourceChart from "./charts/LeadSourceChart";
import styles from "./marketing.module.css";

function MarketingChartsInner() {
  return (
    <div className={styles["mk-section"]} aria-label="Biểu đồ marketing">
      <div className={styles["mk-grid-2"]}>
        <DailyLeadChart />
        <LeadSourceChart />
      </div>
    </div>
  );
}

const MarketingCharts = memo(MarketingChartsInner);
export default MarketingCharts;
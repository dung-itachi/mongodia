/**
 * LeadSourceChart Component (Sprint 5.1 — Marketing Dashboard)
 *
 * Container for lead source distribution chart. Actual chart will be implemented in Sprint Analytics.
 * Currently shows ChartContainer with Coming Soon placeholder.
 */

import { memo } from "react";
import { ChartContainer } from "@/components/common";
import styles from "../marketing.module.css";

export type LeadSourceChartProps = {
  // TODO: Will receive data after implementing Mongo aggregation
  data?: unknown[];
};

function LeadSourceChartInner(_props: LeadSourceChartProps) {
  return (
    <ChartContainer
      title="Nguồn Leads"
      subtitle="Phân bố nguồn leads"
      height={280}
    >
      <div className={styles["mk-coming-soon"]}>
        <span>Coming Soon</span>
        <small>Biểu đồ sẽ được triển khai ở Sprint Analytics</small>
      </div>
    </ChartContainer>
  );
}

const LeadSourceChart = memo(LeadSourceChartInner);
export default LeadSourceChart;
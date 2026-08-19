/**
 * DailyLeadChart Component (Sprint 5.1 — Marketing Dashboard)
 *
 * Container for daily lead chart. Actual chart will be implemented in Sprint Analytics.
 * Currently shows ChartContainer with Coming Soon placeholder.
 */

import { memo } from "react";
import { ChartContainer } from "@/components/common";
import styles from "../marketing.module.css";

export type DailyLeadChartProps = {
  // TODO: Will receive data after implementing Mongo aggregation
  data?: unknown[];
};

function DailyLeadChartInner(_props: DailyLeadChartProps) {
  return (
    <ChartContainer
      title="Khách hàng theo ngày"
      subtitle="Số khách hàng được tạo trong 7 ngày gần nhất"
      height={280}
    >
      <div className={styles["mk-coming-soon"]}>
        <span>Coming Soon</span>
        <small>Biểu đồ sẽ được triển khai ở Sprint Analytics</small>
      </div>
    </ChartContainer>
  );
}

const DailyLeadChart = memo(DailyLeadChartInner);
export default DailyLeadChart;
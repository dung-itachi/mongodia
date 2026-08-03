/**
 * DailyLeadChart Component (Sprint 5.1 — Marketing Dashboard)
 *
 * Visualizes leads created per day as vertical bars.
 * Uses ChartContainer from UI Kit.
 */

import { memo } from "react";
import { ChartContainer } from "@/components/common";
import type { DailyLeadChartItem } from "@/types/marketing-dashboard";
import { formatNumber } from "@/lib/format";
import styles from "../marketing.module.css";

export type DailyLeadChartProps = {
  data: DailyLeadChartItem[];
};

function DailyLeadChartInner({ data }: DailyLeadChartProps) {
  const max = data.reduce(
    (acc, item) => (item.count > acc ? item.count : acc),
    0
  );

  return (
    <ChartContainer
      title="Leads theo ngày"
      subtitle="Số leads được tạo trong 7 ngày gần nhất"
      height={280}
    >
      <div className={styles["mk-daily"]}>
        {data.map((item) => {
          const heightPercent = max > 0 ? (item.count / max) * 100 : 0;
          return (
            <div key={item.date} className={styles["mk-daily-col"]}>
              <span className={styles["mk-daily-value"]}>
                {formatNumber(item.count)}
              </span>
              <div
                className={styles["mk-daily-bar"]}
                style={{ height: `${heightPercent}%` }}
                aria-label={`${item.date}: ${item.count} leads`}
              />
              <span className={styles["mk-daily-label"]}>{item.date}</span>
            </div>
          );
        })}
      </div>
    </ChartContainer>
  );
}

const DailyLeadChart = memo(DailyLeadChartInner);
export default DailyLeadChart;
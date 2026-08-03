/**
 * LeadSourceChart Component (Sprint 5.1 — Marketing Dashboard)
 *
 * Visualizes lead source distribution as horizontal bars.
 * Uses ChartContainer from UI Kit.
 */

import { memo } from "react";
import { ChartContainer } from "@/components/common";
import type { LeadSourceChartItem } from "@/types/marketing-dashboard";
import { formatNumber } from "@/lib/format";
import styles from "../marketing.module.css";

export type LeadSourceChartProps = {
  data: LeadSourceChartItem[];
};

const COLORS = [
  "#1890ff",
  "#13c2c2",
  "#52c41a",
  "#fa8c16",
  "#722ed1",
  "#eb2f96",
];

function LeadSourceChartInner({ data }: LeadSourceChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <ChartContainer
      title="Nguồn Leads"
      subtitle="Phân bố nguồn leads"
      height={280}
    >
      <div className={styles["mk-source"]} role="list" aria-label="Nguồn leads">
        {data.map((item, index) => {
          const percent = total > 0 ? (item.count / total) * 100 : 0;
          const color = COLORS[index % COLORS.length];
          return (
            <div
              key={item.source}
              className={styles["mk-source-row"]}
              role="listitem"
            >
              <div className={styles["mk-source-head"]}>
                <span className={styles["mk-source-name"]}>
                  <span
                    className={styles["mk-source-dot"]}
                    style={{ backgroundColor: color }}
                  />
                  {item.source}
                </span>
                <span className={styles["mk-source-percent"]}>
                  {percent.toFixed(1)}%
                </span>
                <span className={styles["mk-source-count"]}>
                  {formatNumber(item.count)}
                </span>
              </div>
              <div className={styles["mk-source-track"]}>
                <div
                  className={styles["mk-source-fill"]}
                  style={{
                    width: `${percent}%`,
                    backgroundColor: color,
                  }}
                  aria-label={`${item.source}: ${percent.toFixed(1)}%`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ChartContainer>
  );
}

const LeadSourceChart = memo(LeadSourceChartInner);
export default LeadSourceChart;
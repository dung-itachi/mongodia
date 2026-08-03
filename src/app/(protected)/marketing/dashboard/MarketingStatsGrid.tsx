/**
 * MarketingStatsGrid Component (Sprint 5.1 — Marketing Dashboard)
 *
 * Renders the 6 KPI cards for the marketing dashboard.
 */

import { memo } from "react";
import { StatGrid, StatCard } from "@/components/common";
import type { MarketingStatItem } from "./marketing.config";
import styles from "./marketing.module.css";

export type MarketingStatsGridProps = {
  stats: MarketingStatItem[];
};

function MarketingStatsGridInner({ stats }: MarketingStatsGridProps) {
  return (
    <div className={styles["mk-fill"]} aria-label="Thống kê marketing">
      <StatGrid columns={3}>
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            trend={stat.trend}
          />
        ))}
      </StatGrid>
    </div>
  );
}

const MarketingStatsGrid = memo(MarketingStatsGridInner);
export default MarketingStatsGrid;
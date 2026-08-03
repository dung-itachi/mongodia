/**
 * DashboardStatsGrid Component (Sprint 4.4 — Dashboard Polish)
 *
 * Renders the 6 KPI stat cards from a dashboard summary.
 * Pure presentation — receives a typed array of stat configs.
 * No logic, no fetch, no format calls.
 */

import { memo } from "react";
import { StatGrid, StatCard } from "@/components/common";
import type { DashboardStatItem } from "./dashboard.config";
import styles from "./dashboard.module.css";

export type DashboardStatsGridProps = {
  stats: DashboardStatItem[];
};

function DashboardStatsGridInner({ stats }: DashboardStatsGridProps) {
  return (
    <div className={styles["d4-fill"]} aria-label="Thống kê tổng quan">
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

const DashboardStatsGrid = memo(DashboardStatsGridInner);
export default DashboardStatsGrid;
/**
 * StatsSkeleton Component
 *
 * Skeleton loader cho 6 KPI stat cards.
 * Match với layout thực của StatCard: title + value + icon box bên phải.
 */

import { Skeleton } from "antd";
import { memo } from "react";
import { StatGrid } from "@/components/common";
import styles from "./dashboard.module.css";

const SKELETON_STYLE = {
  minHeight: 140,
  padding: "16px",
};

function StatCardSkeleton() {
  return (
    <div className="card" style={SKELETON_STYLE}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <Skeleton.Input
            active
            size="small"
            style={{ width: "60%", height: 14, marginBottom: 12 }}
          />
          <Skeleton.Input
            active
            size="large"
            style={{ width: "80%", height: 28, marginBottom: 8 }}
          />
          <Skeleton.Input
            active
            size="small"
            style={{ width: "40%", height: 12 }}
          />
        </div>
        <Skeleton.Avatar
          active
          size={48}
          shape="square"
          style={{ borderRadius: 8, flexShrink: 0 }}
        />
      </div>
    </div>
  );
}

function StatsSkeletonInner() {
  return (
    <div className={styles["d4-fill"]} aria-label="Đang tải thống kê" aria-busy="true">
      <StatGrid columns={3}>
        {[...Array(6)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </StatGrid>
    </div>
  );
}

const StatsSkeleton = memo(StatsSkeletonInner);
export default StatsSkeleton;

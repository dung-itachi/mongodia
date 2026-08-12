/**
 * WarehouseStats Component
 *
 * Displays warehouse-specific statistics: Total SKU, Total Quantity, Available, Reserved, In-Transit.
 */

import { memo } from "react";
import { StatGrid, StatCard } from "@/components/common";
import type { WarehouseStats as WarehouseStatsType } from "../page";
import styles from "../warehouse-dashboard.module.css";

export type WarehouseStatsProps = {
  stats: WarehouseStatsType;
  loading?: boolean;
};

function WarehouseStatsInner({ stats, loading }: WarehouseStatsProps) {
  const statItems = [
    {
      title: "Tổng SKU",
      value: stats.totalSKU,
      color: "blue" as const,
      icon: "📦",
    },
    {
      title: "Tổng Quantity",
      value: stats.totalQuantity,
      color: "green" as const,
      icon: "📊",
    },
    {
      title: "Available",
      value: stats.availableQuantity,
      color: "blue" as const,
      icon: "✓",
    },
    {
      title: "Reserved",
      value: stats.reservedQuantity,
      color: "orange" as const,
      icon: "🔒",
    },
    {
      title: "In-Transit",
      value: stats.inTransitQuantity,
      color: "purple" as const,
      icon: "🚚",
    },
  ];

  return (
    <div className={styles["warehouse-stats"]}>
      <StatGrid columns={5}>{statItems.map((item) => <StatCard key={item.title} title={item.title} value={item.value} icon={item.icon} color={item.color} loading={loading} />)}</StatGrid>
    </div>
  );
}

const WarehouseStats = memo(WarehouseStatsInner);
export default WarehouseStats;

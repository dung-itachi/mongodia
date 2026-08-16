/**
 * WarehouseStatsGrid Component
 *
 * 📦 Stats row đầu trang `/warehouses`, thiết kế theo
 * `mongolia-crm (7).html`:
 *   Số SP | Tồn kho | Đang giao | Đang hoàn về | Đã giao TC | Đã hoàn kho
 */

import { memo } from "react";
import { Skeleton } from "antd";
import {
  AppstoreOutlined,
  InboxOutlined,
  TruckOutlined,
  RollbackOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import type { WarehouseOverviewTotals } from "@/hooks/useWarehouseInventoryOverview";
import styles from "./warehouses.module.css";

export type WarehouseStatsGridProps = {
  totals: WarehouseOverviewTotals;
  loading?: boolean;
};

function WarehouseStatsGridInner({ totals, loading = false }: WarehouseStatsGridProps) {
  if (loading) {
    return (
      <div className={styles["wh-stats-grid"]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={styles["wh-stat-card"]}>
            <Skeleton active paragraph={{ rows: 1 }} title={false} />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      key: "count",
      icon: <AppstoreOutlined />,
      tone: "blue" as const,
      value: totals.productCount,
      label: "Số SP",
    },
    {
      key: "stock",
      icon: <InboxOutlined />,
      tone: "blue" as const,
      value: totals.stock,
      label: "Tồn kho",
    },
    {
      key: "shipping",
      icon: <TruckOutlined />,
      tone: "amber" as const,
      value: totals.shipping,
      label: "Đang giao",
    },
    {
      key: "returning",
      icon: <RollbackOutlined />,
      tone: "orange" as const,
      value: totals.returning,
      label: "Đang hoàn về",
    },
    {
      key: "delivered",
      icon: <CheckCircleOutlined />,
      tone: "green" as const,
      value: totals.delivered,
      label: "Đã giao TC",
    },
    {
      key: "returned",
      icon: <DownloadOutlined />,
      tone: "purple" as const,
      value: totals.returned,
      label: "Đã hoàn kho",
    },
  ];

  return (
    <div className={styles["wh-stats-grid"]}>
      {cards.map((card) => (
        <div
          key={card.key}
          className={`${styles["wh-stat-card"]} ${styles[`wh-stat-card--${card.tone}`]}`}
        >
          <div className={styles["wh-stat-card-icon"]}>{card.icon}</div>
          <div className={styles["wh-stat-card-body"]}>
            <div className={styles["wh-stat-card-value"]}>{card.value}</div>
            <div className={styles["wh-stat-card-label"]}>{card.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const WarehouseStatsGrid = memo(WarehouseStatsGridInner);
export default WarehouseStatsGrid;
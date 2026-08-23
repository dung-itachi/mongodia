/**
 * WarehouseStatsGrid Component
 *
 * Stats row đầu trang `/warehouses`, thiết kế theo
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
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./warehouses.module.css";

export type WarehouseStatsGridProps = {
  totals: WarehouseOverviewTotals;
  loading?: boolean;
};

function WarehouseStatsGridInner({ totals, loading = false }: WarehouseStatsGridProps) {
  const lang = useLanguageStore((s) => s.language);

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
      label: t("Số SP", lang),
    },
    {
      key: "stock",
      icon: <InboxOutlined />,
      tone: "blue" as const,
      value: totals.stock,
      label: t("Tồn kho", lang),
    },
    {
      key: "shipping",
      icon: <TruckOutlined />,
      tone: "amber" as const,
      value: totals.shipping,
      label: t("Đang giao", lang),
    },
    {
      key: "returning",
      icon: <RollbackOutlined />,
      tone: "orange" as const,
      value: totals.returning,
      label: t("Đang hoàn về", lang),
    },
    {
      key: "delivered",
      icon: <CheckCircleOutlined />,
      tone: "green" as const,
      value: totals.delivered,
      label: t("Đã giao TC", lang),
    },
    {
      key: "returned",
      icon: <DownloadOutlined />,
      tone: "purple" as const,
      value: totals.returned,
      label: t("Đã hoàn kho", lang),
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
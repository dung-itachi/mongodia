/**
 * ReconciliationStats Component
 *
 * 4 stat cards phía trên trang Đối soát (theo thiết kế mongolia-crm (7).html):
 *   Giao TC | Hoàn | Đã đối soát | Doanh thu
 *
 * Style nền: card trắng, icon tinted theo tone màu, số lớn.
 */

import { memo, useMemo } from "react";
import { Skeleton } from "antd";
import {
  CheckCircleOutlined,
  RollbackOutlined,
  FileDoneOutlined,
  DollarCircleOutlined,
} from "@ant-design/icons";
import { formatNumber } from "@/lib/format";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "../orders.module.css";

export type ReconciliationStatsProps = {
  /** Số đơn DELIVERED chưa đối soát. */
  deliveredCount: number;
  /** Số đơn RETURNED chưa đối soát. */
  returnedCount: number;
  /** Số đơn đã đối soát. */
  reconciledCount: number;
  /** Tổng doanh thu của các đơn DELIVERED chưa đối soát (đơn vị base currency). */
  deliveredRevenue: number;
  loading?: boolean;
};

function ReconciliationStatsInner({
  deliveredCount,
  returnedCount,
  reconciledCount,
  deliveredRevenue,
  loading = false,
}: ReconciliationStatsProps) {
  const lang = useLanguageStore((s) => s.language);

  if (loading) {
    return (
      <div className={styles["recon-stats-grid"]}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles["recon-stat-card"]}>
            <Skeleton active paragraph={{ rows: 1 }} title={false} />
          </div>
        ))}
      </div>
    );
  }

  const cards = useMemo(() => [
    {
      key: "delivered",
      icon: <CheckCircleOutlined />,
      tone: "green" as const,
      value: deliveredCount,
      label: t("Giao TC", lang),
    },
    {
      key: "returned",
      icon: <RollbackOutlined />,
      tone: "orange" as const,
      value: returnedCount,
      label: t("Hoàn", lang),
    },
    {
      key: "reconciled",
      icon: <FileDoneOutlined />,
      tone: "purple" as const,
      value: reconciledCount,
      label: t("Đã đối soát", lang),
    },
    {
      key: "revenue",
      icon: <DollarCircleOutlined />,
      tone: "blue" as const,
      value: formatNumber(deliveredRevenue),
      label: t("Doanh thu (₫)", lang),
      isRevenue: true,
    },
  ], [deliveredCount, returnedCount, reconciledCount, deliveredRevenue, lang]);

  return (
    <div className={styles["recon-stats-grid"]}>
      {cards.map((card) => (
        <div
          key={card.key}
          className={`${styles["recon-stat-card"]} ${styles[`recon-stat-card--${card.tone}`]}`}
        >
          <div className={styles["recon-stat-card-icon"]}>{card.icon}</div>
          <div className={styles["recon-stat-card-body"]}>
            <div className={styles["recon-stat-card-value"]}>
              {card.isRevenue ? `${card.value} ₫` : card.value}
            </div>
            <div className={styles["recon-stat-card-label"]}>{card.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const ReconciliationStats = memo(ReconciliationStatsInner);
export default ReconciliationStats;
/**
 * ReconciliationStats Component
 *
 * 2 stat cards phía trên trang Đối soát:
 *   Chưa đối soát | Đã đối soát
 */

import { memo, useMemo } from "react";
import { Skeleton } from "antd";
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "../orders.module.css";

export type ReconciliationStatsProps = {
  /** Số đơn chưa đối soát. */
  pendingCount: number;
  /** Số đơn đã đối soát. */
  reconciledCount: number;
  /** Tổng doanh thu của các đơn chưa đối soát. */
  pendingRevenue: number;
  loading?: boolean;
};

function ReconciliationStatsInner({
  pendingCount,
  reconciledCount,
  pendingRevenue,
  loading = false,
}: ReconciliationStatsProps) {
  const lang = useLanguageStore((s) => s.language);

  const cards = useMemo(() => [
    {
      key: "pending",
      icon: <ClockCircleOutlined />,
      tone: "orange" as const,
      value: pendingCount,
      label: t("Chưa đối soát", lang),
    },
    {
      key: "reconciled",
      icon: <CheckCircleOutlined />,
      tone: "green" as const,
      value: reconciledCount,
      label: t("Đã đối soát", lang),
    },
  ], [pendingCount, reconciledCount, lang]);

  if (loading) {
    return (
      <div className={styles["recon-stats-grid"]}>
        {[0, 1].map((i) => (
          <div key={i} className={styles["recon-stat-card"]}>
            <Skeleton active paragraph={{ rows: 1 }} title={false} />
          </div>
        ))}
      </div>
    );
  }

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
              {card.value}
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
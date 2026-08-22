/**
 * MktAdsCostCard Component
 *
 * 💰 Chi phí Ads (thiết kế theo `mongolia-crm (7).html`)
 *
 * Hiển thị tóm tắt ngân sách quảng cáo:
 *   Tổng | Xin sáng | Xin chiều | Xin gấp | ROAS
 *
 * Layout: Card 2 cột (Chi phí Ads bên trái, Best Product bên phải).
 */

import { memo } from "react";
import { Card, Skeleton } from "antd";
import { DollarOutlined } from "@ant-design/icons";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import styles from "./marketing.module.css";

export type MktAdsCostCardProps = {
  totalSpent: number;
  totalMorning: number;
  totalAfternoon: number;
  totalUrgent: number;
  totalRevenue: number;
  loading?: boolean;
};

function MktAdsCostCardInner({
  totalSpent,
  totalMorning,
  totalAfternoon,
  totalUrgent,
  totalRevenue,
  loading = false,
}: MktAdsCostCardProps) {
  const lang = useLanguageStore((s) => s.language);
  const roas = totalSpent > 0 ? Number((totalRevenue / totalSpent).toFixed(1)) : 0;

  return (
    <Card
      size="small"
      title={
        <span>
          <DollarOutlined style={{ marginRight: 6 }} />
          {t("💰 Chi phí Ads", lang)}
        </span>
      }
      extra={
        <small style={{ color: "#8c8c8c" }}>
          {t("Tổng:", lang)} {formatNumber(totalSpent)}
        </small>
      }
      className={styles["mk-ads-cost-card"]}
      styles={{ body: { padding: "12px 16px" } }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <div className={styles["mk-ads-cost-body"]}>
          <div className={styles["mk-ads-cost-item"]}>
            <span className={styles["mk-ads-cost-label"]}>{t("Xin sáng:", lang)}</span>{" "}
            <b className={styles["mk-ads-cost-value-morning"]}>
              {formatNumber(totalMorning)}
            </b>
          </div>
          <div className={styles["mk-ads-cost-item"]}>
            <span className={styles["mk-ads-cost-label"]}>{t("Xin chiều:", lang)}</span>{" "}
            <b className={styles["mk-ads-cost-value-afternoon"]}>
              {formatNumber(totalAfternoon)}
            </b>
          </div>
          <div className={styles["mk-ads-cost-item"]}>
            <span className={styles["mk-ads-cost-label"]}>{t("Xin gấp:", lang)}</span>{" "}
            <b className={styles["mk-ads-cost-value-urgent"]}>
              {formatNumber(totalUrgent)}
            </b>
          </div>
          <div className={styles["mk-ads-cost-item"]}>
            <span className={styles["mk-ads-cost-label"]}>ROAS:</span>{" "}
            <b className={styles["mk-ads-cost-value-roas"]}>
              {totalSpent > 0 ? `${roas}x` : "—"}
            </b>
          </div>
        </div>
      )}
    </Card>
  );
}

const MktAdsCostCard = memo(MktAdsCostCardInner);
export default MktAdsCostCard;

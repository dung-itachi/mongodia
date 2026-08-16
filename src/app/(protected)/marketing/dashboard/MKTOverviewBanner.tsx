/**
 * MKTOverviewBanner Component
 *
 * Dải tóm tắt MKT Overview — thiết kế theo `mongolia-crm (7).html`:
 *   DS | Ads xin | Đã tiêu | Dư | %Ads(xin/DS) | CPA
 *
 * Hiển thị với:
 * - Nền hồng nhạt (#fce4ec), viền đậm (#f48fb1).
 * - Mỗi metric là 1 `<span>` ngăn cách bằng dấu `|`.
 * - Màu chữ thay đổi theo giá trị: Dư (xanh/đỏ), %Ads nền đỏ đậm.
 *
 * Props truyền vào là các số đã được tính sẵn (controller/component cha).
 */

import { memo } from "react";
import { formatNumber } from "@/lib/format";
import styles from "./marketing.module.css";

export type MKTOverviewBannerProps = {
  /** Tổng doanh số ₫ (totalAdsRevenue/Order revenue). */
  totalRevenue: number;
  /** Tổng Ads xin = Xin sáng + Xin chiều + Xin gấp. */
  totalXin: number;
  /** Tổng Ads đã tiêu (spent). */
  totalSpent: number;
  /** Chi phí trên mỗi đơn chốt (CPA) — đã tính sẵn. */
  cpa: number;
  /** Loading state. */
  loading?: boolean;
};

function MKTOverviewBannerInner({
  totalRevenue,
  totalXin,
  totalSpent,
  cpa,
  loading = false,
}: MKTOverviewBannerProps) {
  const surplus = totalXin - totalSpent;
  const pctAds =
    totalRevenue > 0 ? Number(((totalXin / totalRevenue) * 100).toFixed(1)) : 0;

  if (loading) {
    return (
      <div
        className={styles["mk-overview-banner-skeleton"]}
        aria-busy="true"
        aria-label="Đang tải tổng quan"
      />
    );
  }

  return (
    <div
      className={styles["mk-overview-banner"]}
      role="status"
      aria-label="Tổng quan MKT"
    >
      <span className={styles["mk-overview-banner-item"]}>
        DS: <b className={styles["mk-overview-banner-value"]}>{formatNumber(totalRevenue)}</b>
      </span>
      <span className={styles["mk-overview-banner-sep"]}>|</span>

      <span className={styles["mk-overview-banner-item"]}>
        Ads xin: <b className={styles["mk-overview-banner-value"]}>{formatNumber(totalXin)}</b>
      </span>
      <span className={styles["mk-overview-banner-sep"]}>|</span>

      <span className={styles["mk-overview-banner-item"]}>
        Đã tiêu: <b className={styles["mk-overview-banner-value"]}>{formatNumber(totalSpent)}</b>
      </span>
      <span className={styles["mk-overview-banner-sep"]}>|</span>

      <span
        className={styles["mk-overview-banner-item"]}
        style={{ color: surplus >= 0 ? "var(--green, #52c41a)" : "var(--red, #ff4d4f)" }}
      >
        Dư: <b className={styles["mk-overview-banner-value"]}>{formatNumber(surplus)}</b>
      </span>
      <span className={styles["mk-overview-banner-sep"]}>|</span>

      <span className={styles["mk-overview-banner-item"]}>
        %Ads(xin/DS):{" "}
        <b className={styles["mk-overview-banner-pct"]}>{pctAds}%</b>
      </span>
      <span className={styles["mk-overview-banner-sep"]}>|</span>

      <span className={styles["mk-overview-banner-item"]}>
        CPA: <b className={styles["mk-overview-banner-value"]}>{formatNumber(cpa)}</b>
      </span>
    </div>
  );
}

const MKTOverviewBanner = memo(MKTOverviewBannerInner);
export default MKTOverviewBanner;

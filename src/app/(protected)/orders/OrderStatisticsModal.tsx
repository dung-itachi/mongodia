/**
 * OrderStatisticsModal Component
 *
 * Modal hiển thị thống kê đơn hàng tổng hợp:
 *  - Phễu trạng thái: CONFIRMED → PACKING → SHIPPING → DELIVERED → RECONCILED
 *  - Tỷ lệ thành công (DELIVERED + RECONCILED / Tổng)
 *  - Tỷ lệ hoàn (RETURNED / Tổng)
 *  - Tỷ lệ hủy (CANCELLED / Tổng)
 *
 * Mỗi chỉ số có Tooltip giải thích công thức.
 *
 * Props:
 *   - open: bool — đóng/mở modal
 *   - data: OrderStatisticsResponse | null — dữ liệu (null khi chưa load)
 *   - loading: bool — đang gọi API
 *   - onClose: () => void
 *
 * Component này CHỈ hiển thị — việc fetch API được thực hiện bởi page cha
 * thông qua `useOrderStatistics()` hook.
 */

import { memo, useMemo } from "react";
import { Modal, Skeleton, Tooltip } from "antd";
import {
  BarChartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  RollbackOutlined,
  TruckOutlined,
  InboxOutlined,
  FileDoneOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import type { OrderStatisticsResponse } from "@/types/order";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./orders.module.css";

export type OrderStatisticsModalProps = {
  open: boolean;
  data: OrderStatisticsResponse | null;
  loading: boolean;
  onClose: () => void;
};

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  // 2 chữ số thập phân, bỏ .00 thừa
  const rounded = Math.round(value * 100) / 100;
  return `${rounded}%`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function OrderStatisticsModalInner({
  open,
  data,
  loading,
  onClose,
}: OrderStatisticsModalProps) {
  const lang = useLanguageStore((s) => s.language);

  // Các ô funnel — render theo thứ tự workflow
  const funnelRows = useMemo(() => [
    {
      key: "confirmed",
      label: t("Đã xác nhận", lang),
      icon: <CheckCircleOutlined />,
      value: data?.funnel.confirmed ?? 0,
      tone: "blue" as const,
    },
    {
      key: "packing",
      label: t("Đang đóng gói", lang),
      icon: <InboxOutlined />,
      value: data?.funnel.packing ?? 0,
      tone: "cyan" as const,
    },
    {
      key: "shipping",
      label: t("Đang giao", lang),
      icon: <TruckOutlined />,
      value: data?.funnel.shipping ?? 0,
      tone: "geekblue" as const,
    },
    {
      key: "delivered",
      label: t("Đã giao", lang),
      icon: <ShoppingOutlined />,
      value: data?.funnel.delivered ?? 0,
      tone: "green" as const,
    },
    {
      key: "reconciled",
      label: t("Đã đối soát", lang),
      icon: <FileDoneOutlined />,
      value: data?.funnel.reconciled ?? 0,
      tone: "purple" as const,
    },
  ], [data, lang]);

  // 3 ô tỷ lệ với tooltip giải thích công thức
  const rateCards = useMemo(() => [
    {
      key: "success",
      label: t("Tỷ lệ thành công", lang),
      value: data?.successRate ?? 0,
      icon: <CheckCircleOutlined />,
      tone: "green" as const,
      tooltip: (
        <span>
          <b>{t("Công thức:", lang)}</b> {t("(Đã giao + Đã đối soát) ÷ Tổng số đơn.", lang)}
          <br />
          {t("Phản ánh tỷ lệ đơn hàng thực sự hoàn tất trong bộ lọc hiện tại.", lang)}
        </span>
      ),
    },
    {
      key: "return",
      label: t("Tỷ lệ hoàn", lang),
      value: data?.returnRate ?? 0,
      icon: <RollbackOutlined />,
      tone: "orange" as const,
      tooltip: (
        <span>
          <b>{t("Công thức:", lang)}</b> {t("Số đơn RETURNED ÷ Tổng số đơn.", lang)}
          <br />
          {t("Đơn hoàn là đơn khách không nhận hoặc trả lại sau khi giao.", lang)}
        </span>
      ),
    },
    {
      key: "cancel",
      label: t("Tỷ lệ hủy", lang),
      value: data?.cancelledRate ?? 0,
      icon: <CloseCircleOutlined />,
      tone: "red" as const,
      tooltip: (
        <span>
          <b>{t("Công thức:", lang)}</b> {t("Số đơn CANCELLED ÷ Tổng số đơn.", lang)}
          <br />
          {t("Đơn bị hủy do khách đổi ý, không liên lạc được, hoặc lý do khác.", lang)}
        </span>
      ),
    },
  ], [data, lang]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <BarChartOutlined style={{ color: "#1677ff" }} />
          {t("Thống kê đơn hàng", lang)}
        </span>
      }
      destroyOnHidden
    >
      {loading || !data ? (
        <div style={{ padding: 16 }}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      ) : (
        <>
          {/* Tổng quan */}
          <div
            style={{
              padding: "12px 16px",
              background: "#f5f5f5",
              borderRadius: 6,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <InfoCircleOutlined style={{ color: "#1677ff" }} />
            <span>
              {t("Tổng số đơn theo bộ lọc hiện tại:", lang)}{" "}
              <b>{formatNumber(data.total)}</b> {t("đơn", lang)}
            </span>
          </div>

          {/* Phễu trạng thái */}
          <div style={{ marginBottom: 24 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                margin: "0 0 8px",
                color: "#262626",
              }}
            >
              {t("Phễu trạng thái", lang)}
              <Tooltip
                title={
                  <span>
                    {t("Số đơn ở từng giai đoạn trong quy trình:", lang)}
                    <br />
                    {t("Đã xác nhận → Đóng gói → Đang giao → Đã giao → Đã đối soát.", lang)}
                    <br />
                    {t("Giúp theo dõi đơn hàng đang đứng ở đâu trong pipeline.", lang)}
                  </span>
                }
              >
                <InfoCircleOutlined
                  style={{ marginLeft: 6, color: "#8c8c8c", fontSize: 12 }}
                />
              </Tooltip>
            </h3>
            <div className={styles["recon-stats-grid"]}>
              {funnelRows.map((row) => (
                <div
                  key={row.key}
                  className={`${styles["recon-stat-card"]} ${styles[`recon-stat-card--${row.tone}`]}`}
                >
                  <div className={styles["recon-stat-card-icon"]}>
                    {row.icon}
                  </div>
                  <div className={styles["recon-stat-card-body"]}>
                    <div className={styles["recon-stat-card-value"]}>
                      {formatNumber(row.value)}
                    </div>
                    <div className={styles["recon-stat-card-label"]}>
                      {row.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3 ô tỷ lệ */}
          <div>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                margin: "0 0 8px",
                color: "#262626",
              }}
            >
              {t("Tỷ lệ kết thúc đơn", lang)}
            </h3>
            <div className={styles["recon-stats-grid"]}>
              {rateCards.map((card) => (
                <Tooltip key={card.key} title={card.tooltip}>
                  <div
                    className={`${styles["recon-stat-card"]} ${styles[`recon-stat-card--${card.tone}`]}`}
                  >
                    <div className={styles["recon-stat-card-icon"]}>
                      {card.icon}
                    </div>
                    <div className={styles["recon-stat-card-body"]}>
                      <div className={styles["recon-stat-card-value"]}>
                        {formatPercent(card.value)}
                      </div>
                      <div className={styles["recon-stat-card-label"]}>
                        {card.label}
                      </div>
                    </div>
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

const OrderStatisticsModal = memo(OrderStatisticsModalInner);
export default OrderStatisticsModal;
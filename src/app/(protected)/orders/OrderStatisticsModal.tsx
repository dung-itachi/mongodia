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

import { memo } from "react";
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
  // Các ô funnel — render theo thứ tự workflow
  const funnelRows = [
    {
      key: "confirmed",
      label: "Đã xác nhận",
      icon: <CheckCircleOutlined />,
      value: data?.funnel.confirmed ?? 0,
      tone: "blue" as const,
    },
    {
      key: "packing",
      label: "Đang đóng gói",
      icon: <InboxOutlined />,
      value: data?.funnel.packing ?? 0,
      tone: "cyan" as const,
    },
    {
      key: "shipping",
      label: "Đang giao",
      icon: <TruckOutlined />,
      value: data?.funnel.shipping ?? 0,
      tone: "geekblue" as const,
    },
    {
      key: "delivered",
      label: "Đã giao",
      icon: <ShoppingOutlined />,
      value: data?.funnel.delivered ?? 0,
      tone: "green" as const,
    },
    {
      key: "reconciled",
      label: "Đã đối soát",
      icon: <FileDoneOutlined />,
      value: data?.funnel.reconciled ?? 0,
      tone: "purple" as const,
    },
  ];

  // 3 ô tỷ lệ với tooltip giải thích công thức
  const rateCards = [
    {
      key: "success",
      label: "Tỷ lệ thành công",
      value: data?.successRate ?? 0,
      icon: <CheckCircleOutlined />,
      tone: "green" as const,
      tooltip: (
        <span>
          <b>Công thức:</b> (Đã giao + Đã đối soát) ÷ Tổng số đơn.
          <br />
          Phản ánh tỷ lệ đơn hàng thực sự hoàn tất trong bộ lọc hiện tại.
        </span>
      ),
    },
    {
      key: "return",
      label: "Tỷ lệ hoàn",
      value: data?.returnRate ?? 0,
      icon: <RollbackOutlined />,
      tone: "orange" as const,
      tooltip: (
        <span>
          <b>Công thức:</b> Số đơn RETURNED ÷ Tổng số đơn.
          <br />
          Đơn hoàn là đơn khách không nhận hoặc trả lại sau khi giao.
        </span>
      ),
    },
    {
      key: "cancel",
      label: "Tỷ lệ hủy",
      value: data?.cancelledRate ?? 0,
      icon: <CloseCircleOutlined />,
      tone: "red" as const,
      tooltip: (
        <span>
          <b>Công thức:</b> Số đơn CANCELLED ÷ Tổng số đơn.
          <br />
          Đơn bị hủy do khách đổi ý, không liên lạc được, hoặc lý do khác.
        </span>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <BarChartOutlined style={{ color: "#1677ff" }} />
          Thống kê đơn hàng
        </span>
      }
      destroyOnClose
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
              Tổng số đơn theo bộ lọc hiện tại:{" "}
              <b>{formatNumber(data.total)}</b> đơn
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
              Phễu trạng thái
              <Tooltip
                title={
                  <span>
                    Số đơn ở từng giai đoạn trong quy trình:
                    <br />
                    Đã xác nhận → Đóng gói → Đang giao → Đã giao → Đã đối soát.
                    <br />
                    Giúp theo dõi đơn hàng đang đứng ở đâu trong pipeline.
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
              Tỷ lệ kết thúc đơn
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

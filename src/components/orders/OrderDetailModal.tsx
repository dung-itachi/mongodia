"use client";

/**
 * ==================================================
 * ORDER DETAIL MODAL
 * ==================================================
 *
 * Modal xem nhanh thông tin đơn hàng (popup stack).
 * Dùng trong các flow tra cứu nhanh, ví dụ:
 *  - BatchCheckCustomersModal (marketing/input)
 *  - Các nơi cần mở chi tiết đơn từ card/row khác.
 *
 * Lưu ý: trang chi tiết chính vẫn nằm ở `/orders/[id]`.
 */

import { Modal, Descriptions, Spin, Alert, Tag, Empty } from "antd";
import Link from "next/link";

import { useOrder } from "@/hooks/useOrders";
import { ORDER_STATUS_LABELS } from "@/constants/orderStatus";
import { OrderStatus } from "@/constants/orderStatus";

import styles from "./OrderDetailModal.module.css";

export type OrderDetailModalProps = {
  open: boolean;
  orderId: string | null;
  onClose: () => void;
};

function formatCurrency(value: number, currency: string = "VND"): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(status: string): string {
  switch (status) {
    case "DELIVERED":
      return "green";
    case "CANCELLED":
      return "red";
    case "WAIT_CONFIRM":
      return "orange";
    case "CONFIRMED":
      return "blue";
    case "PENDING":
      return "default";
    default:
      return "default";
  }
}

export default function OrderDetailModal({
  open,
  orderId,
  onClose,
}: OrderDetailModalProps) {
  const { order, loading, error } = useOrder(open ? orderId : null);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnHidden
      title={
        order ? (
          <span className={styles.modalTitle}>
            <span className={styles.orderCode}>{order.orderCode}</span>
            <Tag color={getStatusColor(order.status)}>
              {ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}
            </Tag>
          </span>
        ) : (
          "Chi tiết đơn hàng"
        )
      }
    >
      {loading && (
        <div className={styles.center}>
          <Spin /> &nbsp; Đang tải...
        </div>
      )}

      {!loading && error && (
        <Alert
          type="error"
          showIcon
          message="Không thể tải đơn hàng"
          description={error}
        />
      )}

      {!loading && !error && !order && (
        <Empty description="Không tìm thấy đơn hàng" />
      )}

      {!loading && !error && order && (
        <div className={styles.body}>
          <Descriptions
            column={1}
            size="small"
            bordered
            labelStyle={{ width: 160, fontWeight: 600 }}
          >
            <Descriptions.Item label="Khách hàng">
              <div>{order.customerName}</div>
              {order.customerPhone && (
                <div className={styles.muted}>{order.customerPhone}</div>
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Tổng tiền">
              <strong style={{ color: "#52c41a" }}>
                {formatCurrency(order.totalAmount, order.currency || "VND")}
              </strong>
            </Descriptions.Item>

            <Descriptions.Item label="Số lượng">
              {order.quantity}
            </Descriptions.Item>

            <Descriptions.Item label="Loại đơn">
              {order.orderType ?? "-"}
            </Descriptions.Item>

            <Descriptions.Item label="Nguồn">
              {order.orderSource ?? "-"}
            </Descriptions.Item>

            <Descriptions.Item label="Kho">
              {typeof order.warehouseId === "object" && order.warehouseId
                ? (order.warehouseId as { name?: string }).name
                : "-"}
            </Descriptions.Item>

            <Descriptions.Item label="NV Marketing">
              {typeof order.marketingEmployeeId === "object" && order.marketingEmployeeId
                ? (order.marketingEmployeeId as { fullName?: string }).fullName
                : "-"}
            </Descriptions.Item>

            <Descriptions.Item label="NV Sale">
              {typeof order.saleEmployeeId === "object" && order.saleEmployeeId
                ? (order.saleEmployeeId as { fullName?: string }).fullName
                : "-"}
            </Descriptions.Item>

            <Descriptions.Item label="Ngày tạo">
              {formatDate(order.createdAt)}
            </Descriptions.Item>

            {order.note && (
              <Descriptions.Item label="Ghi chú">
                {order.note}
              </Descriptions.Item>
            )}
          </Descriptions>

          <div className={styles.footer}>
            <Link
              href={`/orders/${order._id}`}
              target="_blank"
              className={styles.linkBtn}
            >
              Mở trang chi tiết →
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}

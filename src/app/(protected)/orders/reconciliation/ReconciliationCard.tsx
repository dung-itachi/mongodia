/**
 * ReconciliationCard Component
 *
 * 1 card đối soát — bảng các đơn cùng status, có nút "☑ ĐS tất cả"
 * (bulk) và nút "☑" cho từng dòng. Style theo mongolia-crm (7).html:
 *
 *   ✅→Đối soát (border-left xanh)
 *     ↩→Đối soát (border-left cam)
 *
 * - Cột: # | Tên | Sản phẩm | Giá ₫ | (Thao tác)
 * - Action: "☑ ĐS tất cả" ở header (chỉ hiện khi có item).
 * - Action từng dòng: button "☑" — chuyển 1 đơn sang RECONCILED.
 *
 * Props:
 *   - title, accentColor: tone border + title
 *   - orders: danh sách cần đối soát
 *   - loading, emptyText
 *   - onReconcileOne(id): đối soát 1 đơn
 *   - onReconcileAll(): đối soát tất cả các đơn trong `orders`
 *   - bulkSubmitting: disable nút bulk khi đang xử lý
 *   - showRevenue: hiển thị cột "Giá ₫" (chỉ áp dụng cho delivered)
 */

import { memo, useCallback } from "react";
import { Button, Empty, Popconfirm, Skeleton, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckSquareOutlined } from "@ant-design/icons";
import { formatNumber } from "@/lib/format";
import type { OrderListItem } from "@/types/order";
import styles from "../orders.module.css";

export type ReconciliationCardProps = {
  title: React.ReactNode;
  accentColor: "green" | "orange";
  orders: OrderListItem[];
  loading?: boolean;
  emptyText?: string;
  onReconcileOne: (id: string) => void;
  onReconcileAll: () => void;
  bulkSubmitting?: boolean;
  showRevenue?: boolean;
};

function getComboOrProduct(order: OrderListItem): string {
  const items = order.orderItems ?? [];
  const fromItems = items
    .map((it) => it.comboName || it.productName)
    .filter(Boolean)
    .join(", ");
  if (fromItems) return fromItems;
  return order.combo?.name || order.product?.name || "-";
}

function ReconciliationCardInner({
  title,
  accentColor,
  orders,
  loading = false,
  emptyText = "Chưa có đơn cần đối soát",
  onReconcileOne,
  onReconcileAll,
  bulkSubmitting = false,
  showRevenue = false,
}: ReconciliationCardProps) {
  const columns: ColumnsType<OrderListItem> = [
    {
      key: "index",
      title: "#",
      width: 50,
      align: "center",
      render: (_: unknown, __: OrderListItem, index: number) => (
        <span style={{ fontSize: 11, color: "#8c8c8c", fontWeight: 700 }}>
          {index + 1}
        </span>
      ),
    },
    {
      key: "customerName",
      title: "Tên khách",
      dataIndex: "customerName",
      render: (value: unknown) => (
        <span style={{ fontWeight: 600 }}>{String(value || "—")}</span>
      ),
    },
    {
      key: "product",
      title: "Sản phẩm",
      render: (_: unknown, record: OrderListItem) => (
        <span style={{ fontSize: 12 }}>{getComboOrProduct(record)}</span>
      ),
    },
    ...(showRevenue
      ? [
          {
            key: "totalAmountVnd",
            title: "Giá ₫",
            dataIndex: "totalAmount",
            align: "right" as const,
            render: (value: unknown) => (
              <span style={{ fontWeight: 700, color: "#52c41a" }}>
                {formatNumber(Number(value || 0))}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "actions",
      title: "Thao tác",
      width: 120,
      align: "center" as const,
      render: (_: unknown, record: OrderListItem) => (
        <Tooltip title="Đối soát đơn hàng này">
          <Button
            type="primary"
            size="small"
            icon={<CheckSquareOutlined />}
            onClick={() => onReconcileOne(record._id)}
          >
            Đối soát
          </Button>
        </Tooltip>
      ),
    },
  ];

  const handleConfirmAll = useCallback(() => {
    if (orders.length === 0) return;
    onReconcileAll();
  }, [orders.length, onReconcileAll]);

  return (
    <div
      className={`${styles["recon-card"]} ${styles[`recon-card--${accentColor}`]}`}
    >
      <div className={styles["recon-card-header"]}>
        <h2 className={styles["recon-card-title"]}>{title}</h2>
        <div className={styles["recon-card-extra"]}>
          <span className={styles["recon-card-count"]}>{orders.length}</span>
          {orders.length > 0 && (
            <Popconfirm
              title={`Đối soát tất cả ${orders.length} đơn?`}
              description="Hành động này sẽ chuyển tất cả các đơn sang trạng thái Đã đối soát."
              okText="Đối soát"
              cancelText="Hủy"
              okButtonProps={{ danger: false }}
              onConfirm={handleConfirmAll}
            >
              <Tooltip title="Đối soát tất cả đơn hàng trong danh sách">
                <Button
                  type="primary"
                  size="small"
                  loading={bulkSubmitting}
                  icon={<CheckSquareOutlined />}
                >
                  ☑ Đối soát tất cả
                </Button>
              </Tooltip>
            </Popconfirm>
          )}
        </div>
      </div>

      <div className={styles["recon-card-body"]}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : orders.length === 0 ? (
          <Empty description={emptyText} />
        ) : (
          <Table
            size="small"
            rowKey="_id"
            columns={columns}
            dataSource={orders}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            bordered
          />
        )}
      </div>
    </div>
  );
}

const ReconciliationCard = memo(ReconciliationCardInner);
export default ReconciliationCard;
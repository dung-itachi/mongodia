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
import { useRouter } from "next/navigation";
import { Button, Empty, Popconfirm, Skeleton, Space, Table, Tooltip, Popover } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckSquareOutlined, EyeOutlined } from "@ant-design/icons";
import { formatNumber } from "@/lib/format";
import type { OrderListItem, OrderItem } from "@/types/order";
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
  exchangeRate?: number;
  onViewDetail?: (id: string) => void;
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

function getProductComboDetails(order: OrderListItem): OrderItem[] {
  const items = order.orderItems ?? [];
  if (items.length > 0) return items;
  if (order.combo || order.product) {
    return [{
      comboId: order.comboId,
      productId: order.productId,
      comboName: order.combo?.name || "",
      comboCode: order.combo?.code,
      comboQuantity: order.quantity,
      packageQuantity: 0,
      giftQuantity: 0,
      sellingPrice: order.unitPrice,
      discount: 0,
      subtotal: order.totalAmount,
      details: [],
      giftMode: "NO_GIFT",
      giftSelections: [],
      productName: order.product?.name || "",
      quantity: order.quantity,
      unitPrice: order.unitPrice,
    }];
  }
  return [];
}

function ProductComboPopover({ order }: { order: OrderListItem }) {
  const router = useRouter();
  const items = getProductComboDetails(order);

  const content = (
    <div style={{ minWidth: 200 }}>
      <div style={{ marginBottom: 8, fontWeight: 600, borderBottom: "1px solid #f0f0f0", paddingBottom: 4 }}>
        Sản phẩm / Combo
      </div>
      <Table
        size="small"
        dataSource={items.map((item, idx) => ({ ...item, key: idx }))}
        pagination={false}
        columns={[
          {
            title: "Tên",
            key: "name",
            render: (_, record) => record.comboName || record.productName || "-",
          },
          {
            title: "SL",
            dataIndex: "quantity",
            key: "qty",
            width: 50,
            align: "center",
          },
        ]}
      />
    </div>
  );

  return (
    <Popover
      content={content}
      title={null}
      trigger="hover"
      placement="left"
    >
      <Button
        type="link"
        size="small"
        icon={<EyeOutlined />}
        onClick={() => router.push(`/orders/${order._id}`)}
      >
        Chi tiết
      </Button>
    </Popover>
  );
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
  exchangeRate = 1,
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
      width: 150,
      dataIndex: "customerName",
      render: (value: unknown) => (
        <span style={{ fontWeight: 600 }}>{String(value || "—")}</span>
      ),
    },
    {
      key: "product",
      title: "Sản phẩm",
      width: 180,
      render: (_: unknown, record: OrderListItem) => {
        const items = record.orderItems ?? [];
        const firstItem = items[0];
        const productName = firstItem?.productName || record.product?.name || "-";
        return <span style={{ fontSize: 12 }}>{productName}</span>;
      },
    },
    {
      key: "combo",
      title: "Combo",
      width: 150,
      render: (_: unknown, record: OrderListItem) => {
        const items = record.orderItems ?? [];
        const firstItem = items[0];
        const comboName = firstItem?.comboName || record.combo?.name || "-";
        return <span style={{ fontSize: 12 }}>{comboName}</span>;
      },
    },
    ...(showRevenue
      ? [
          {
            key: "comboPrice",
            title: "Đơn giá (MNT)",
            align: "right" as const,
            width: 120,
            render: (_: unknown, record: OrderListItem) => {
              const items = record.orderItems ?? [];
              const firstItem = items[0];
              const sellingPrice = firstItem?.sellingPrice || record.unitPrice || 0;
              return (
                <span style={{ fontWeight: 600 }}>
                  {formatNumber(sellingPrice)}
                </span>
              );
            },
          },
          {
            key: "comboPriceVnd",
            title: "Đơn giá (VND)",
            align: "right" as const,
            width: 120,
            render: (_: unknown, record: OrderListItem) => {
              const items = record.orderItems ?? [];
              const firstItem = items[0];
              const sellingPrice = firstItem?.sellingPrice || record.unitPrice || 0;
              const vndPrice = Math.round(sellingPrice * exchangeRate);
              return (
                <span style={{ fontWeight: 600 }}>
                  {formatNumber(vndPrice)}
                </span>
              );
            },
          },
          {
            key: "quantity",
            title: "SL",
            dataIndex: "quantity",
            align: "center" as const,
            width: 60,
            render: (value: unknown) => (
              <span>{value || 1}</span>
            ),
          },
          {
            key: "totalAmount",
            title: "Thành tiền (MNT)",
            dataIndex: "totalAmount",
            align: "right" as const,
            width: 130,
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
      width: 200,
      align: "center" as const,
      render: (_: unknown, record: OrderListItem) => (
        <Space>
          <ProductComboPopover order={record} />
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
        </Space>
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
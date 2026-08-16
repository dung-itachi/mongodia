/**
 * WarehouseProductDetailDrawer Component
 *
 * Drawer "Chi tiết" hiển thị breakdown theo từng Variant của 1 Product.
 *
 *   ┌────────────────────────────┐
 *   │ Chi tiết: Eyelash mascara  │
 *   │                            │
 *   │ SKU          Tồn kho  ...  │
 *   │ MASCARA-RED  100      ...  │
 *   │ MASCARA-BLUE 50       ...  │
 *   │                            │
 *   │ Tổng kho: 150              │
 *   └────────────────────────────┘
 */

import { useEffect } from "react";
import { Drawer, Skeleton, Empty, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  InboxOutlined,
  TruckOutlined,
  RollbackOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import {
  WarehouseVariantOverviewItem,
} from "@/hooks/useWarehouseProductVariants";
import { useWarehouseProductVariants } from "@/hooks/useWarehouseProductVariants";
import type { WarehouseOverviewItem } from "@/hooks/useWarehouseInventoryOverview";
import styles from "./warehouses.module.css";

export type WarehouseProductDetailDrawerProps = {
  open: boolean;
  product: WarehouseOverviewItem | null;
  onClose: () => void;
};

const TONE: Record<string, string> = {
  blue: "var(--ant-color-primary, #1890ff)",
  amber: "#fa8c16",
  orange: "#fa8c16",
  green: "#52c41a",
  purple: "#722ed1",
  muted: "#8c8c8c",
};

export default function WarehouseProductDetailDrawer({
  open,
  product,
  onClose,
}: WarehouseProductDetailDrawerProps) {
  const productId = open && product ? product.productId : null;
  const { data, loading, error } = useWarehouseProductVariants(productId);

  useEffect(() => {
    if (!open) return;
  }, [open]);

  const columns: ColumnsType<WarehouseVariantOverviewItem> = [
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      width: 140,
      fixed: "left",
      render: (v: unknown) => (
        <span style={{ fontWeight: 600, fontFamily: "monospace" }}>
          {String(v)}
        </span>
      ),
    },
    {
      title: "Tồn kho",
      dataIndex: "stock",
      key: "stock",
      width: 90,
      align: "right" as const,
      render: (v: unknown) => (
        <b style={{ color: TONE.blue }}>{String(v)}</b>
      ),
    },
    {
      title: "Đang giao",
      dataIndex: "shipping",
      key: "shipping",
      width: 90,
      align: "right" as const,
      render: (v: unknown) => (
        <span style={{ color: TONE.amber }}>{String(v)}</span>
      ),
    },
    {
      title: "Đang hoàn về",
      dataIndex: "returning",
      key: "returning",
      width: 110,
      align: "right" as const,
      render: (v: unknown) => (
        <span style={{ color: TONE.orange }}>{String(v)}</span>
      ),
    },
    {
      title: "Đã giao TC",
      dataIndex: "delivered",
      key: "delivered",
      width: 100,
      align: "right" as const,
      render: (v: unknown) => (
        <span style={{ color: TONE.green }}>{String(v)}</span>
      ),
    },
    {
      title: "Đã hoàn kho",
      dataIndex: "returned",
      key: "returned",
      width: 110,
      align: "right" as const,
      render: (v: unknown) => (
        <span style={{ color: TONE.purple }}>{String(v)}</span>
      ),
    },
    {
      title: "Tổng nhập",
      dataIndex: "imported",
      key: "imported",
      width: 100,
      align: "right" as const,
      render: (v: unknown) => (
        <span style={{ color: TONE.muted }}>{String(v)}</span>
      ),
    },
  ];

  const totals = (data?.items ?? []).reduce(
    (acc, v) => ({
      stock: acc.stock + v.stock,
      shipping: acc.shipping + v.shipping,
      returning: acc.returning + v.returning,
      delivered: acc.delivered + v.delivered,
      returned: acc.returned + v.returned,
      imported: acc.imported + v.imported,
    }),
    { stock: 0, shipping: 0, returning: 0, delivered: 0, returned: 0, imported: 0 }
  );

  const titleNode = product ? (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>
        {product.productCode} · {product.productName}
      </div>
      <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 2 }}>
        Breakdown theo từng variant
      </div>
    </div>
  ) : (
    "Chi tiết sản ph�m"
  );

  return (
    <Drawer
      title={titleNode}
      open={open}
      onClose={onClose}
      size="large"
      destroyOnHidden
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : error ? (
        <Empty description={`Lỗi: ${error}`} />
      ) : !data || data.items.length === 0 ? (
        <Empty description="Sản phẩm này chưa có variant" />
      ) : (
        <>
          <Table<WarehouseVariantOverviewItem>
            rowKey="productVariantId"
            dataSource={data.items}
            columns={columns}
            pagination={false}
            size="small"
            scroll={{ x: 600 }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: "#fafafa" }}>
                  <Table.Summary.Cell index={0}>
                    <b>Tổng ({data.items.length} variant)</b>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <b style={{ color: TONE.blue }}>{totals.stock}</b>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">
                    <b style={{ color: TONE.amber }}>{totals.shipping}</b>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <b style={{ color: TONE.orange }}>{totals.returning}</b>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <b style={{ color: TONE.green }}>{totals.delivered}</b>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    <b style={{ color: TONE.purple }}>{totals.returned}</b>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right">
                    <b style={{ color: TONE.muted }}>{totals.imported}</b>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />

          <div className={styles["wh-detail-legend"]}>
            <span style={{ color: TONE.blue }}>
              <InboxOutlined /> Tồn kho
            </span>
            <span style={{ color: TONE.amber }}>
              <TruckOutlined /> Đang giao
            </span>
            <span style={{ color: TONE.orange }}>
              <RollbackOutlined /> Đang hoàn về
            </span>
            <span style={{ color: TONE.green }}>
              <CheckCircleOutlined /> Đã giao TC
            </span>
            <span style={{ color: TONE.purple }}>
              <DownloadOutlined /> Đã hoàn kho
            </span>
          </div>
        </>
      )}
    </Drawer>
  );
}
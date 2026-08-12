"use client";

import { Tag } from "antd";
import DataTable, { type Column } from "@/components/common/table/DataTable";
import type { NormalizedInventoryItem } from "@/hooks/useWarehouseInventory";

export interface WarehouseInventoryTableProps {
  data: NormalizedInventoryItem[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

type TableRecord = Record<string, unknown>;

function formatNumber(value: number | undefined | null): string {
  const num = Number(value ?? 0);
  return num.toLocaleString("vi-VN");
}

function formatDateTime(value: string | Date | undefined | null): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WarehouseInventoryTable({
  data,
  loading,
  pagination,
}: WarehouseInventoryTableProps) {
  const columns: Column[] = [
    {
      key: "warehouse",
      title: "Kho",
      dataIndex: "warehouseName",
      width: 160,
      fixed: "left" as const,
      render: (value: unknown) => String(value ?? "-"),
    },
    {
      key: "itemType",
      title: "Loại",
      width: 100,
      render: (_: unknown, record: TableRecord) => {
        const itemType = record.itemType as string;
        return (
          <Tag color={itemType === "GIFT" ? "purple" : "blue"}>
            {itemType === "GIFT" ? "Quà tặng" : "Sản phẩm"}
          </Tag>
        );
      },
    },
    {
      key: "product",
      title: "Sản phẩm / Quà",
      width: 280,
      render: (_: unknown, record: TableRecord) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontWeight: 500 }}>{String(record.displayName ?? "")}</span>
          {record.displayCode ? (
            <span style={{ color: "#8c8c8c", fontSize: 12 }}>SKU: {String(record.displayCode)}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "quantity",
      title: "Tồn kho",
      dataIndex: "quantity",
      width: 100,
      align: "right" as const,
      render: (value: unknown) => (
        <span style={{ fontWeight: 600 }}>{formatNumber(value as number | undefined | null)}</span>
      ),
    },
    {
      key: "availableQuantity",
      title: "Khả dụng",
      dataIndex: "availableQuantity",
      width: 130,
      align: "right" as const,
      render: (value: unknown, record: TableRecord) => {
        const availQty = Number(value ?? 0);
        const reservedQty = Number(record.reservedQuantity ?? 0);
        const inTransitQty = Number(record.inTransitQuantity ?? 0);
        const hasReserved = reservedQty > 0;
        const hasInTransit = inTransitQty > 0;
        return (
          <span style={{
            color: availQty > 0 ? "#52c41a" : "#ff4d4f",
            fontWeight: 600,
          }}>
            {formatNumber(value as number | undefined | null)}
            {(hasReserved || hasInTransit) && (
              <span style={{ display: "block", color: "#8c8c8c", fontWeight: 400, fontSize: 11 }}>
                {hasReserved && `Giữ: ${formatNumber(reservedQty)}`}
                {hasReserved && hasInTransit && " • "}
                {hasInTransit && `Chuyển: ${formatNumber(inTransitQty)}`}
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "reservedQuantity",
      title: "Đã giữ",
      dataIndex: "reservedQuantity",
      width: 100,
      align: "right" as const,
      render: (value: unknown) => (
        <span style={{ color: "#faad14" }}>{formatNumber(value as number | undefined | null)}</span>
      ),
    },
    {
      key: "inTransitQuantity",
      title: "Đang chuyển",
      dataIndex: "inTransitQuantity",
      width: 110,
      align: "right" as const,
      render: (value: unknown) => (
        <span style={{ color: "#1890ff" }}>{formatNumber(value as number | undefined | null)}</span>
      ),
    },
    {
      key: "shippedQuantity",
      title: "Đã xuất",
      dataIndex: "shippedQuantity",
      width: 100,
      align: "right" as const,
      render: (value: unknown) => (
        <span style={{ color: "#8c8c8c" }}>{formatNumber(value as number | undefined | null)}</span>
      ),
    },
    {
      key: "updatedAt",
      title: "Cập nhật",
      dataIndex: "updatedAt",
      width: 150,
      render: (value: unknown) => formatDateTime(value as string | Date | undefined | null),
    },
  ];

  const tableData = data as unknown as TableRecord[];

  return (
    <DataTable
      columns={columns}
      data={tableData}
      loading={loading}
      rowKey="itemId"
      pagination={pagination}
      scroll={{ x: 1300 }}
      size="middle"
      emptyText="Không có dữ liệu tồn kho"
    />
  );
}

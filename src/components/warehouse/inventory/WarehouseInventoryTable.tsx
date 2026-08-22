"use client";

import { useState } from "react";
import { Button, Tag, Tooltip, Badge, Progress } from "antd";
import { EditOutlined, WarningOutlined, StopOutlined, CarOutlined, ClockCircleOutlined } from "@ant-design/icons";
import DataTable, { type Column } from "@/components/common/table/DataTable";
import AdjustInventoryModal from "@/components/warehouse/inventory/AdjustInventoryModal";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/permission";
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
  onAdjusted?: () => void;
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

const LOW_STOCK_THRESHOLD = 10;

type StockStatus = "ok" | "low" | "out";

function getStockStatus(quantity: number | undefined | null): StockStatus {
  const qty = Number(quantity ?? 0);
  if (qty === 0) return "out";
  if (qty < LOW_STOCK_THRESHOLD) return "low";
  return "ok";
}

const STATUS_CONFIG = {
  ok: {
    color: "#52c41a",
    bg: "#f6ffed",
    border: "#b7eb8f",
    label: "Tốt",
    icon: null,
  },
  low: {
    color: "#faad14",
    bg: "#fffbe6",
    border: "#ffe58f",
    label: "Sắp hết",
    icon: <WarningOutlined style={{ color: "#faad14" }} />,
  },
  out: {
    color: "#ff4d4f",
    bg: "#fff2f0",
    border: "#ffccc7",
    label: "Hết hàng",
    icon: <StopOutlined style={{ color: "#ff4d4f" }} />,
  },
};

export default function WarehouseInventoryTable({
  data,
  loading,
  pagination,
  onAdjusted,
}: WarehouseInventoryTableProps) {
  const [editingItem, setEditingItem] = useState<NormalizedInventoryItem | null>(null);
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canAdjust = hasPermission(permissions, "warehouse.adjust") ||
    hasPermission(permissions, "inventory-adjustment.create");

  const columns: Column[] = [
    {
      key: "warehouse",
      title: "Kho",
      dataIndex: "warehouseName",
      width: 150,
      fixed: "left" as const,
      render: (value: unknown) => (
        <span style={{ fontWeight: 500 }}>{String(value ?? "-")}</span>
      ),
    },
    {
      key: "itemType",
      title: "Loại",
      width: 110,
      render: (_: unknown, record: TableRecord) => {
        const itemType = record.itemType as string;
        return (
          <Tag
            color={itemType === "GIFT" ? "purple" : "blue"}
            style={{ borderRadius: 6 }}
          >
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
            <span style={{ color: "#8c8c8c", fontSize: 12, fontFamily: "monospace" }}>
              {String(record.displayCode)}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "stockStatus",
      title: "Tồn kho",
      width: 130,
      align: "center" as const,
      render: (_: unknown, record: TableRecord) => {
        const quantity = record.quantity as number | undefined | null;
        const status = getStockStatus(quantity);
        const cfg = STATUS_CONFIG[status];
        const qty = Number(quantity ?? 0);

        return (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 8,
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
            }}
          >
            {cfg.icon}
            <span style={{ color: cfg.color, fontWeight: 700, fontSize: 15 }}>
              {formatNumber(quantity)}
            </span>
          </div>
        );
      },
    },
    {
      key: "availableQuantity",
      title: "Khả dụng",
      dataIndex: "availableQuantity",
      width: 120,
      align: "right" as const,
      render: (value: unknown, record: TableRecord) => {
        const availQty = Number(value ?? 0);
        const reservedQty = Number(record.reservedQuantity ?? 0);
        const inTransitQty = Number(record.inTransitQuantity ?? 0);

        const color = availQty > 0 ? "#1890ff" : "#8c8c8c";

        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <span style={{ color, fontWeight: 600, fontSize: 14 }}>
              {formatNumber(value as number | undefined | null)}
            </span>
            {(reservedQty > 0 || inTransitQty > 0) && (
              <div style={{ display: "flex", gap: 8 }}>
                {reservedQty > 0 && (
                  <Tooltip title="Đã giữ (chờ xử lý)">
                    <span style={{ fontSize: 11, color: "#faad14" }}>
                      <ClockCircleOutlined style={{ marginRight: 2 }} />
                      {formatNumber(reservedQty)}
                    </span>
                  </Tooltip>
                )}
                {inTransitQty > 0 && (
                  <Tooltip title="Đang chuyển kho">
                    <span style={{ fontSize: 11, color: "#1890ff" }}>
                      <CarOutlined style={{ marginRight: 2 }} />
                      {formatNumber(inTransitQty)}
                    </span>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        );
      },
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
      render: (value: unknown) => (
        <span style={{ color: "#8c8c8c", fontSize: 12 }}>
          {formatDateTime(value as string | Date | undefined | null)}
        </span>
      ),
    },
    {
      key: "actions",
      title: "Hành động",
      width: 100,
      fixed: "right" as const,
      align: "center" as const,
      render: (_: unknown, record: TableRecord) => {
        if (!canAdjust) return null;
        const item = record as unknown as NormalizedInventoryItem;
        return (
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => setEditingItem(item)}
            style={{ borderRadius: 6 }}
          >
            Sửa
          </Button>
        );
      },
    },
  ];

  const tableData = data as unknown as TableRecord[];

  return (
    <>
      <DataTable
        columns={columns}
        data={tableData}
        loading={loading}
        rowKey="itemId"
        pagination={pagination}
        scroll={{ x: 1200 }}
        size="middle"
        emptyText="Không có dữ liệu tồn kho"
      />
      <AdjustInventoryModal
        open={Boolean(editingItem)}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSuccess={() => {
          setEditingItem(null);
          onAdjusted?.();
        }}
      />
    </>
  );
}

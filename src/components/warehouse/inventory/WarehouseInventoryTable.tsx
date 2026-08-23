"use client";

import { useState } from "react";
import { Button, Tag, Tooltip, Badge, Progress } from "antd";
import { EditOutlined, WarningOutlined, StopOutlined, CarOutlined, ClockCircleOutlined } from "@ant-design/icons";
import DataTable, { type Column } from "@/components/common/table/DataTable";
import AdjustInventoryModal from "@/components/warehouse/inventory/AdjustInventoryModal";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/permission";
import type { NormalizedInventoryItem } from "@/hooks/useWarehouseInventory";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

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

export default function WarehouseInventoryTable({
  data,
  loading,
  pagination,
  onAdjusted,
}: WarehouseInventoryTableProps) {
  const lang = useLanguageStore((s) => s.language);
  const [editingItem, setEditingItem] = useState<NormalizedInventoryItem | null>(null);
  const permissions = useAuthStore((state) => state.user?.permissions) ?? [];
  const canAdjust = hasPermission(permissions, "warehouse.adjust") ||
    hasPermission(permissions, "inventory-adjustment.create");

  const statusConfig = {
    ok: {
      color: "#52c41a",
      bg: "#f6ffed",
      border: "#b7eb8f",
      label: t("Tốt", lang),
      icon: null,
    },
    low: {
      color: "#faad14",
      bg: "#fffbe6",
      border: "#ffe58f",
      label: t("Sắp hết", lang),
      icon: <WarningOutlined style={{ color: "#faad14" }} />,
    },
    out: {
      color: "#ff4d4f",
      bg: "#fff2f0",
      border: "#ffccc7",
      label: t("Hết hàng", lang),
      icon: <StopOutlined style={{ color: "#ff4d4f" }} />,
    },
  };

  const columns: Column[] = [
    {
      key: "warehouse",
      title: t("Kho", lang),
      dataIndex: "warehouseName",
      width: 150,
      fixed: "left" as const,
      render: (value: unknown) => (
        <span style={{ fontWeight: 500 }}>{String(value ?? "-")}</span>
      ),
    },
    {
      key: "itemType",
      title: t("Loại", lang),
      width: 110,
      render: (_: unknown, record: TableRecord) => {
        const itemType = record.itemType as string;
        return (
          <Tag
            color={itemType === "GIFT" ? "purple" : "blue"}
            style={{ borderRadius: 6 }}
          >
            {itemType === "GIFT" ? t("Quà tặng", lang) : t("Sản phẩm", lang)}
          </Tag>
        );
      },
    },
    {
      key: "product",
      title: t("Sản phẩm / Quà", lang),
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
      title: t("Tồn kho", lang),
      width: 130,
      align: "center" as const,
      render: (_: unknown, record: TableRecord) => {
        const quantity = record.quantity as number | undefined | null;
        const status = getStockStatus(quantity);
        const cfg = statusConfig[status];
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
      title: t("Khả dụng", lang),
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
                  <Tooltip title={t("Đã giữ (chờ xử lý)", lang)}>
                    <span style={{ fontSize: 11, color: "#faad14" }}>
                      <ClockCircleOutlined style={{ marginRight: 2 }} />
                      {formatNumber(reservedQty)}
                    </span>
                  </Tooltip>
                )}
                {inTransitQty > 0 && (
                  <Tooltip title={t("Đang chuyển kho", lang)}>
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
      title: t("Đã xuất", lang),
      dataIndex: "shippedQuantity",
      width: 100,
      align: "right" as const,
      render: (value: unknown) => (
        <span style={{ color: "#8c8c8c" }}>{formatNumber(value as number | undefined | null)}</span>
      ),
    },
    {
      key: "updatedAt",
      title: t("Cập nhật", lang),
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
      title: t("Hành động", lang),
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
            {t("Sửa", lang)}
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
        emptyText={t("Không có dữ liệu tồn kho", lang)}
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

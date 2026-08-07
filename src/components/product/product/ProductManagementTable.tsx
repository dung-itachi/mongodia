/**
 * Product Management Table (Sprint 8.4.1)
 *
 * Table for displaying Products with Combo info, Inventory stats, and Order stats.
 * Columns: (stt) | Tên SP | Combo(số lượng combo) | Combos(hiển thị những combo hiện có của sản phẩm) | SL nhập | SL đáp kho | Ngày nhập | Ngày đáp kho | Đơn chốt | Thao tác
 */

"use client";

import { useState, useCallback } from "react";
import { Switch, Popconfirm, Tag, Tooltip, Select, Button, Space } from "antd";
import { EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import DataTable from "@/components/common/table/DataTable";
import type { Column } from "@/components/common/table/DataTable";
import type {
  ProductManagementItem,
  WarehouseInfo,
  ComboListItem,
} from "@/hooks/useProductCrud";

interface ProductManagementTableProps {
  data: ProductManagementItem[];
  warehouses: WarehouseInfo[];
  loading?: boolean;
  onEdit: (item: ProductManagementItem) => void;
  onDelete: (item: ProductManagementItem) => void;
  onToggleActive?: (item: ProductManagementItem) => void;
  onViewCombos?: (item: ProductManagementItem) => void;
  selectedWarehouseId?: string;
  onWarehouseChange?: (warehouseId: string) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatNumber(num: number): string {
  return num.toLocaleString("vi-VN");
}

function ComboTag({ combo }: { combo: ComboListItem }) {
  return (
    <Tag
      color={combo.isActive ? "blue" : "default"}
      style={{ marginBottom: 2 }}
    >
      {combo.name} ({combo.packageSize})
    </Tag>
  );
}

export default function ProductManagementTable({
  data,
  warehouses,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
  onViewCombos,
  selectedWarehouseId,
  onWarehouseChange,
}: ProductManagementTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const getCategoryName = useCallback((category: ProductManagementItem["category"]) => {
    if (typeof category === "object" && category !== null) {
      return (category as { name: string }).name;
    }
    return "-";
  }, []);

  const getWarehouseStats = useCallback(
    (item: ProductManagementItem) => {
      if (!selectedWarehouseId) {
        // Aggregate all warehouses
        let totalImported = 0;
        let totalCurrent = 0;
        let latestImportDate: string | null = null;

        Object.values(item.inventoryByWarehouse).forEach((stats) => {
          totalImported += stats.importedQuantity;
          totalCurrent += stats.currentQuantity;
          if (stats.lastImportDate) {
            if (!latestImportDate || stats.lastImportDate > latestImportDate) {
              latestImportDate = stats.lastImportDate;
            }
          }
        });

        return {
          imported: totalImported,
          current: totalCurrent,
          lastImportDate: latestImportDate,
          lastWarehouseReceiptDate: null,
        };
      }

      const stats = item.inventoryByWarehouse[selectedWarehouseId];
      if (!stats) {
        return {
          imported: 0,
          current: 0,
          lastImportDate: null,
          lastWarehouseReceiptDate: null,
        };
      }

      return {
        imported: stats.importedQuantity,
        current: stats.currentQuantity,
        lastImportDate: stats.lastImportDate,
        lastWarehouseReceiptDate: stats.lastWarehouseReceiptDate,
      };
    },
    [selectedWarehouseId]
  );

  const columns: Column[] = [
    {
      key: "index",
      title: "STT",
      width: 60,
      align: "center",
      render: (_: unknown, record: Record<string, unknown>, index: number) => index + 1,
    },
    {
      key: "code",
      title: "Mã SP",
      dataIndex: "code",
      width: 100,
    },
    {
      key: "name",
      title: "Tên sản phẩm",
      dataIndex: "name",
      width: 200,
      render: (value: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductManagementItem;
        return (
          <div>
            <div style={{ fontWeight: 500 }}>{item.name}</div>
            <div style={{ fontSize: 12, color: "#999" }}>
              {getCategoryName(item.category)}
            </div>
          </div>
        );
      },
    },
    {
      key: "comboCount",
      title: "Combo",
      width: 100,
      align: "center",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductManagementItem;
        return (
          <Tag color={item.comboCount > 0 ? "green" : "default"}>
            {item.comboCount} combo
          </Tag>
        );
      },
    },
    {
      key: "combos",
      title: "Danh sách Combo",
      width: 300,
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductManagementItem;
        if (item.combos.length === 0) {
          return <span style={{ color: "#999" }}>-</span>;
        }

        const displayCombos = item.combos.slice(0, 3);
        const remaining = item.combos.length - 3;

        return (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {displayCombos.map((combo) => (
                <ComboTag key={combo._id} combo={combo} />
              ))}
            </div>
            {remaining > 0 && (
              <Button
                type="link"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewCombos?.(item);
                }}
                style={{ padding: 0, height: "auto" }}
              >
                +{remaining} combo khác
              </Button>
            )}
          </div>
        );
      },
    },
    {
      key: "importedQuantity",
      title: "SL nhập",
      width: 100,
      align: "right",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductManagementItem;
        const stats = getWarehouseStats(item);
        return (
          <span style={{ fontWeight: 500 }}>
            {formatNumber(stats.imported)}
          </span>
        );
      },
    },
    {
      key: "currentQuantity",
      title: "SL đáp kho",
      width: 100,
      align: "right",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductManagementItem;
        const stats = getWarehouseStats(item);
        return (
          <span
            style={{
              fontWeight: 500,
              color: stats.current > 0 ? "#52c41a" : "#ff4d4f",
            }}
          >
            {formatNumber(stats.current)}
          </span>
        );
      },
    },
    {
      key: "lastImportDate",
      title: "Ngày nhập",
      width: 110,
      align: "center",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductManagementItem;
        const stats = getWarehouseStats(item);
        return formatDate(stats.lastImportDate);
      },
    },
    {
      key: "lastWarehouseReceiptDate",
      title: "Ngày đáp kho",
      width: 110,
      align: "center",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductManagementItem;
        const stats = getWarehouseStats(item);
        return formatDate(stats.lastWarehouseReceiptDate);
      },
    },
    {
      key: "closedOrdersCount",
      title: "Đơn chốt",
      width: 100,
      align: "center",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductManagementItem;
        return (
          <Tooltip
            title={`Tổng số lượng: ${formatNumber(item.totalClosedQuantity)}`}
          >
            <Tag color="gold">{formatNumber(item.closedOrdersCount)}</Tag>
          </Tooltip>
        );
      },
    },
    {
      key: "isActive",
      title: "Kích hoạt",
      dataIndex: "isActive",
      width: 90,
      align: "center",
      render: (value: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductManagementItem;
        return (
          <Switch
            checked={item.isActive !== false}
            onChange={() => onToggleActive?.(item)}
            size="small"
          />
        );
      },
    },
    {
      key: "actions",
      title: "Thao tác",
      width: 100,
      align: "center",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductManagementItem;
        return (
          <Space size={4}>
            <Tooltip title="Sửa">
              <EditOutlined
                style={{ color: "#1890ff", cursor: "pointer", fontSize: 16 }}
                onClick={() => onEdit(item)}
              />
            </Tooltip>
            <Popconfirm
              title="Xóa sản phẩm?"
              description="Sản phẩm sẽ bị vô hiệu hóa."
              onConfirm={() => onDelete(item)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xóa">
                <DeleteOutlined
                  style={{ color: "#ff4d4f", cursor: "pointer", fontSize: 16 }}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      {/* Warehouse Filter */}
      <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontWeight: 500 }}>Kho:</span>
        <Select
          allowClear
          placeholder="Tất cả kho"
          style={{ width: 200 }}
          value={selectedWarehouseId || undefined}
          onChange={(value) => onWarehouseChange?.(value || "")}
          options={warehouses.map((w) => ({
            value: w._id,
            label: `${w.code} - ${w.name}`,
          }))}
        />
        <span style={{ color: "#999", fontSize: 12 }}>
          {data.length} sản phẩm
        </span>
      </div>

      <DataTable
        columns={columns}
        data={data as unknown as Record<string, unknown>[]}
        loading={loading}
        rowKey="_id"
        pagination={false}
        emptyText="Chưa có sản phẩm nào"
        scroll={{ y: 500, x: 1400 }}
      />
    </div>
  );
}

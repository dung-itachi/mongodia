/**
 * Product Management Table (Sprint 8.x)
 *
 * Hiển thị sản phẩm với:
 * - Combo count, danh sách combo
 * - Tồn kho
 * - Đơn chốt
 * - Trạng thái
 * - Thao tác: Sửa, Combo, Xóa
 *
 * Bộ lọc (tìm kiếm theo tên, danh mục, kho, khoảng ngày) đã được
 * chuyển lên ProductPage và áp dụng ở API. Table chỉ nhận dữ liệu
 * đã lọc kèm `selectedWarehouseId` để highlight chỉ số tồn kho.
 */

"use client";

import { useCallback } from "react";
import { Switch, Popconfirm, Tag, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined, GiftOutlined } from "@ant-design/icons";
import DataTable from "@/components/common/table/DataTable";
import type { Column } from "@/components/common/table/DataTable";
import type {
  ProductManagementItem,
  ComboListItem,
} from "@/hooks/useProductCrud";

interface ProductManagementTableProps {
  data: ProductManagementItem[];
  loading?: boolean;
  onEdit: (item: ProductManagementItem) => void;
  onDelete: (item: ProductManagementItem) => void;
  onToggleActive?: (item: ProductManagementItem) => void;
  onOpenCombos?: (item: ProductManagementItem) => void;
  selectedWarehouseId?: string;
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
    <Tag color={combo.isActive ? "blue" : "default"} style={{ marginBottom: 2 }}>
      {combo.name} ({combo.packageQuantity})
    </Tag>
  );
}

export default function ProductManagementTable({
  data,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
  onOpenCombos,
  selectedWarehouseId,
}: ProductManagementTableProps) {
  const getCategoryName = useCallback((category: ProductManagementItem["category"]) => {
    if (typeof category === "object" && category !== null) {
      return (category as { name: string }).name;
    }
    return "-";
  }, []);

  const getWarehouseStats = useCallback(
    (item: ProductManagementItem) => {
      if (!selectedWarehouseId) {
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
      render: (_: unknown, record: Record<string, unknown>) => {
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
          return (
            <span style={{ color: "#999" }}>
              -{" "}
              {onOpenCombos && (
                <a
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCombos(item);
                  }}
                  style={{ marginLeft: 8 }}
                >
                  + Tạo combo
                </a>
              )}
            </span>
          );
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
            {onOpenCombos && (
              <a
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCombos(item);
                }}
                style={{ fontSize: 12 }}
              >
                {remaining > 0 ? `+${remaining} khác · ` : ""}Quản lý
              </a>
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
        return <span style={{ fontWeight: 500 }}>{formatNumber(stats.imported)}</span>;
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
      render: (_: unknown, record: Record<string, unknown>) => {
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
      width: 140,
      align: "center",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductManagementItem;
        return (
          <div style={{ display: "flex", gap: 12, justifyContent: "center", fontSize: 16 }}>
            <Tooltip title="Sửa">
              <EditOutlined
                style={{ color: "#1890ff", cursor: "pointer" }}
                onClick={() => onEdit(item)}
              />
            </Tooltip>
            <Tooltip title="Quản lý combo theo sản phẩm này">
              <GiftOutlined
                style={{ color: item.comboCount > 0 ? "#52c41a" : "#8c8c8c", cursor: "pointer" }}
                onClick={() => onOpenCombos?.(item)}
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
                <DeleteOutlined style={{ color: "#ff4d4f", cursor: "pointer" }} />
              </Tooltip>
            </Popconfirm>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 8,
        }}
      >
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
        emptyText="Không có sản phẩm nào phù hợp với bộ lọc"
        scroll={{ y: 500, x: 1400 }}
      />
    </div>
  );
}
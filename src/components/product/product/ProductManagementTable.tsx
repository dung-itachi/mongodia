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
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

function getTranslated(key: string): string {
  const language = useLanguageStore.getState().language;
  return t(key, language);
}

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
    <Tooltip title={`${combo.name} (${combo.packageQuantity})`} placement="top">
      <Tag
        color={combo.isActive ? "blue" : "default"}
        style={{
          marginBottom: 2,
          maxWidth: 150,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          cursor: "default",
        }}
      >
        {combo.name} ({combo.packageQuantity})
      </Tag>
    </Tooltip>
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
      render: (_: unknown, record: Record<string, unknown>, index: number = 0) => index + 1,
    },
    {
      key: "code",
      title: getTranslated("Mã sản phẩm"),
      dataIndex: "code",
      width: 100,
    },
    {
      key: "name",
      title: getTranslated("Tên sản phẩm"),
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
      title: getTranslated("Combo"),
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
      title: getTranslated("Danh mục"),
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
                  + {getTranslated("Tạo")}
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
              <Tooltip title={getTranslated("Click để quản lý combo")} placement="top">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCombos(item);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    color: "#1890ff",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: "linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)",
                    border: "1px solid #91d5ff",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)";
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.borderColor = "#1890ff";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(24, 144, 255, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)";
                    e.currentTarget.style.color = "#1890ff";
                    e.currentTarget.style.borderColor = "#91d5ff";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <GiftOutlined style={{ fontSize: 11 }} />
                  {getTranslated("Sửa")}
                  {remaining > 0 && (
                    <span style={{
                      background: "#ff4d4f",
                      color: "#fff",
                      borderRadius: "50%",
                      fontSize: 10,
                      padding: "0 5px",
                      lineHeight: "16px",
                      minWidth: 16,
                      textAlign: "center",
                    }}>
                      +{remaining}
                    </span>
                  )}
                </span>
              </Tooltip>
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
      title: getTranslated("Ngày tạo"),
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
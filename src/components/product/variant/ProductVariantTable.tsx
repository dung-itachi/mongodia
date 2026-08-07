/**
 * Product Variant Table Component (Sprint 8.4.1)
 *
 * Table for displaying and managing Product Variants.
 */

"use client";

import { useCallback, useMemo } from "react";
import { Switch, Popconfirm, Tag, InputNumber } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import DataTable from "@/components/common/table/DataTable";
import type { Column } from "@/components/common/table/DataTable";
import type { ProductVariantListItem } from "@/hooks/useVariants";

interface ProductVariantTableProps {
  data: ProductVariantListItem[];
  loading?: boolean;
  onEdit: (item: ProductVariantListItem) => void;
  onDelete: (item: ProductVariantListItem) => void;
  onToggleActive?: (item: ProductVariantListItem) => void;
}

export default function ProductVariantTable({
  data,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
}: ProductVariantTableProps) {
  const getProductName = useCallback((productId: ProductVariantListItem["productId"]) => {
    if (typeof productId === "object" && productId !== null) {
      return (productId as { name: string }).name;
    }
    return "-";
  }, []);

  const formatVariantValues = useCallback((variantValues: ProductVariantListItem["variantValues"]) => {
    if (!Array.isArray(variantValues) || variantValues.length === 0) {
      return "-";
    }
    return variantValues
      .map((v) => {
        if (typeof v === "object" && v !== null) {
          return (v as { name: string }).name;
        }
        return String(v);
      })
      .join(" | ");
  }, []);

  const handleToggleActive = useCallback(
    (item: ProductVariantListItem) => {
      onToggleActive?.(item);
    },
    [onToggleActive]
  );

  const columns: Column[] = [
    {
      key: "product",
      title: "Sản phẩm",
      width: 150,
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductVariantListItem;
        return getProductName(item.productId);
      },
    },
    {
      key: "sku",
      title: "SKU",
      dataIndex: "sku",
      width: 120,
    },
    {
      key: "barcode",
      title: "Barcode",
      dataIndex: "barcode",
      width: 120,
    },
    {
      key: "variantValues",
      title: "Biến thể",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductVariantListItem;
        return formatVariantValues(item.variantValues);
      },
    },
    {
      key: "price",
      title: "Giá",
      dataIndex: "price",
      width: 120,
      align: "right",
      render: (value: unknown) => {
        if (typeof value === "number") {
          return `${value.toLocaleString()}₮`;
        }
        return "-";
      },
    },
    {
      key: "isActive",
      title: "Kích hoạt",
      dataIndex: "isActive",
      width: 100,
      align: "center",
      render: (value: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductVariantListItem;
        return (
          <Switch
            checked={item.isActive !== false}
            onChange={() => handleToggleActive(item)}
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
        const item = record as unknown as ProductVariantListItem;
        return (
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <EditOutlined
              style={{ color: "#1890ff", cursor: "pointer", fontSize: 16 }}
              onClick={() => onEdit(item)}
            />
            <Popconfirm
              title="Xóa biến thể?"
              description="Biến thể sẽ bị xóa."
              onConfirm={() => onDelete(item)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <DeleteOutlined
                style={{ color: "#ff4d4f", cursor: "pointer", fontSize: 16 }}
              />
            </Popconfirm>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data as unknown as Record<string, unknown>[]}
      loading={loading}
      rowKey="_id"
      pagination={false}
      emptyText="Chưa có biến thể nào"
      scroll={{ y: 400 }}
    />
  );
}

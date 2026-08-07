/**
 * Variant Value Table Component (Sprint 8.4.1)
 *
 * Table for displaying and managing Variant Values (e.g., 500ml, 1kg, Red).
 */

"use client";

import { useCallback } from "react";
import { Switch, Popconfirm, Tag } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import DataTable from "@/components/common/table/DataTable";
import type { Column } from "@/components/common/table/DataTable";
import type { VariantValueItem } from "@/hooks/useVariants";

interface VariantValueTableProps {
  data: VariantValueItem[];
  loading?: boolean;
  onEdit: (item: VariantValueItem) => void;
  onDelete: (item: VariantValueItem) => void;
  onToggleActive?: (item: VariantValueItem) => void;
}

export default function VariantValueTable({
  data,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
}: VariantValueTableProps) {
  const getOptionName = useCallback((variantOptionId: VariantValueItem["variantOptionId"]) => {
    if (typeof variantOptionId === "object" && variantOptionId !== null) {
      return (variantOptionId as { name: string }).name;
    }
    return "-";
  }, []);

  const handleToggleActive = useCallback(
    (item: VariantValueItem) => {
      onToggleActive?.(item);
    },
    [onToggleActive]
  );

  const columns: Column[] = [
    {
      key: "code",
      title: "Mã giá trị",
      dataIndex: "code",
      width: 150,
    },
    {
      key: "name",
      title: "Tên giá trị",
      dataIndex: "name",
    },
    {
      key: "variantOption",
      title: "Thuộc tính",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as VariantValueItem;
        return getOptionName(item.variantOptionId);
      },
    },
    {
      key: "sortOrder",
      title: "Thứ tự",
      dataIndex: "sortOrder",
      width: 80,
      align: "center",
    },
    {
      key: "isActive",
      title: "Kích hoạt",
      dataIndex: "isActive",
      width: 100,
      align: "center",
      render: (value: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as VariantValueItem;
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
        const item = record as unknown as VariantValueItem;
        return (
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <EditOutlined
              style={{ color: "#1890ff", cursor: "pointer", fontSize: 16 }}
              onClick={() => onEdit(item)}
            />
            <Popconfirm
              title="Xóa giá trị?"
              description="Giá trị biến thể sẽ bị xóa."
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
      emptyText="Chưa có giá trị biến thể nào"
      scroll={{ y: 400 }}
    />
  );
}

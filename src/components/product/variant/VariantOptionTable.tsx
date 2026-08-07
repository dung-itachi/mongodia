/**
 * Variant Option Table Component (Sprint 8.4.1)
 *
 * Table for displaying and managing Variant Options (e.g., Size, Color).
 */

"use client";

import { useCallback } from "react";
import { Switch, Popconfirm, Tag } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import DataTable from "@/components/common/table/DataTable";
import type { Column } from "@/components/common/table/DataTable";
import type { VariantOptionItem } from "@/hooks/useVariants";

interface VariantOptionTableProps {
  data: VariantOptionItem[];
  loading?: boolean;
  onEdit: (item: VariantOptionItem) => void;
  onDelete: (item: VariantOptionItem) => void;
  onToggleActive?: (item: VariantOptionItem) => void;
}

export default function VariantOptionTable({
  data,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
}: VariantOptionTableProps) {
  const handleToggleActive = useCallback(
    (item: VariantOptionItem) => {
      onToggleActive?.(item);
    },
    [onToggleActive]
  );

  const columns: Column[] = [
    {
      key: "code",
      title: "Mã thuộc tính",
      dataIndex: "code",
      width: 150,
    },
    {
      key: "name",
      title: "Tên thuộc tính",
      dataIndex: "name",
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
        const item = record as unknown as VariantOptionItem;
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
        const item = record as unknown as VariantOptionItem;
        return (
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <EditOutlined
              style={{ color: "#1890ff", cursor: "pointer", fontSize: 16 }}
              onClick={() => onEdit(item)}
            />
            <Popconfirm
              title="Xóa thuộc tính?"
              description="Thuộc tính biến thể sẽ bị xóa."
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
      emptyText="Chưa có thuộc tính biến thể nào"
      scroll={{ y: 400 }}
    />
  );
}

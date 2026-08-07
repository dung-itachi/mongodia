/**
 * Category Table Component (Sprint 8.4.1)
 *
 * Table for displaying and managing Categories.
 */

"use client";

import { useCallback } from "react";
import { Switch, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import DataTable from "@/components/common/table/DataTable";
import type { Column } from "@/components/common/table/DataTable";
import type { CategoryListItem } from "@/hooks/useCategories";

interface CategoryTableProps {
  data: CategoryListItem[];
  loading?: boolean;
  onEdit: (item: CategoryListItem) => void;
  onDelete: (item: CategoryListItem) => void;
  onToggleActive?: (item: CategoryListItem) => void;
}

export default function CategoryTable({
  data,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
}: CategoryTableProps) {
  const handleToggleActive = useCallback(
    (item: CategoryListItem) => {
      onToggleActive?.(item);
    },
    [onToggleActive]
  );

  const columns: Column[] = [
    {
      key: "code",
      title: "Mã",
      dataIndex: "code",
      width: 120,
    },
    {
      key: "name",
      title: "Tên",
      dataIndex: "name",
    },
    {
      key: "description",
      title: "Mô tả",
      dataIndex: "description",
      width: 200,
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
        const item = record as unknown as CategoryListItem;
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
      width: 120,
      align: "center",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as CategoryListItem;
        return (
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <EditOutlined
              style={{ color: "#1890ff", cursor: "pointer", fontSize: 16 }}
              onClick={() => onEdit(item)}
            />
            <Popconfirm
              title="Xóa danh mục?"
              description="Danh mục sẽ bị vô hiệu hóa."
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
      emptyText="Chưa có danh mục nào"
      scroll={{ y: 400 }}
    />
  );
}

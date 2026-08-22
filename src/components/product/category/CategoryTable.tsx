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
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
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
  const lang = useLanguageStore((s) => s.language);
  const handleToggleActive = useCallback(
    (item: CategoryListItem) => {
      onToggleActive?.(item);
    },
    [onToggleActive]
  );

  const columns: Column[] = [
    {
      key: "code",
      title: t("Mã", lang),
      dataIndex: "code",
      width: 120,
    },
    {
      key: "name",
      title: t("Tên", lang),
      dataIndex: "name",
    },
    {
      key: "description",
      title: t("Mô tả", lang),
      dataIndex: "description",
      width: 200,
    },
    {
      key: "sortOrder",
      title: t("Thứ tự", lang),
      dataIndex: "sortOrder",
      width: 80,
      align: "center",
    },
    {
      key: "isActive",
      title: t("Kích hoạt", lang),
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
      title: t("Thao tác", lang),
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
              title={t("Xóa danh mục?", lang)}
              description={t("Danh mục sẽ bị vô hiệu hóa.", lang)}
              onConfirm={() => onDelete(item)}
              okText={t("Xóa", lang)}
              cancelText={t("Hủy", lang)}
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
      emptyText={t("Chưa có danh mục nào", lang)}
      scroll={{ y: 400 }}
    />
  );
}

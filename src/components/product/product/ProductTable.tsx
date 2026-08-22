/**
 * Product Table Component (Sprint 8.4.1)
 *
 * Table for displaying and managing Products.
 */

"use client";

import { useCallback } from "react";
import { Switch, Popconfirm, Image } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import DataTable from "@/components/common/table/DataTable";
import type { Column } from "@/components/common/table/DataTable";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import type { ProductListItem } from "@/hooks/useProductCrud";

interface ProductTableProps {
  data: ProductListItem[];
  loading?: boolean;
  onEdit: (item: ProductListItem) => void;
  onDelete: (item: ProductListItem) => void;
  onToggleActive?: (item: ProductListItem) => void;
}

export default function ProductTable({
  data,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
}: ProductTableProps) {
  const lang = useLanguageStore((s) => s.language);
  const getCategoryName = useCallback((category: ProductListItem["category"]) => {
    if (typeof category === "object" && category !== null) {
      return (category as { name: string }).name;
    }
    return "-";
  }, []);

  const handleToggleActive = useCallback(
    (item: ProductListItem) => {
      onToggleActive?.(item);
    },
    [onToggleActive]
  );

  const columns: Column[] = [
    {
      key: "image",
      title: t("Ảnh", lang),
      width: 70,
      align: "center",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductListItem;
        if (item.image) {
          return (
            <Image
              src={item.image}
              alt={item.name}
              width={40}
              height={40}
              style={{ objectFit: "cover", borderRadius: 4 }}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
            />
          );
        }
        return <span style={{ color: "#999" }}>-</span>;
      },
    },
    {
      key: "code",
      title: t("Mã", lang),
      dataIndex: "code",
      width: 120,
    },
    {
      key: "name",
      title: t("Tên sản phẩm", lang),
      dataIndex: "name",
    },
    {
      key: "category",
      title: t("Danh mục", lang),
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductListItem;
        return getCategoryName(item.category);
      },
    },
    {
      key: "description",
      title: t("Mô tả", lang),
      dataIndex: "description",
      width: 200,
    },
    {
      key: "isActive",
      title: t("Kích hoạt", lang),
      dataIndex: "isActive",
      width: 100,
      align: "center",
      render: (value: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductListItem;
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
      width: 100,
      align: "center",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as ProductListItem;
        return (
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <EditOutlined
              style={{ color: "#1890ff", cursor: "pointer", fontSize: 16 }}
              onClick={() => onEdit(item)}
            />
            <Popconfirm
              title={t("Xóa sản phẩm?", lang)}
              description={t("Sản phẩm sẽ bị vô hiệu hóa.", lang)}
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
      emptyText={t("Chưa có sản phẩm nào", lang)}
      scroll={{ y: 400 }}
    />
  );
}

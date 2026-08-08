/**
 * Gift Table Component (Sprint 8.x - Gift Management)
 */

"use client";

import { useCallback } from "react";
import { Switch, Popconfirm, Tag } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import DataTable from "@/components/common/table/DataTable";
import type { Column } from "@/components/common/table/DataTable";
import type { GiftListItem } from "@/hooks/useGifts";

interface GiftTableProps {
  data: GiftListItem[];
  loading?: boolean;
  onEdit: (item: GiftListItem) => void;
  onDelete: (item: GiftListItem) => void;
  onToggleActive?: (item: GiftListItem) => void;
}

export default function GiftTable({
  data,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
}: GiftTableProps) {
  const handleToggleActive = useCallback(
    (item: GiftListItem) => {
      onToggleActive?.(item);
    },
    [onToggleActive]
  );

  const columns: Column[] = [
    {
      key: "stt",
      title: "STT",
      width: 60,
      align: "center",
      render: (_: unknown, record: Record<string, unknown>, index: number) => {
        return <span>{index + 1}</span>;
      },
    },
    {
      key: "name",
      title: "Tên quà",
      dataIndex: "name",
    },
    {
      key: "stockQuantity",
      title: "Tồn kho",
      dataIndex: "stockQuantity",
      width: 120,
      align: "right",
      render: (value: unknown) => {
        const n = Number(value ?? 0);
        const color = n <= 10 ? "red" : n <= 30 ? "orange" : "green";
        return <Tag color={color}>{n.toLocaleString("vi-VN")}</Tag>;
      },
    },
    {
      key: "isActive",
      title: "Trạng thái",
      dataIndex: "isActive",
      width: 120,
      align: "center",
      render: (value: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as GiftListItem;
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
        const item = record as unknown as GiftListItem;
        return (
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <EditOutlined
              style={{ color: "#1890ff", cursor: "pointer", fontSize: 16 }}
              onClick={() => onEdit(item)}
            />
            <Popconfirm
              title="Xóa quà tặng?"
              description="Quà tặng sẽ bị vô hiệu hóa."
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
      emptyText="Chưa có quà tặng nào"
      scroll={{ y: 500 }}
    />
  );
}

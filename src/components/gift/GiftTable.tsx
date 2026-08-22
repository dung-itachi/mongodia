"use client";

import { useCallback } from "react";
import { Button, Popconfirm, Switch, Tag, Tooltip } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  HistoryOutlined,
  PlusOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import DataTable from "@/components/common/table/DataTable";
import type { Column } from "@/components/common/table/DataTable";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import type { GiftListItem } from "@/hooks/useGifts";

interface GiftTableProps {
  data: GiftListItem[];
  loading?: boolean;
  onEdit: (item: GiftListItem) => void;
  onDelete: (item: GiftListItem) => void;
  onToggleActive?: (item: GiftListItem) => void;
  onImport: (item: GiftListItem) => void;
  onAdjust: (item: GiftListItem) => void;
  onHistory: (item: GiftListItem) => void;
}

export default function GiftTable({
  data,
  loading,
  onEdit,
  onDelete,
  onToggleActive,
  onImport,
  onAdjust,
  onHistory,
}: GiftTableProps) {
  const lang = useLanguageStore((s) => s.language);
  const handleToggleActive = useCallback(
    (item: GiftListItem) => onToggleActive?.(item),
    [onToggleActive]
  );

  const columns: Column[] = [
    {
      key: "stt",
      title: t("STT", lang),
      width: 60,
      align: "center",
      render: (_: unknown, __: Record<string, unknown>, index: number = 0) => <span>{index + 1}</span>,
    },
    { key: "name", title: t("Tên quà", lang), dataIndex: "name" },
    {
      key: "stockQuantity",
      title: t("Tồn kho", lang),
      dataIndex: "stockQuantity",
      width: 120,
      align: "right",
      render: (value: unknown) => {
        const quantity = Number(value ?? 0);
        const color = quantity <= 10 ? "red" : quantity <= 30 ? "orange" : "green";
        return <Tag color={color}>{quantity.toLocaleString("vi-VN")}</Tag>;
      },
    },
    {
      key: "isActive",
      title: t("Trạng thái", lang),
      dataIndex: "isActive",
      width: 120,
      align: "center",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as GiftListItem;
        return <Switch checked={item.isActive !== false} onChange={() => handleToggleActive(item)} size="small" />;
      },
    },
    {
      key: "actions",
      title: t("Thao tác", lang),
      width: 230,
      align: "center",
      render: (_: unknown, record: Record<string, unknown>) => {
        const item = record as unknown as GiftListItem;
        return (
          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
            <Tooltip title={t("Nhập tồn", lang)}>
              <Button type="text" icon={<PlusOutlined />} onClick={() => onImport(item)} />
            </Tooltip>
            <Tooltip title={t("Điều chỉnh tồn", lang)}>
              <Button type="text" icon={<SettingOutlined />} onClick={() => onAdjust(item)} />
            </Tooltip>
            <Tooltip title={t("Lịch sử tồn", lang)}>
              <Button type="text" icon={<HistoryOutlined />} onClick={() => onHistory(item)} />
            </Tooltip>
            <Tooltip title={t("Sửa thông tin", lang)}>
              <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(item)} />
            </Tooltip>
            <Popconfirm
              title={t("Xóa quà tặng?", lang)}
              description={t("Quà tặng sẽ bị vô hiệu hóa.", lang)}
              onConfirm={() => onDelete(item)}
              okText={t("Xóa", lang)}
              cancelText={t("Hủy", lang)}
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
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
      emptyText={t("Chưa có quà tặng nào", lang)}
      scroll={{ x: 850, y: 500 }}
    />
  );
}

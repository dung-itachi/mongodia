"use client";

import { useMemo } from "react";
import { Button, Input, Popconfirm, Select, Space, Switch, Tag, Tooltip } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PushpinOutlined,
  PushpinFilled,
  ReloadOutlined,
} from "@ant-design/icons";
import DataTable from "@/components/common/table/DataTable";
import type { Column } from "@/components/common/table/DataTable";
import type { NotificationAdminItem } from "@/hooks/useNotificationsAdmin";
import {
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CATEGORY_VALUES,
  NOTIFICATION_PRIORITY_LABELS,
  NOTIFICATION_PRIORITY_VALUES,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_VALUES,
  type NotificationCategory,
  type NotificationPriority,
  type NotificationType,
} from "@/constants/notification";

interface NotificationTableProps {
  items: NotificationAdminItem[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  search: string;
  category: string | undefined;
  type: string | undefined;
  pinnedOnly: boolean | undefined;
  onSearchChange: (v: string) => void;
  onCategoryChange: (v: string | undefined) => void;
  onTypeChange: (v: string | undefined) => void;
  onPinnedOnlyChange: (v: boolean | undefined) => void;
  onPageChange: (p: number) => void;
  onEdit: (item: NotificationAdminItem) => void;
  onDelete: (item: NotificationAdminItem) => void;
  onTogglePin: (item: NotificationAdminItem) => void;
  onRefresh: () => void;
}

const CATEGORY_OPTIONS = NOTIFICATION_CATEGORY_VALUES.map((c) => ({
  label: NOTIFICATION_CATEGORY_LABELS[c],
  value: c,
}));

const TYPE_OPTIONS = NOTIFICATION_TYPE_VALUES.map((t) => ({
  label: NOTIFICATION_TYPE_LABELS[t],
  value: t,
}));

const TYPE_COLORS: Record<NotificationType, string> = {
  info: "blue",
  success: "green",
  warning: "orange",
  error: "red",
};

const PRIORITY_COLORS: Record<NotificationPriority, string> = {
  urgent: "red",
  high: "volcano",
  normal: "blue",
  low: "default",
};

export default function NotificationTable({
  items,
  isLoading,
  total,
  page,
  pageSize,
  search,
  category,
  type,
  pinnedOnly,
  onSearchChange,
  onCategoryChange,
  onTypeChange,
  onPinnedOnlyChange,
  onPageChange,
  onEdit,
  onDelete,
  onTogglePin,
  onRefresh,
}: NotificationTableProps) {
  const columns: Column[] = useMemo(
    () => [
      {
        key: "stt",
        title: "STT",
        width: 60,
        align: "center",
        render: (_v, _r, idx) => (
          <span>{(page - 1) * pageSize + (typeof idx === "number" ? idx : 0) + 1}</span>
        ),
      },
      {
        key: "title",
        title: "Tiêu đề",
        render: (_v, record) => {
          const item = record as unknown as NotificationAdminItem;
          return (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <strong style={{ fontSize: 13 }}>{item.title}</strong>
              <span
                style={{
                  fontSize: 12,
                  color: "#666",
                  maxWidth: 360,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={item.message}
              >
                {item.message}
              </span>
            </div>
          );
        },
      },
      {
        key: "type",
        title: "Loại",
        width: 110,
        align: "center",
        render: (_v, record) => {
          const item = record as unknown as NotificationAdminItem;
          const color = TYPE_COLORS[item.type as NotificationType] ?? "default";
          const label = NOTIFICATION_TYPE_LABELS[item.type as NotificationType] ?? item.type;
          return <Tag color={color}>{label}</Tag>;
        },
      },
      {
        key: "category",
        title: "Danh mục",
        width: 130,
        align: "center",
        render: (_v, record) => {
          const item = record as unknown as NotificationAdminItem;
          const label =
            NOTIFICATION_CATEGORY_LABELS[item.category as NotificationCategory] ??
            item.category;
          return <Tag color="geekblue">{label}</Tag>;
        },
      },
      {
        key: "priority",
        title: "Mức",
        width: 110,
        align: "center",
        render: (_v, record) => {
          const item = record as unknown as NotificationAdminItem;
          const color =
            PRIORITY_COLORS[item.priority as NotificationPriority] ?? "default";
          const label =
            NOTIFICATION_PRIORITY_LABELS[item.priority as NotificationPriority] ??
            item.priority;
          return <Tag color={color}>{label}</Tag>;
        },
      },
      {
        key: "isPinned",
        title: "Ghim",
        width: 70,
        align: "center",
        render: (_v, record) => {
          const item = record as unknown as NotificationAdminItem;
          return (
            <Tooltip title={item.isPinned ? "Bỏ ghim" : "Ghim"}>
              <Button
                type="text"
                size="small"
                icon={item.isPinned ? <PushpinFilled /> : <PushpinOutlined />}
                onClick={() => onTogglePin(item)}
              />
            </Tooltip>
          );
        },
      },
      {
        key: "stats",
        title: "Thống kê",
        width: 150,
        align: "center",
        render: (_v, record) => {
          const item = record as unknown as NotificationAdminItem;
          return (
            <div style={{ fontSize: 12, lineHeight: 1.4 }}>
              <div>Người nhận: {item.recipientsCount === 0 ? "Tất cả" : item.recipientsCount}</div>
              <div>Đã đọc: {item.readCount}</div>
            </div>
          );
        },
      },
      {
        key: "createdAt",
        title: "Tạo lúc",
        width: 150,
        render: (_v, record) => {
          const item = record as unknown as NotificationAdminItem;
          return (
            <span style={{ fontSize: 12 }}>
              {new Date(item.createdAt).toLocaleString("vi-VN")}
            </span>
          );
        },
      },
      {
        key: "actions",
        title: "Thao tác",
        width: 130,
        align: "center",
        render: (_v, record) => {
          const item = record as unknown as NotificationAdminItem;
          return (
            <Space size={4}>
              <Tooltip title="Sửa">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(item)}
                />
              </Tooltip>
              <Popconfirm
                title="Xóa thông báo?"
                description="Thông báo sẽ bị vô hiệu hóa (soft delete)."
                onConfirm={() => onDelete(item)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Xóa">
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [onDelete, onEdit, onTogglePin, page, pageSize]
  );

  return (
    <div>
      <Space wrap style={{ marginBottom: 12 }} size={8}>
        <Input.Search
          placeholder="Tìm tiêu đề / nội dung"
          allowClear
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onSearch={(v) => onSearchChange(v)}
          style={{ width: 260 }}
        />
        <Select
          placeholder="Danh mục"
          allowClear
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(v) => onCategoryChange(v)}
          style={{ width: 140 }}
        />
        <Select
          placeholder="Loại"
          allowClear
          options={TYPE_OPTIONS}
          value={type}
          onChange={(v) => onTypeChange(v)}
          style={{ width: 120 }}
        />
        <Select
          placeholder="Ghim"
          allowClear
          options={[
            { label: "Đã ghim", value: true },
            { label: "Chưa ghim", value: false },
          ]}
          value={pinnedOnly}
          onChange={(v) => onPinnedOnlyChange(v)}
          style={{ width: 120 }}
        />
        <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={isLoading}>
          Tải lại
        </Button>
      </Space>
      <DataTable
        columns={columns}
        data={items as unknown as Record<string, unknown>[]}
        loading={isLoading}
        rowKey="id"
        emptyText="Chưa có thông báo nào"
        scroll={{ x: 1100 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (t) => `Tổng: ${t}`,
          onChange: (p) => onPageChange(p),
        }}
      />
    </div>
  );
}

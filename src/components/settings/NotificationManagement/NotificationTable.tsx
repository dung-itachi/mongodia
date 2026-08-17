"use client";

import { useMemo } from "react";
import {
  Button,
  Input,
  App,
  Popconfirm,
  Select,
  Space,
  Tooltip,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PushpinOutlined,
  PushpinFilled,
  ReloadOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
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
import styles from "./notificationManagement.module.css";

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
  statusFilter: string | undefined;
  onSearchChange: (v: string) => void;
  onCategoryChange: (v: string | undefined) => void;
  onTypeChange: (v: string | undefined) => void;
  onPinnedOnlyChange: (v: boolean | undefined) => void;
  onStatusFilterChange: (v: string | undefined) => void;
  onPageChange: (p: number) => void;
  onEdit: (item: NotificationAdminItem) => void;
  onDelete: (item: NotificationAdminItem) => void;
  onTogglePin: (item: NotificationAdminItem) => void;
  onRefresh: () => Promise<unknown>;
}

const CATEGORY_OPTIONS = NOTIFICATION_CATEGORY_VALUES.map((c) => ({
  label: NOTIFICATION_CATEGORY_LABELS[c],
  value: c,
}));

const TYPE_OPTIONS = NOTIFICATION_TYPE_VALUES.map((t) => ({
  label: NOTIFICATION_TYPE_LABELS[t],
  value: t,
}));

const TYPE_ICON_MAP: Record<NotificationType, React.ReactNode> = {
  info: <InfoCircleOutlined />,
  success: <CheckCircleOutlined />,
  warning: <ExclamationCircleOutlined />,
  error: <InfoCircleOutlined />,
};

const TYPE_STYLE_MAP: Record<NotificationType, string> = {
  info: styles.iconInfo,
  success: styles.iconSuccess,
  warning: styles.iconWarning,
  error: styles.iconError,
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `${diffDays} ngày trước`;
  if (diffHours > 0) return `${diffHours} giờ trước`;
  if (diffMins > 0) return `${diffMins} phút trước`;
  return "Vừa xong";
}

function getFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPriorityBadgeClass(priority: string): string {
  switch (priority) {
    case "urgent": return styles.badgeRed;
    case "high": return styles.badgeOrange;
    case "normal": return styles.badgeBlue;
    case "low": return styles.badgeGray;
    default: return styles.badgeGray;
  }
}

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
  statusFilter,
  onSearchChange,
  onCategoryChange,
  onTypeChange,
  onPinnedOnlyChange,
  onStatusFilterChange,
  onPageChange,
  onEdit,
  onDelete,
  onTogglePin,
  onRefresh,
}: NotificationTableProps) {
  const { message } = App.useApp();
  const filteredItems = useMemo(() => items, [items]);

  if (isLoading) {
    return (
      <div className={styles.tableSection}>
        <div className={styles.emptyState}>
          <div style={{ fontSize: 14, color: "#8c8c8c" }}>Đang tải dữ liệu...</div>
        </div>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div>
        <div className={styles.filtersSection}>
          <div className={styles.filtersRow}>
            <Input.Search
              placeholder="Tìm tiêu đề / nội dung..."
              allowClear
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              onSearch={(v) => onSearchChange(v)}
              className={styles.filterSearch}
              enterButton="Tìm"
            />
            <Select
              placeholder="Danh mục"
              allowClear
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={(v) => onCategoryChange(v)}
              className={styles.filterSelect}
            />
            <Select
              placeholder="Loại"
              allowClear
              options={TYPE_OPTIONS}
              value={type}
              onChange={(v) => onTypeChange(v)}
              className={styles.filterSelect}
              style={{ minWidth: 120 }}
            />
            <Select
              placeholder="Trạng thái ghim"
              allowClear
              options={[
                { label: "Đã ghim", value: true },
                { label: "Chưa ghim", value: false },
              ]}
              value={pinnedOnly}
              onChange={(v) => onPinnedOnlyChange(v)}
              className={styles.filterSelect}
            />
            <Select
              placeholder="Trạng thái"
              allowClear
              options={[
                { label: "Tất cả", value: "all" },
                { label: "Hoạt động", value: "active" },
                { label: "Đã tắt", value: "inactive" },
              ]}
              value={statusFilter}
              onChange={(v) => onStatusFilterChange(v)}
              className={styles.filterSelect}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={async () => {
                try {
                  await onRefresh();
                  void message.success("Đã làm mới thông báo thành công");
                } catch {
                  void message.error("Không thể làm mới thông báo");
                }
              }}
              loading={isLoading}
              className={styles.filterButton}
            >
              Tải lại
            </Button>
          </div>
        </div>
        <div className={styles.tableSection}>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔔</div>
            <div className={styles.emptyTitle}>Chưa có thông báo nào</div>
            <div className={styles.emptyMessage}>
              Nhấn "Tạo thông báo" để gửi thông báo đầu tiên
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.filtersSection}>
        <div className={styles.filtersRow}>
          <Input.Search
            placeholder="Tìm tiêu đề / nội dung..."
            allowClear
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onSearch={(v) => onSearchChange(v)}
            className={styles.filterSearch}
            enterButton="Tìm"
          />
          <Select
            placeholder="Danh mục"
            allowClear
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={(v) => onCategoryChange(v)}
            className={styles.filterSelect}
          />
          <Select
            placeholder="Loại"
            allowClear
            options={TYPE_OPTIONS}
            value={type}
            onChange={(v) => onTypeChange(v)}
            className={styles.filterSelect}
            style={{ minWidth: 120 }}
          />
          <Select
            placeholder="Trạng thái ghim"
            allowClear
            options={[
              { label: "Đã ghim", value: true },
              { label: "Chưa ghim", value: false },
            ]}
            value={pinnedOnly}
            onChange={(v) => onPinnedOnlyChange(v)}
            className={styles.filterSelect}
          />
          <Select
            placeholder="Trạng thái"
            allowClear
            options={[
              { label: "Tất cả", value: "all" },
              { label: "Hoạt động", value: "active" },
              { label: "Đã tắt", value: "inactive" },
            ]}
            value={statusFilter}
            onChange={(v) => onStatusFilterChange(v)}
            className={styles.filterSelect}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={async () => {
              try {
                await onRefresh();
                void message.success("Đã làm mới thông báo thành công");
              } catch {
                void message.error("Không thể làm mới thông báo");
              }
            }}
            loading={isLoading}
            className={styles.filterButton}
          >
            Tải lại
          </Button>
        </div>
      </div>

      <div className={styles.tableSection}>
        {filteredItems.map((item) => {
          const notificationType = item.type as NotificationType;
          const notificationPriority = item.priority as NotificationPriority;
          const notificationCategory = item.category as NotificationCategory;

          return (
            <div
              key={item.id}
              className={`${styles.notificationRow} ${item.isPinned ? styles.isPinned : ""} ${!item.isActive ? styles.isInactive : ""}`}
            >
              {/* Left - Icon */}
              <div className={styles.notificationRowLeft}>
                <div
                  className={`${styles.notificationIcon} ${TYPE_STYLE_MAP[notificationType] ?? styles.iconInfo}`}
                >
                  {TYPE_ICON_MAP[notificationType] ?? <BellOutlined />}
                </div>
              </div>

              {/* Main Content */}
              <div className={styles.notificationRowMain}>
                <div className={styles.notificationTitle}>
                  <span>{item.title}</span>
                  {item.isPinned && (
                    <Tooltip title="Đã ghim">
                      <PushpinFilled style={{ color: "#fa8c16", fontSize: 14 }} />
                    </Tooltip>
                  )}
                </div>
                <div className={styles.notificationMessage}>{item.message}</div>
                <div className={styles.notificationMeta}>
                  <span
                    className={`${styles.badge} ${TYPE_STYLE_MAP[notificationType] ?? styles.badgeBlue}`}
                    style={{ fontSize: 10 }}
                  >
                    {NOTIFICATION_TYPE_LABELS[notificationType] ?? item.type}
                  </span>
                  <span className={`${styles.badge} ${styles.badgePurple}`} style={{ fontSize: 10 }}>
                    {NOTIFICATION_CATEGORY_LABELS[notificationCategory] ?? item.category}
                  </span>
                  <span
                    className={`${styles.badge} ${getPriorityBadgeClass(item.priority)}`}
                    style={{ fontSize: 10 }}
                  >
                    {NOTIFICATION_PRIORITY_LABELS[notificationPriority] ?? item.priority}
                  </span>
                  <span
                    className={`${styles.badge} ${item.isActive ? styles.badgeGreen : styles.badgeGray}`}
                    style={{ fontSize: 10 }}
                  >
                    {item.isActive ? "Hoạt động" : "Đã tắt"}
                  </span>
                </div>
              </div>

              {/* Right - Stats & Actions */}
              <div className={styles.notificationRowRight}>
                <Tooltip
                  title={
                    <span>
                      <strong>Đã gửi:</strong> {getFullDate(item.createdAt)}
                      <br />
                      <strong>Thời gian:</strong> {getRelativeTime(item.createdAt)}
                    </span>
                  }
                >
                  <div className={styles.notificationTime}>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    {formatDate(item.createdAt)}
                    <span style={{ fontSize: 10, color: "#8c8c8c", marginLeft: 4 }}>
                      ({getRelativeTime(item.createdAt)})
                    </span>
                  </div>
                </Tooltip>

                <div className={styles.notificationStats}>
                  <Tooltip title="Người nhận">
                    <span className={styles.statItem}>
                      <BellOutlined />
                      {item.recipientsCount === 0 ? "Tất cả" : item.recipientsCount}
                    </span>
                  </Tooltip>
                  <Tooltip title="Đã đọc">
                    <span className={styles.statItem}>
                      <CheckCircleOutlined />
                      {item.readCount}
                    </span>
                  </Tooltip>
                </div>

                <div className={styles.notificationActions}>
                  <Tooltip title={item.isPinned ? "Bỏ ghim" : "Ghim"}>
                    <Button
                      type="text"
                      size="small"
                      icon={item.isPinned ? <PushpinFilled /> : <PushpinOutlined />}
                      onClick={() => onTogglePin(item)}
                      style={{ color: item.isPinned ? "#fa8c16" : "#8c8c8c" }}
                    />
                  </Tooltip>
                  <Tooltip title="Sửa">
                    <Button
                      type="text"
                      size="small"
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
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Tooltip>
                  </Popconfirm>
                </div>
              </div>
            </div>
          );
        })}

        {/* Pagination */}
        <div className={styles.paginationRow}>
          <div className={styles.paginationInfo}>
            Hiển thị {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} của {total} thông báo
          </div>
          <Space>
            <Button
              size="small"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
            >
              Trước
            </Button>
            <span style={{ fontSize: 12, color: "#666" }}>
              Trang {page} / {Math.ceil(total / pageSize) || 1}
            </span>
            <Button
              size="small"
              disabled={page * pageSize >= total}
              onClick={() => onPageChange(page + 1)}
            >
              Sau
            </Button>
          </Space>
        </div>
      </div>
    </div>
  );
}

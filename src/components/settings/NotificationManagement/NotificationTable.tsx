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
import { useLanguageStore } from "@/store/language.store";
import type { Language } from "@/store/language.store";
import { t } from "@/lib/i18n";
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

function getRelativeTime(dateStr: string, lang: Language): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `${diffDays} ${t("ngày trước", lang)}`;
  if (diffHours > 0) return `${diffHours} ${t("giờ trước", lang)}`;
  if (diffMins > 0) return `${diffMins} ${t("phút trước", lang)}`;
  return t("Vừa xong", lang);
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
  const lang = useLanguageStore((s) => s.language);
  const { message } = App.useApp();
  const filteredItems = useMemo(() => items, [items]);

  const CATEGORY_OPTIONS = useMemo(
    () =>
      NOTIFICATION_CATEGORY_VALUES.map((c) => ({
        label: t(NOTIFICATION_CATEGORY_LABELS[c], lang),
        value: c,
      })),
    [lang]
  );

  const TYPE_OPTIONS = useMemo(
    () =>
      NOTIFICATION_TYPE_VALUES.map((typeVal) => ({
        label: t(NOTIFICATION_TYPE_LABELS[typeVal], lang),
        value: typeVal,
      })),
    [lang]
  );

  const renderFilters = () => (
    <div className={styles.filtersSection}>
      <div className={styles.filtersRow}>
        <Input.Search
          placeholder={t("Tìm tiêu đề / nội dung...", lang)}
          allowClear
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onSearch={(v) => onSearchChange(v)}
          className={styles.filterSearch}
          enterButton={t("Tìm", lang)}
        />
        <Select
          placeholder={t("Danh mục", lang)}
          allowClear
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(v) => onCategoryChange(v)}
          className={styles.filterSelect}
        />
        <Select
          placeholder={t("Loại", lang)}
          allowClear
          options={TYPE_OPTIONS}
          value={type}
          onChange={(v) => onTypeChange(v)}
          className={styles.filterSelect}
          style={{ minWidth: 120 }}
        />
        <Select
          placeholder={t("Trạng thái ghim", lang)}
          allowClear
          options={[
            { label: t("Đã ghim", lang), value: true },
            { label: t("Chưa ghim", lang), value: false },
          ]}
          value={pinnedOnly}
          onChange={(v) => onPinnedOnlyChange(v)}
          className={styles.filterSelect}
        />
        <Select
          placeholder={t("Trạng thái", lang)}
          allowClear
          options={[
            { label: t("Tất cả", lang), value: "all" },
            { label: t("Hoạt động", lang), value: "active" },
            { label: t("Đã tắt", lang), value: "inactive" },
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
              void message.success(t("Đã làm mới thông báo thành công", lang));
            } catch {
              void message.error(t("Không thể làm mới thông báo", lang));
            }
          }}
          loading={isLoading}
          className={styles.filterButton}
        >
          {t("Tải lại", lang)}
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className={styles.tableSection}>
        <div className={styles.emptyState}>
          <div style={{ fontSize: 14, color: "#8c8c8c" }}>{t("Đang tải dữ liệu...", lang)}</div>
        </div>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div>
        {renderFilters()}
        <div className={styles.tableSection}>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔔</div>
            <div className={styles.emptyTitle}>{t("Chưa có thông báo nào", lang)}</div>
            <div className={styles.emptyMessage}>
              {t("Nhấn", lang)} "{t("Tạo thông báo", lang)}" {t("để gửi thông báo đầu tiên", lang)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {renderFilters()}

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
                    <Tooltip title={t("Đã ghim", lang)}>
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
                    {t(NOTIFICATION_TYPE_LABELS[notificationType] ?? item.type, lang)}
                  </span>
                  <span className={`${styles.badge} ${styles.badgePurple}`} style={{ fontSize: 10 }}>
                    {t(NOTIFICATION_CATEGORY_LABELS[notificationCategory] ?? item.category, lang)}
                  </span>
                  <span
                    className={`${styles.badge} ${getPriorityBadgeClass(item.priority)}`}
                    style={{ fontSize: 10 }}
                  >
                    {t(NOTIFICATION_PRIORITY_LABELS[notificationPriority] ?? item.priority, lang)}
                  </span>
                  <span
                    className={`${styles.badge} ${item.isActive ? styles.badgeGreen : styles.badgeGray}`}
                    style={{ fontSize: 10 }}
                  >
                    {item.isActive ? t("Hoạt động", lang) : t("Đã tắt", lang)}
                  </span>
                </div>
              </div>

              {/* Right - Stats & Actions */}
              <div className={styles.notificationRowRight}>
                <Tooltip
                  title={
                    <span>
                      <strong>{t("Đã gửi", lang)}:</strong> {getFullDate(item.createdAt)}
                      <br />
                      <strong>{t("Thời gian", lang)}:</strong> {getRelativeTime(item.createdAt, lang)}
                    </span>
                  }
                >
                  <div className={styles.notificationTime}>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    {formatDate(item.createdAt)}
                    <span style={{ fontSize: 10, color: "#8c8c8c", marginLeft: 4 }}>
                      ({getRelativeTime(item.createdAt, lang)})
                    </span>
                  </div>
                </Tooltip>

                <div className={styles.notificationStats}>
                  <Tooltip title={t("Người nhận", lang)}>
                    <span className={styles.statItem}>
                      <BellOutlined />
                      {item.recipientsCount === 0 ? t("Tất cả", lang) : item.recipientsCount}
                    </span>
                  </Tooltip>
                  <Tooltip title={t("Đã đọc", lang)}>
                    <span className={styles.statItem}>
                      <CheckCircleOutlined />
                      {item.readCount}
                    </span>
                  </Tooltip>
                </div>

                <div className={styles.notificationActions}>
                  <Tooltip title={item.isPinned ? t("Bỏ ghim", lang) : t("Ghim", lang)}>
                    <Button
                      type="text"
                      size="small"
                      icon={item.isPinned ? <PushpinFilled /> : <PushpinOutlined />}
                      onClick={() => onTogglePin(item)}
                      style={{ color: item.isPinned ? "#fa8c16" : "#8c8c8c" }}
                    />
                  </Tooltip>
                  <Tooltip title={t("Sửa", lang)}>
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => onEdit(item)}
                    />
                  </Tooltip>
                  <Popconfirm
                    title={t("Xóa thông báo?", lang)}
                    description={t("Thông báo sẽ bị vô hiệu hóa (soft delete).", lang)}
                    onConfirm={() => onDelete(item)}
                    okText={t("Xóa", lang)}
                    cancelText={t("Hủy", lang)}
                    okButtonProps={{ danger: true }}
                  >
                    <Tooltip title={t("Xóa", lang)}>
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
            {t("Hiển thị", lang)} {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} {t("của", lang)} {total} {t("thông báo", lang)}
          </div>
          <Space>
            <Button
              size="small"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
            >
              {t("Trước", lang)}
            </Button>
            <span style={{ fontSize: 12, color: "#666" }}>
              {t("Trang", lang)} {page} / {Math.ceil(total / pageSize) || 1}
            </span>
            <Button
              size="small"
              disabled={page * pageSize >= total}
              onClick={() => onPageChange(page + 1)}
            >
              {t("Sau", lang)}
            </Button>
          </Space>
        </div>
      </div>
    </div>
  );
}
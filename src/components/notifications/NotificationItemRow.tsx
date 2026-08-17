"use client";

import { memo, useState } from "react";
import { Modal, Tag, Divider } from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  FolderOutlined,
  AlertOutlined,
} from "@ant-design/icons";

import "./notification.css";
import type { NotificationItem } from "@/types/notification";
import { formatRelativeTime } from "./formatRelativeTime";
import {
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_PRIORITY_LABELS,
  NOTIFICATION_TYPE_VALUES,
  NOTIFICATION_CATEGORY_VALUES,
  NOTIFICATION_PRIORITY_VALUES,
} from "@/constants/notification";
import type { NotificationType, NotificationCategory, NotificationPriority } from "@/constants/notification";

type Variant = "popup" | "page";

type NotificationItemRowProps = {
  item: NotificationItem;
  variant: Variant;
  onClick: (item: NotificationItem) => void;
};

const TYPE_COLOR: Record<NotificationItem["type"], string> = {
  info: "#1677ff",
  success: "#52c41a",
  warning: "#faad14",
  error: "#ff4d4f",
};

const TYPE_GLYPH: Record<NotificationItem["type"], string> = {
  info: "i",
  success: "\u2713",
  warning: "!",
  error: "\u2715",
};

const TYPE_TAG_COLOR: Record<NotificationType, string> = {
  info: "blue",
  success: "green",
  warning: "orange",
  error: "red",
};

const PRIORITY_TAG_COLOR: Record<NotificationPriority, string> = {
  urgent: "red",
  high: "volcano",
  normal: "blue",
  low: "default",
};

function formatFullDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function NotificationItemRowInner({ item, variant, onClick }: NotificationItemRowProps) {
  const color = TYPE_COLOR[item.type];
  const className = variant === "popup" ? "nb-item" : "np-item";
  const iconClass = variant === "popup" ? "nb-item-icon" : "np-item-icon";
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = () => {
    if (variant === "page") {
      setModalOpen(true);
    }
    onClick(item);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const typeLabel =
    NOTIFICATION_TYPE_LABELS[item.type as NotificationType] ??
    NOTIFICATION_TYPE_VALUES.includes(item.type as NotificationType)
      ? item.type
      : "info";
  const categoryLabel =
    NOTIFICATION_CATEGORY_LABELS[item.category as NotificationCategory] ??
    NOTIFICATION_CATEGORY_VALUES.includes(item.category as NotificationCategory)
      ? item.category
      : "general";
  const priorityLabel =
    NOTIFICATION_PRIORITY_LABELS[item.priority as NotificationPriority] ??
    NOTIFICATION_PRIORITY_VALUES.includes(item.priority as NotificationPriority)
      ? item.priority
      : "normal";

  return (
    <>
      <div
        className={`${className}${item.read ? "" : " is-unread"}`}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKey}
        aria-label={`${item.title} - ${item.message}`}
      >
        <div
          className={iconClass}
          style={{ backgroundColor: `${color}1a`, color }}
          aria-hidden="true"
        >
          {TYPE_GLYPH[item.type]}
        </div>
        <div className={variant === "popup" ? "nb-item-body" : "np-item-body"}>
          <div className={variant === "popup" ? "nb-item-title" : "np-item-title"}>
            <span>{item.title}</span>
            <span className={variant === "popup" ? "nb-item-time" : "np-item-time"}>
              {formatRelativeTime(item.createdAt)}
            </span>
          </div>
          <div className={variant === "popup" ? "nb-item-message" : "np-item-message"}>
            {item.message}
          </div>
          {variant === "page" && item.link && (
            <div className="np-item-link">Mở liên kết →</div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        title={
          <span style={{ fontSize: 15 }}>
            <span
              style={{
                display: "inline-block",
                width: 24,
                height: 24,
                borderRadius: "50%",
                backgroundColor: `${color}1a`,
                color,
                textAlign: "center",
                lineHeight: "24px",
                marginRight: 8,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {TYPE_GLYPH[item.type]}
            </span>
            {item.title}
          </span>
        }
        width={560}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Sender */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <UserOutlined style={{ color: "#8c8c8c", marginTop: 3, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 2 }}>Người gửi</div>
              <div style={{ fontSize: 14 }}>{item.senderName}</div>
            </div>
          </div>

          <Divider style={{ margin: "4px 0" }} />

          {/* Datetime */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <CalendarOutlined style={{ color: "#8c8c8c", marginTop: 3, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 2 }}>Ngày giờ gửi</div>
              <div style={{ fontSize: 14 }}>{formatFullDateTime(item.createdAt)}</div>
              {item.readAt && (
                <div style={{ fontSize: 12, color: "#52c41a", marginTop: 2 }}>
                  Đã đọc lúc: {formatFullDateTime(item.readAt)}
                </div>
              )}
            </div>
          </div>

          <Divider style={{ margin: "4px 0" }} />

          {/* Type + Category */}
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <AlertOutlined style={{ color: "#8c8c8c", marginTop: 3, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 2 }}>Loại</div>
                <Tag color={TYPE_TAG_COLOR[item.type as NotificationType] ?? "default"}>
                  {typeLabel}
                </Tag>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <FolderOutlined style={{ color: "#8c8c8c", marginTop: 3, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 2 }}>Danh mục</div>
                <Tag color="geekblue">{categoryLabel}</Tag>
              </div>
            </div>
          </div>

          {/* Priority */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 16 }} />
            <div>
              <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 2 }}>Mức ưu tiên</div>
              <Tag color={PRIORITY_TAG_COLOR[item.priority as NotificationPriority] ?? "default"}>
                {priorityLabel}
              </Tag>
            </div>
          </div>

          <Divider style={{ margin: "4px 0" }} />

          {/* Message */}
          <div>
            <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>Nội dung</div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                backgroundColor: "#f5f5f5",
                padding: "10px 12px",
                borderRadius: 6,
                whiteSpace: "pre-wrap",
              }}
            >
              {item.message}
            </div>
          </div>

          {/* Link */}
          {item.link && (
            <div>
              <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>Liên kết</div>
              <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14 }}>
                {item.link}
              </a>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

const NotificationItemRow = memo(NotificationItemRowInner);
export default NotificationItemRow;
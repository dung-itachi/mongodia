"use client";

import { memo } from "react";

import "./notification.css";
import type { NotificationItem } from "@/types/notification";
import { formatRelativeTime } from "./formatRelativeTime";

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
  success: "✓",
  warning: "!",
  error: "✕",
};

function NotificationItemRowInner({ item, variant, onClick }: NotificationItemRowProps) {
  const color = TYPE_COLOR[item.type];
  const className =
    variant === "popup" ? "nb-item" : "np-item";
  const iconClass = variant === "popup" ? "nb-item-icon" : "np-item-icon";

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(item);
    }
  };

  return (
    <div
      className={`${className}${item.read ? "" : " is-unread"}`}
      role="button"
      tabIndex={0}
      onClick={() => onClick(item)}
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
  );
}

const NotificationItemRow = memo(NotificationItemRowInner);
export default NotificationItemRow;

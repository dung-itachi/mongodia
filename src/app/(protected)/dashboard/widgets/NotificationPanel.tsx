/**
 * NotificationPanel Widget (Sprint 4.4 — Dashboard Polish)
 *
 * Displays the 5 most recent notifications with icon, color and time.
 * Memoized to avoid re-render when other widgets change.
 * Uses CardSection from UI Kit and CSS module for layout.
 */

import { memo } from "react";
import { CardSection } from "@/components/common";
import type { NotificationItem } from "@/types/dashboard-activity";
import { formatRelativeTime } from "@/lib/format";
import styles from "../dashboard.module.css";

export type NotificationPanelProps = {
  data: NotificationItem[];
};

const TYPE_COLOR: Record<NotificationItem["type"], string> = {
  info: "#1890ff",
  success: "#52c41a",
  warning: "#fa8c16",
  error: "#ff4d4f",
};

const TYPE_GLYPH: Record<NotificationItem["type"], string> = {
  info: "i",
  success: "✓",
  warning: "!",
  error: "×",
};

const TYPE_LABEL: Record<NotificationItem["type"], string> = {
  info: "Thông tin",
  success: "Thành công",
  warning: "Cảnh báo",
  error: "Lỗi",
};

function NotificationPanelInner({ data }: NotificationPanelProps) {
  return (
    <CardSection title="Thông báo">
      <div className={styles["d4-stack"]} role="list" aria-label="Danh sách thông báo">
        {data.map((item) => {
          const color = TYPE_COLOR[item.type];
          return (
            <div
              key={item.id}
              role="listitem"
              className={styles["d4-notif"]}
              aria-label={`${TYPE_LABEL[item.type]}: ${item.title}`}
            >
              <div
                className={styles["d4-notif-icon"]}
                style={{ backgroundColor: `${color}1a`, color }}
              >
                {TYPE_GLYPH[item.type]}
              </div>
              <div className={styles["d4-notif-body"]}>
                <div className={styles["d4-notif-head"]}>
                  <span className={styles["d4-notif-title"]}>{item.title}</span>
                  <span className={styles["d4-notif-time"]}>
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
                <span className={styles["d4-notif-msg"]}>{item.message}</span>
              </div>
            </div>
          );
        })}
      </div>
    </CardSection>
  );
}

const NotificationPanel = memo(NotificationPanelInner);
export default NotificationPanel;
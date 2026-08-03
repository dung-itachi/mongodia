/**
 * NotificationPanel Widget (Sprint 4.3 - Dashboard Activity & Quick Actions)
 *
 * Displays the 5 most recent notifications with icon, color and time.
 * Uses CardSection from UI Kit.
 */

import { CardSection } from "@/components/common";
import type { NotificationItem } from "@/types/dashboard-activity";
import { formatRelativeTime } from "@/lib/format";

export type NotificationPanelProps = {
  data: NotificationItem[];
};

const TYPE_COLORS: Record<NotificationItem["type"], string> = {
  info: "#1890ff",
  success: "#52c41a",
  warning: "#fa8c16",
  error: "#ff4d4f",
};

const TYPE_LABELS: Record<NotificationItem["type"], string> = {
  info: "i",
  success: "✓",
  warning: "!",
  error: "×",
};

export default function NotificationPanel({ data }: NotificationPanelProps) {
  return (
    <CardSection title="Thông báo">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {data.map((item) => {
          const color = TYPE_COLORS[item.type];
          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: `${color}1a`,
                  color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {TYPE_LABELS[item.type]}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#262626",
                    }}
                  >
                    {item.title}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "#8c8c8c",
                      flexShrink: 0,
                    }}
                  >
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: "#595959",
                  }}
                >
                  {item.message}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </CardSection>
  );
}
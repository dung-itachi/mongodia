/**
 * Toast helper for incoming notifications.
 *
 * Uses `react-toastify` (already in package.json). Rendered-once container
 * is mounted by NotificationProvider so we don't double-render it here.
 *
 * Click semantics:
 *   - The toast stays open for 6s.
 *   - Clicking the toast either navigates to `notification.link` (if any)
 *     or no-op. We don't mark-read from the toast — that's handled by
 *     the bell dropdown / notifications page click path.
 */

"use client";

import { toast } from "react-toastify";

import type { NotificationItem } from "@/types/notification";

const TYPE_ICON: Record<NotificationItem["type"], string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✕",
};

export function showNotificationToast(
  notification: NotificationItem,
  onClick?: () => void
) {
  // De-dupe: if the same id is already on-screen, skip the new toast.
  const id = `notif-${notification.id}`;

  toast(
    ({ closeToast }) => (
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          onClick?.();
          closeToast();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.();
            closeToast();
          }
        }}
        style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
      >
        <span style={{ fontSize: 18, lineHeight: 1.2 }}>
          {TYPE_ICON[notification.type] ?? "ℹ"}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
            {notification.title}
          </div>
          <div style={{ fontSize: 12, color: "#595959" }}>
            {notification.message}
          </div>
        </div>
      </div>
    ),
    {
      toastId: id,
      type: notification.type === "error" ? "error" : notification.type,
      autoClose: 6000,
      closeOnClick: false,
      pauseOnHover: true,
    }
  );
}

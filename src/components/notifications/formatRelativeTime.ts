/**
 * Pure relative-time formatter for notifications.
 *
 * Mirrors the behaviour of `src/lib/format.ts` `formatRelativeTime` from
 * the dashboard widgets so users see consistent timestamps across the
 * app. We avoid pulling that helper here because we'd rather not couple
 * this lightweight component to its `dashboard-activity.ts` types.
 */

export function formatRelativeTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const ms = Date.now() - date.getTime();
  if (Number.isNaN(ms)) return "";

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return "Vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

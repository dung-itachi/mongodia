/**
 * Notification enums — constants only, safe for client bundle.
 *
 * Tách riêng khỏi `src/models/Notification.ts` để client components có
 * thể import các bảng enum mà không kéo theo mongoose (chỉ chạy được
 * trên server).
 *
 * Mỗi enum gồm:
 *   - value: code lưu trong DB (lowercase, snake-ish)
 *   - label: tiếng Việt hiển thị trên UI
 */

export const NotificationType = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationCategory = {
  ORDER: "order",
  LEAD: "lead",
  INVENTORY: "inventory",
  SYSTEM: "system",
  ASSIGNMENT: "assignment",
  REPORT: "report",
  GENERAL: "general",
} as const;
export type NotificationCategory =
  (typeof NotificationCategory)[keyof typeof NotificationCategory];

export const NotificationPriority = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
} as const;
export type NotificationPriority =
  (typeof NotificationPriority)[keyof typeof NotificationPriority];

/**
 * Nhãn tiếng Việt cho UI. Key trùng với value của enum tương ứng.
 * Component form/table sẽ dùng các map này để hiển thị label Việt,
 * trong khi vẫn gửi `value` lên API.
 */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  info: "Thông tin",
  success: "Thành công",
  warning: "Cảnh báo",
  error: "Lỗi",
};

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  order: "Đơn hàng",
  lead: "Khách tiềm năng",
  inventory: "Tồn kho",
  system: "Hệ thống",
  assignment: "Phân công",
  report: "Báo cáo",
  general: "Chung",
};

export const NOTIFICATION_PRIORITY_LABELS: Record<NotificationPriority, string> = {
  low: "Thấp",
  normal: "Bình thường",
  high: "Cao",
  urgent: "Khẩn cấp",
};

export const NOTIFICATION_TYPE_VALUES: readonly NotificationType[] =
  Object.values(NotificationType);
export const NOTIFICATION_CATEGORY_VALUES: readonly NotificationCategory[] =
  Object.values(NotificationCategory);
export const NOTIFICATION_PRIORITY_VALUES: readonly NotificationPriority[] =
  Object.values(NotificationPriority);

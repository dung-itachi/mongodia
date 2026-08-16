/**
 * Trang Quản lý Thông báo — Phase 10 follow-up.
 *
 * Route: /settings/notifications
 *
 * Permission: notification.manage (Admin/Manager only).
 *
 * Tính năng: tạo / sửa / ghim / xóa (soft delete) thông báo.
 * Soft delete giữ lại lịch sử readBy/recipients, nhưng ẩn khỏi danh sách
 * của user.
 */
import NotificationManagementPage from "@/components/settings/NotificationManagement/NotificationManagementPage";

export default function NotificationManagementRoutePage() {
  return <NotificationManagementPage />;
}

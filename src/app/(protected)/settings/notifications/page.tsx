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
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";


export default function NotificationManagementRoutePage() {
  const lang = useLanguageStore((s) => s.language);
  return <NotificationManagementPage />;
}

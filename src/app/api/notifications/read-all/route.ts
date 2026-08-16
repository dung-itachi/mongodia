/**
 * POST /api/notifications/read-all
 *
 * Marks every visible notification as read for the current user. Returns
 * the count of new read-rows inserted (i.e. the number of items that
 * transitioned from unread -> read).
 */

import { getCurrentUser } from "@/lib/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth";
import { success, error as errorResponse } from "@/utils/response";
import {
  markAllRead,
  NotificationServiceError,
} from "@/services/notification.service";
import { pushSnapshot } from "@/lib/notificationBus";
import { unreadCount } from "@/services/notification.service";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("notification.readAll")) {
      return errorResponse("Bạn không có quyền đánh dấu tất cả đã đọc", 403);
    }

    const employeeId = currentUser.employee._id.toString();
    const result = await markAllRead(employeeId);

    try {
      const count = await unreadCount(employeeId);
      pushSnapshot(employeeId, count);
    } catch {
      // best-effort
    }

    return success(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return errorResponse("Chưa đăng nhập", 401);
    }
    if (err instanceof ForbiddenError) {
      return errorResponse("Không có quyền truy cập", 403);
    }
    if (err instanceof NotificationServiceError) {
      return errorResponse(err.message, err.status);
    }
    console.error("Mark all read API error:", err);
    return errorResponse("Không thể đánh dấu tất cả đã đọc", 500);
  }
}

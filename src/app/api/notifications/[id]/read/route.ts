/**
 * PATCH /api/notifications/[id]/read
 *
 * Marks a single notification as read for the current user. Idempotent:
 * calling it twice does not change the `readAt` timestamp.
 */

import { Types } from "mongoose";

import { getCurrentUser } from "@/lib/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth";
import { success, error as errorResponse } from "@/utils/response";
import {
  markRead,
  NotificationServiceError,
} from "@/services/notification.service";
import { pushSnapshot } from "@/lib/notificationBus";
import { unreadCount } from "@/services/notification.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("notification.read")) {
      return errorResponse("Bạn không có quyền đánh dấu đã đọc", 403);
    }

    const { id } = await context.params;
    if (!id || !Types.ObjectId.isValid(id)) {
      return errorResponse("Notification ID không hợp lệ", 400);
    }

    const employeeId = currentUser.employee._id.toString();
    const result = await markRead(employeeId, id);

    // Notify the SSE bus so other tabs/devices update their badge.
    try {
      const count = await unreadCount(employeeId);
      pushSnapshot(employeeId, count);
    } catch {
      // Snapshot push is best-effort — failure shouldn't fail the read.
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
    console.error("Mark notification read API error:", err);
    return errorResponse("Không thể đánh dấu đã đọc", 500);
  }
}

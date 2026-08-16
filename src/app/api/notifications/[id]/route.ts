/**
 * PATCH /api/notifications/[id]
 *
 * Admin update — chỉnh sửa notification. Permission: notification.manage.
 *
 * Body fields are all optional; chỉ những field có mặt được cập nhật.
 */
import { getCurrentUser } from "@/lib/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth";
import { success, error as errorResponse } from "@/utils/response";
import {
  updateOne,
  togglePin,
  NotificationServiceError,
} from "@/services/notification.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("notification.manage")) {
      return errorResponse("Bạn không có quyền chỉnh sửa thông báo", 403);
    }

    const { id } = await context.params;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return errorResponse("Body JSON không hợp lệ", 400);
    }

    // Specialised toggle for pin (UX-friendly single-action endpoint)
    if (
      Object.keys(body).length === 1 &&
      typeof body.isPinned === "boolean"
    ) {
      const result = await togglePin(id, body.isPinned);
      return success(result);
    }

    const result = await updateOne(id, {
      title: typeof body.title === "string" ? body.title : undefined,
      message: typeof body.message === "string" ? body.message : undefined,
      type: typeof body.type === "string" ? body.type : undefined,
      category: typeof body.category === "string" ? body.category : undefined,
      priority: typeof body.priority === "string" ? body.priority : undefined,
      isPinned:
        typeof body.isPinned === "boolean" ? body.isPinned : undefined,
      isActive:
        typeof body.isActive === "boolean" ? body.isActive : undefined,
      link: typeof body.link === "string" ? body.link : undefined,
      recipientIds: Array.isArray(body.recipientIds)
        ? (body.recipientIds as unknown[]).filter(
            (x): x is string => typeof x === "string"
          )
        : undefined,
      broadcast: typeof body.broadcast === "boolean" ? body.broadcast : undefined,
    });

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
    console.error("Update notification API error:", err);
    return errorResponse("Không thể cập nhật thông báo", 500);
  }
}

/**
 * DELETE /api/notifications/[id]
 *
 * Soft delete — set `isActive = false`. Notification vẫn còn trong DB để
 * giữ lịch sử readBy/recipients, nhưng không còn hiển thị.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("notification.manage")) {
      return errorResponse("Bạn không có quyền xóa thông báo", 403);
    }

    const { id } = await context.params;
    const { softDelete } = await import("@/services/notification.service");
    const result = await softDelete(id);
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
    console.error("Delete notification API error:", err);
    return errorResponse("Không thể xóa thông báo", 500);
  }
}

/**
 * GET /api/notifications
 *
 * Cursor-based paginated list of notifications visible to the current user.
 * Each item is decorated with `read` / `readAt` derived from the
 * NotificationRead subcollection.
 *
 * Query params:
 *   - cursor:    pagination cursor (opaque string from previous page)
 *   - limit:     1..50, default 20
 *   - onlyUnread: "true" to filter out already-read items
 */

import { getCurrentUser } from "@/lib/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth";
import { success, error as errorResponse } from "@/utils/response";
import {
  listForUser,
  listAllForAdmin,
  createOne,
  NotificationServiceError,
} from "@/services/notification.service";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("notification.view")) {
      return errorResponse("Bạn không có quyền xem thông báo", 403);
    }

    const { searchParams } = new URL(request.url);

    // Admin mode: ?admin=true → list all notifications with paging.
    if (searchParams.get("admin") === "true") {
      if (!currentUser.permissions.includes("notification.manage")) {
        return errorResponse(
          "Bạn không có quyền quản lý thông báo",
          403
        );
      }
      const page = parseInt(searchParams.get("page") ?? "1", 10);
      const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);
      const result = await listAllForAdmin({
        search: searchParams.get("search") ?? undefined,
        category: searchParams.get("category") ?? undefined,
        type: searchParams.get("type") ?? undefined,
        isPinned:
          searchParams.get("isPinned") === "true"
            ? true
            : searchParams.get("isPinned") === "false"
              ? false
              : undefined,
        page: Number.isFinite(page) ? page : 1,
        pageSize: Number.isFinite(pageSize) ? pageSize : 20,
      });
      return success(result);
    }

    const cursor = searchParams.get("cursor");
    const limitRaw = searchParams.get("limit");
    const onlyUnreadRaw = searchParams.get("onlyUnread");

    const limit = limitRaw ? parseInt(limitRaw, 10) : 20;
    const onlyUnread = onlyUnreadRaw === "true";

    const page = await listForUser(currentUser.employee._id.toString(), {
      cursor: cursor || null,
      limit: Number.isFinite(limit) ? limit : 20,
      onlyUnread,
    });

    return success(page);
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
    console.error("Notifications list API error:", err);
    return errorResponse("Không thể lấy danh sách thông báo", 500);
  }
}

/**
 * POST /api/notifications — Admin create.
 *
 * Body:
 *   - title: required string
 *   - message: required string
 *   - type / category / priority: optional (defaults)
 *   - isPinned: optional boolean
 *   - link: optional string
 *   - recipientIds: optional string[] (employee _id)
 *   - broadcast: optional boolean (true → recipients = [] = everyone)
 *
 * Permission: notification.manage
 */
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("notification.manage")) {
      return errorResponse("Bạn không có quyền tạo thông báo", 403);
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return errorResponse("Body JSON không hợp lệ", 400);
    }

    const title = typeof body.title === "string" ? body.title : "";
    const message = typeof body.message === "string" ? body.message : "";

    if (!title.trim() || !message.trim()) {
      return errorResponse("Thiếu title hoặc message", 400);
    }

    const result = await createOne({
      title,
      message,
      senderId: currentUser.employee._id.toString(),
      type:
        typeof body.type === "string" ? body.type : undefined,
      category:
        typeof body.category === "string" ? body.category : undefined,
      priority:
        typeof body.priority === "string" ? body.priority : undefined,
      isPinned: typeof body.isPinned === "boolean" ? body.isPinned : undefined,
      link: typeof body.link === "string" ? body.link : null,
      recipientIds: Array.isArray(body.recipientIds)
        ? (body.recipientIds as unknown[]).filter(
            (x): x is string => typeof x === "string"
          )
        : undefined,
      broadcast: typeof body.broadcast === "boolean" ? body.broadcast : false,
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
    console.error("Create notification API error:", err);
    return errorResponse("Không thể tạo thông báo", 500);
  }
}

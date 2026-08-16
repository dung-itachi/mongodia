/**
 * GET /api/notifications/unread-count
 *
 * Lightweight endpoint used by the SSE fallback / reconnect path. The
 * NotificationProvider reads this once on mount and never on a timer.
 * Subsequent updates are pushed via SSE.
 *
 * Tiny in-memory cache (5s) avoids hammering MongoDB when SSE keeps
 * flapping in local dev or behind a load balancer.
 */

import { getCurrentUser } from "@/lib/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth";
import { success, error as errorResponse } from "@/utils/response";
import { unreadCount } from "@/services/notification.service";
import { NotificationServiceError } from "@/services/notification.service";

const CACHE_TTL_MS = 5_000;
const cache = new Map<string, { count: number; expiresAt: number }>();

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("notification.view")) {
      return errorResponse("Bạn không có quyền xem thông báo", 403);
    }

    const employeeId = currentUser.employee._id.toString();
    const cached = cache.get(employeeId);
    if (cached && cached.expiresAt > Date.now()) {
      return success({ count: cached.count });
    }

    const count = await unreadCount(employeeId);
    cache.set(employeeId, { count, expiresAt: Date.now() + CACHE_TTL_MS });
    return success({ count });
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
    console.error("Unread count API error:", err);
    return errorResponse("Không thể lấy số thông báo chưa đọc", 500);
  }
}

/**
 * Test helper — call after a write to the underlying data so the next
 * read returns a fresh value. Not used in production code paths.
 */
export function _invalidateUnreadCountCache(): void {
  cache.clear();
}

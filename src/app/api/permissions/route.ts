/**
 * GET /api/permissions
 *
 * Phase 9 — Returns the full permission catalog grouped by module,
 * derived from `constants/permissions.ts` + `MODULE_MAP` in
 * `db/seeds/permissions.seed.ts`.
 *
 * Authorization:
 *   - Requires `role.permission.manage` (RBAC management).
 *   - Non-ADMIN viewers (i.e. anyone without wildcard) MUST have
 *     the code explicitly.
 */

import { getCurrentUser } from "@/lib/auth";
import { getPermissionsGroupedByModule } from "@/lib/permission-modules";
import { success, error as errorResponse } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    const hasAccess =
      currentUser.permissions.includes("*") ||
      currentUser.permissions.includes("role.permission.manage");

    if (!hasAccess) {
      return errorResponse("Bạn không có quyền quản lý phân quyền", 403);
    }

    const groups = getPermissionsGroupedByModule();
    return success({
      groups,
      total: groups.reduce((sum, g) => sum + g.permissions.length, 0),
    });
  } catch (err) {
    console.error("Get Permissions Error:", err);
    return errorResponse("Không thể lấy danh sách permission", 500);
  }
}

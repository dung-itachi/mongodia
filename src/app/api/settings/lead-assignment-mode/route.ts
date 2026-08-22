/**
 * GET /api/settings/lead-assignment-mode
 * PUT /api/settings/lead-assignment-mode
 *
 * Returns/updates the global lead-assignment mode used when creating a Lead
 * via `POST /api/marketing/leads`.
 *
 * Modes:
 *   - AUTO   : mỗi Lead mới sẽ tự động được gán cho 1 Sale (round-robin hoặc
 *              Sale duy nhất nếu hệ thống chỉ có 1 Sale active).
 *   - MANUAL : Marketing tự gán Sale thủ công (flow cũ, default).
 *
 * Authorization (Phase 8 — Permission Audit):
 *   - GET requires `system-settings.view` (or legacy `settings.lead_assignment_mode.view`)
 *   - PUT requires `system-settings.manage` (or legacy `settings.lead_assignment_mode.update`)
 *
 * Business:
 *   - Setting này chỉ ảnh hưởng tới Lead được tạo SAU khi đổi mode.
 *   - Lead đã tạo trước đó KHÔNG bị động vào.
 */

import { getCurrentUser } from "@/lib/auth";
import {
  getLeadAssignmentMode,
  setLeadAssignmentMode,
  type LeadAssignmentMode,
} from "@/lib/system-settings";
import { success, error as errorResponse } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    const hasView =
      currentUser.permissions.includes("*") ||
      currentUser.permissions.includes("system-settings.view") ||
      currentUser.permissions.includes("system-settings.manage") ||
      currentUser.permissions.includes("settings.lead_assignment_mode.view");
    if (!hasView) {
      return errorResponse("Bạn không có quyền xem cài đặt phân công Lead", 403);
    }

    const value = await getLeadAssignmentMode();
    return success(value);
  } catch (err) {
    console.error("Get Lead Assignment Mode Error:", err);
    return errorResponse("Không thể lấy cài đặt phân công Lead", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    const hasManage =
      currentUser.permissions.includes("*") ||
      currentUser.permissions.includes("system-settings.manage") ||
      currentUser.permissions.includes("settings.lead_assignment_mode.update");
    if (!hasManage) {
      return errorResponse("Bạn không có quyền cập nhật cài đặt phân công Lead", 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const raw = body as { mode?: unknown };
    const mode = raw.mode;
    if (mode !== "AUTO" && mode !== "MANUAL") {
      return errorResponse("Mode phải là 'AUTO' hoặc 'MANUAL'", 400);
    }

    const employeeId = currentUser.employee?._id?.toString() ?? null;
    const saved = await setLeadAssignmentMode({
      mode: mode as LeadAssignmentMode,
      updatedBy: employeeId,
    });

    return success(saved, "Cập nhật kiểu phân công Lead thành công");
  } catch (err) {
    console.error("Update Lead Assignment Mode Error:", err);
    if (err instanceof Error && err.message.includes("Chế độ")) {
      return errorResponse(err.message, 400);
    }
    return errorResponse("Không thể cập nhật cài đặt phân công Lead", 500);
  }
}

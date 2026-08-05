/**
 * ==================================================
 * CUSTOMER ACTIVITY STATS API
 * ==================================================
 *
 * Sprint 8.1 — Customer Timeline & CRM Activities
 *
 * GET /api/customer-activities/stats - Get follow-up statistics for dashboard
 */

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { success, error as errorResponse } from "@/utils/response";
import { customerActivityService } from "@/services/customer-activity/customer-activity.service";

function forbidden(message: string) {
  return errorResponse(message, 403);
}

function serverError(message: string) {
  return errorResponse(message, 500);
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("customer-activity.view")) {
      return forbidden("Bạn không có quyền xem thống kê");
    }

    await connectDB();

    const employeeId = currentUser.employee._id.toString();

    const stats = await customerActivityService.getFollowUpStats(employeeId);

    return success(stats);
  } catch (error) {
    console.error("Customer Activity Stats Error:", error);
    return serverError("Không thể lấy thống kê");
  }
}

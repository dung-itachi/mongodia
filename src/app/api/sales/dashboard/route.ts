/**
 * ==================================================
 * SALES DASHBOARD API
 * ==================================================
 *
 * Sprint 8.2 — Sales Dashboard
 *
 * GET /api/sales/dashboard - Get dashboard cards and follow-ups
 */

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { success, error as errorResponse } from "@/utils/response";
import { salesDashboardService } from "@/services/sales-dashboard/sales-dashboard.service";

function forbidden(message: string) {
  return errorResponse(message, 403);
}

function serverError(message: string) {
  return errorResponse(message, 500);
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("sales.dashboard.view")) {
      return forbidden("Bạn không có quyền xem dashboard");
    }

    await connectDB();

    // Get saleEmployeeId from query params (optional)
    const { searchParams } = new URL(request.url);
    const saleEmployeeId = searchParams.get("saleEmployeeId") ?? undefined;

    const data = await salesDashboardService.getDashboard({ saleEmployeeId });

    return success(data);
  } catch (error) {
    console.error("Sales Dashboard Error:", error);
    return serverError("Không thể lấy dữ liệu dashboard");
  }
}

/**
 * API Route: Marketing Lead Tracking Counts (Sprint 8.5)
 *
 * GET /api/marketing/leads/tracking/counts
 *
 * Returns counts for Marketing tracking dashboard:
 * - total: Tổng số leads
 * - new: Leads mới (chưa push)
 * - contacted: Đã push sang Sale
 * - qualified: Đủ điều kiện
 * - potential: Tiềm năng
 * - closed: Đã chốt (chưa convert)
 * - converted: Đã tạo đơn
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { marketingDispatchService } from "@/services/marketing-dispatch.service";
import { success, error as errorResponse } from "@/utils/response";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);

    // Check permission
    if (!currentUser.permissions.includes("lead.view")) {
      return errorResponse("Bạn không có quyền xem leads", 403);
    }

    await connectDB();

    const counts = await marketingDispatchService.getMarketingLeadTrackingCounts(
      currentUser.employee._id.toString()
    );

    return success(counts);
  } catch (err) {
    console.error("Get Marketing Lead Tracking Counts Error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Lỗi khi lấy số liệu",
      500
    );
  }
}

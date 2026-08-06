/**
 * API Route: Get Sale Lead Counts (Sprint 8.5)
 *
 * GET /api/sale/leads/counts
 *
 * Returns counts for Sale dashboard:
 * - total: Tổng số leads cần gọi
 * - new: Số leads mới
 * - contacted: Đã liên hệ
 * - noAnswer: Không nghe máy
 * - potential: Tiềm năng
 * - closed: Đã chốt
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

    const counts = await marketingDispatchService.getSaleLeadCounts(
      currentUser.employee._id.toString()
    );

    return success(counts);
  } catch (err) {
    console.error("Get Sale Lead Counts Error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Lỗi khi lấy số liệu",
      500
    );
  }
}

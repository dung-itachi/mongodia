/**
 * API Route: Marketing Lead Tracking - Quản lý đơn hàng (Sprint 8.5)
 *
 * GET /api/marketing/leads/tracking
 *
 * Query params:
 * - status: comma-separated list of statuses
 * - keyword: search by name, phone, leadCode
 * - page: page number (default: 1)
 * - limit: items per page (default: 20)
 *
 * Marketing chỉ XEM, không được cập nhật trạng thái.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { marketingDispatchService } from "@/services/marketing-dispatch.service";
import { LeadStatus } from "@/constants/leadStatus";
import { success, error as errorResponse } from "@/utils/response";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);

    // Check permission
    if (!currentUser.permissions.includes("lead.view")) {
      return errorResponse("Bạn không có quyền xem leads", 403);
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    const statusParam = searchParams.get("status") ?? "";
    const keyword = searchParams.get("keyword") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");

    // Parse status filter
    let status: LeadStatus[] | undefined;
    if (statusParam) {
      status = statusParam.split(",").map((s) => s.trim() as LeadStatus);
    }

    // Get leads for marketing tracking
    const result = await marketingDispatchService.getMarketingLeadTracking(
      currentUser.employee._id.toString(),
      {
        status,
        keyword: keyword || undefined,
        page,
        limit,
      }
    );

    return success(result);
  } catch (err) {
    console.error("Get Marketing Lead Tracking Error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Lỗi khi lấy danh sách theo dõi",
      500
    );
  }
}

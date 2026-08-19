/**
 * API Route: Count Pushed Leads (Sprint 8.X)
 *
 * GET /api/marketing/leads/pushed-count
 *
 * Returns count of leads that have been pushed to Sale (have saleEmployeeId).
 * Used for the "Đã đẩy" stat on /marketing/input page.
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

    // Count leads with saleEmployeeId (pushed to Sale)
    // Filter by current marketing employee if not GLOBAL
    const scope = currentUser.scope;
    const marketingEmployeeId = scope === "GLOBAL" ? undefined : currentUser.employee._id.toString();

    const count = await marketingDispatchService.countPushedLeads(marketingEmployeeId);

    return success({ pushedCount: count });
  } catch (err) {
    console.error("Get Pushed Leads Count Error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Lỗi khi lấy số liệu",
      500
    );
  }
}

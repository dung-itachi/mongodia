/**
 * API Route: Sale Lead Stats (Sprint 8.x+)
 *
 * GET /api/sale/leads/stats
 *
 * Returns aggregated stats for the /leads page:
 * - statusCounts:    breakdown of lead count per LeadStatus
 * - totalCount:      grand total
 * - closedCount:     number of leads with status = CLOSED
 * - closedRevenueMNT: total revenue from CLOSED leads
 *                     (= sum of (combo.sellingPrice - shippingFee) per CLOSED lead)
 * - shippingFeeMNT:  current shipping fee used to compute revenue
 *
 * Scope logic:
 *  - Admin/Manager (viewAll=true) see stats for ALL leads.
 *  - Sale users see stats for their own assigned leads only.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { marketingDispatchService } from "@/services/marketing-dispatch.service";
import { success, error as errorResponse } from "@/utils/response";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("lead.view")) {
      return errorResponse("Bạn không có quyền xem leads", 403);
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const viewAll = searchParams.get("viewAll") === "true";

    const roleCode = typeof currentUser.role === "string"
      ? currentUser.role
      : currentUser.role?.code;
    const isAdminOrManager = roleCode === "ADMIN" || roleCode === "MANAGER";
    const canViewAll = viewAll && isAdminOrManager;

    const stats = await marketingDispatchService.getSaleLeadStats(
      canViewAll ? null : currentUser.employee._id.toString()
    );

    return success(stats);
  } catch (err) {
    console.error("Get Sale Lead Stats Error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Lỗi khi lấy thống kê leads",
      500
    );
  }
}
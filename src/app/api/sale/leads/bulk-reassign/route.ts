/**
 * API Route: Bulk Reassign Leads to multiple Sale employees (Sprint 8.5)
 *
 * POST /api/sale/leads/bulk-reassign
 *
 * Body:
 * - leadIds: string[] - Array of lead IDs
 * - saleEmployeeIds: string[] - Array of sale employee IDs
 *
 * Leads are distributed to employees in round-robin fashion.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { marketingDispatchService } from "@/services/marketing-dispatch.service";
import { success, error as errorResponse } from "@/utils/response";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);

    // Check permission
    if (!currentUser.permissions.includes("lead.assign")) {
      return errorResponse("Bạn không có quyền phân công lead", 403);
    }

    const body = await request.json();
    const { leadIds, saleEmployeeIds } = body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return errorResponse("Thiếu danh sách leadIds", 400);
    }

    if (!saleEmployeeIds || !Array.isArray(saleEmployeeIds) || saleEmployeeIds.length === 0) {
      return errorResponse("Thiếu danh sách saleEmployeeIds", 400);
    }

    await connectDB();

    const results = await marketingDispatchService.bulkReassignLeads(
      leadIds,
      saleEmployeeIds,
      currentUser.employee._id.toString()
    );

    return success({
      total: leadIds.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      details: results,
    });
  } catch (err) {
    console.error("Bulk Reassign Leads Error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Lỗi khi phân công hàng loạt",
      500
    );
  }
}

/**
 * API Route: Reassign Lead to different Sale (Sprint 8.5)
 *
 * PATCH /api/sale/leads/:id/reassign
 *
 * Body:
 * - saleEmployeeId: string - ID of new sale employee
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { marketingDispatchService } from "@/services/marketing-dispatch.service";
import { success, error as errorResponse } from "@/utils/response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    const { id: leadId } = await params;

    // Check permission: Only Admin/Manager can reassign
    if (!currentUser.permissions.includes("lead.assign")) {
      return errorResponse("Bạn không có quyền phân công lead", 403);
    }

    const body = await request.json();
    const { saleEmployeeId } = body;

    if (!saleEmployeeId) {
      return errorResponse("Thiếu saleEmployeeId", 400);
    }

    await connectDB();

    const result = await marketingDispatchService.reassignLead(leadId, saleEmployeeId, currentUser.employee._id.toString());

    if (!result.success) {
      return errorResponse(result.errors.join(", "), 400);
    }

    return success({
      leadId,
      saleEmployeeId,
      reassignedBy: currentUser.employee._id.toString(),
    });
  } catch (err) {
    console.error("Reassign Lead Error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Lỗi khi phân công lead",
      500
    );
  }
}

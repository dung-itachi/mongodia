/**
 * API Route: Update Lead Status (Sprint 8.5)
 *
 * PATCH /api/sale/leads/[id]/status
 *
 * Body: {
 *   status: LeadStatus;
 *   note?: string;
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { marketingDispatchService } from "@/services/marketing-dispatch.service";
import { LeadStatus } from "@/constants/leadStatus";
import { success, error as errorResponse } from "@/utils/response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    // Check permission: Sale can update lead status
    if (!currentUser.permissions.includes("lead.update")) {
      return errorResponse("Bạn không có quyền cập nhật lead", 403);
    }

    await connectDB();

    const { id } = await params;

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const { status, note } = body as {
      status?: string;
      note?: string;
    };

    if (!status) {
      return errorResponse("Trạng thái không được để trống", 400);
    }

    // Validate status
    if (!Object.values(LeadStatus).includes(status as LeadStatus)) {
      return errorResponse(`Trạng thái không hợp lệ: ${status}`, 400);
    }

    const result = await marketingDispatchService.updateLeadStatus(
      id,
      status as LeadStatus,
      currentUser.employee._id.toString(),
      note
    );

    if (result.success) {
      return success(
        {
          leadId: result.leadId,
          oldStatus: result.oldStatus,
          newStatus: result.newStatus,
        },
        `Cập nhật trạng thái thành công`
      );
    } else {
      return errorResponse(result.error || "Không thể cập nhật trạng thái", 400);
    }
  } catch (err) {
    console.error("Update Lead Status Error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Lỗi khi cập nhật trạng thái",
      500
    );
  }
}

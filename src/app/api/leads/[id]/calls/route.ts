/**
 * API Route: Lead Call Logs (Module 6 - Nhật ký cuộc gọi)
 *
 * GET /api/leads/[id]/calls - Lấy lịch sử cuộc gọi
 * POST /api/leads/[id]/calls - Tạo bản ghi cuộc gọi mới
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { leadCallLogService } from "@/services/leadCallLog.service";
import { LeadCallStatus } from "@/constants/leadCallStatus";
import { success, error as errorResponse } from "@/utils/response";

/**
 * GET /api/leads/[id]/calls
 * Lấy lịch sử cuộc gọi của một lead
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    // Check permission
    if (!currentUser.permissions.includes("lead.view")) {
      return errorResponse("Bạn không có quyền xem lịch sử cuộc gọi", 403);
    }

    await connectDB();

    const { id: leadId } = await params;

    // Get query params
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("includeStats") === "true";

    // Fetch call history
    const callHistory = await leadCallLogService.getCallHistory(leadId);

    // Optionally include stats
    if (includeStats) {
      const stats = await leadCallLogService.getCallStats(leadId);
      return success({ callHistory, stats });
    }

    return success({ callHistory });
  } catch (err) {
    console.error("Get Call History Error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Lỗi khi lấy lịch sử cuộc gọi",
      500
    );
  }
}

/**
 * POST /api/leads/[id]/calls
 * Ghi nhận một cuộc gọi mới
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    // Check permission
    if (!currentUser.permissions.includes("lead.update")) {
      return errorResponse("Bạn không có quyền ghi nhận cuộc gọi", 403);
    }

    await connectDB();

    const { id: leadId } = await params;

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const { status, note, duration, callTime } = body as {
      status?: string;
      note?: string;
      duration?: number;
      callTime?: string;
    };

    // Validate required fields
    if (!status) {
      return errorResponse("Trạng thái cuộc gọi không được để trống", 400);
    }

    // Validate status
    if (!Object.values(LeadCallStatus).includes(status as LeadCallStatus)) {
      return errorResponse(`Trạng thái cuộc gọi không hợp lệ: ${status}`, 400);
    }

    // Create call log
    const callLog = await leadCallLogService.logCall({
      leadId,
      saleId: currentUser.employee._id.toString(),
      status: status as LeadCallStatus,
      note,
      duration,
      callTime: callTime ? new Date(callTime) : undefined,
    });

    return success(callLog, "Ghi nhận cuộc gọi thành công");
  } catch (err) {
    console.error("Log Call Error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Lỗi khi ghi nhận cuộc gọi",
      500
    );
  }
}

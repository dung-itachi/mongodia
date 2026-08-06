/**
 * API Route: Push Lead to Sale (Sprint 8.5)
 *
 * POST /api/marketing/leads/push
 *
 * Body: {
 *   leadIds: string[];
 *   saleEmployeeId?: string; // optional - auto-assign if not provided
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { marketingDispatchService } from "@/services/marketing-dispatch.service";
import { success, error as errorResponse } from "@/utils/response";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);

    // Check permission: Marketing can push leads
    if (!currentUser.permissions.includes("lead.create")) {
      return errorResponse("Bạn không có quyền đẩy lead", 403);
    }

    await connectDB();

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const { leadIds, saleEmployeeId } = body as {
      leadIds?: string[];
      saleEmployeeId?: string;
    };

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return errorResponse("Danh sách lead rỗng", 400);
    }

    // Validate leadIds are valid ObjectId format
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    for (const id of leadIds) {
      if (!objectIdRegex.test(id)) {
        console.error("Push Lead - Invalid ID:", id, "Type:", typeof id);
        return errorResponse(`ID không hợp lệ: ${id}`, 400);
      }
    }

    console.log("Push Lead - Valid leadIds:", leadIds);

    // Validate saleEmployeeId if provided
    if (saleEmployeeId && !objectIdRegex.test(saleEmployeeId)) {
      return errorResponse("Sale employee ID không hợp lệ", 400);
    }

    const result = await marketingDispatchService.pushLeadsToSale({
      leadIds,
      saleEmployeeId,
      pushedBy: currentUser.employee._id.toString(),
    });

    if (result.success) {
      return success(
        {
          pushedCount: result.pushedCount,
          failedCount: result.failedCount,
          leads: result.leads,
        },
        `Đã đẩy ${result.pushedCount} lead sang Sale`
      );
    } else {
      return errorResponse(
        result.errors.join("; ") || "Không thể đẩy lead",
        400
      );
    }
  } catch (err) {
    console.error("Push Lead to Sale Error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Lỗi khi đẩy lead",
      500
    );
  }
}

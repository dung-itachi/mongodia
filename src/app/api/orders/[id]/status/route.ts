/**
 * ==================================================
 * ORDER STATUS API ROUTE
 * ==================================================
 *
 * Sprint 6.2 — Order Workflow
 *
 * PATCH /api/orders/:id/status
 * Change order status with workflow validation
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import { orderService } from "@/services/order.service";
import { success, error as errorResponse } from "@/utils/response";
import { z } from "zod";

// ============================================================================
// Validation Schema
// ============================================================================

const changeStatusSchema = z.object({
  status: z.string().min(1, "Status is required"),
  note: z.string().optional(),
});

// ============================================================================
// PATCH /api/orders/:id/status - Change order status
// ============================================================================

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and permission
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("order.update")) {
      return errorResponse("Bạn không có quyền cập nhật đơn hàng", 403);
    }

    await connectDB();

    const { id } = await params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const parsedBody = changeStatusSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        400
      );
    }

    const { status, note } = parsedBody.data;

    // Call service to change status
    const result = await orderService.changeStatus({
      orderId: id,
      newStatus: status,
      employeeId: currentUser.employee._id.toString(),
      note,
    });

    if (!result.success) {
      return errorResponse(result.error, 400);
    }

    return success(result.order, "Đổi trạng thái thành công");
  } catch (err) {
    console.error("Change Order Status Error:", err);
    return errorResponse("Không thể đổi trạng thái đơn hàng", 500);
  }
}

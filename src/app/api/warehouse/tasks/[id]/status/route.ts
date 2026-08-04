/**
 * ==================================================
 * PATCH /api/warehouse/tasks/:id/status
 * ==================================================
 *
 * Sprint 6.3 — Warehouse Integration
 *
 * Change warehouse task status.
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { warehouseService } from "@/services/warehouse.service";
import { success, error as errorResponse } from "@/utils/response";
import { z } from "zod";

const changeStatusSchema = z.object({
  status: z.string().min(1, "Status is required"),
  note: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("warehouse.update")) {
      return errorResponse("Bạn không có quyền cập nhật warehouse", 403);
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID không hợp lệ", 400);
    }

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

    const result = await warehouseService.changeStatus({
      taskId: id,
      newStatus: status,
      employeeId: currentUser.employee._id.toString(),
      note,
    });

    if (!result.success) {
      return errorResponse(result.error, 400);
    }

    return success(result.task, "Đổi trạng thái thành công");
  } catch (err) {
    console.error("Change Warehouse Status Error:", err);
    return errorResponse("Không thể đổi trạng thái warehouse task", 500);
  }
}

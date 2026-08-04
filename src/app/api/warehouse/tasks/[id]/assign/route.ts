/**
 * ==================================================
 * PATCH /api/warehouse/tasks/:id/assign
 * ==================================================
 *
 * Sprint 6.3 — Warehouse Integration
 *
 * Assign employee to warehouse task.
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { warehouseService } from "@/services/warehouse.service";
import { success, error as errorResponse } from "@/utils/response";
import { z } from "zod";

const assignSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  note: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("warehouse.assign")) {
      return errorResponse("Bạn không có quyền giao việc warehouse", 403);
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

    const parsedBody = assignSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        400
      );
    }

    const { employeeId, note } = parsedBody.data;

    const result = await warehouseService.assignEmployee({
      taskId: id,
      employeeId: currentUser.employee._id.toString(),
      assigneeId: employeeId,
      note,
    });

    if (!result.success) {
      return errorResponse(result.error, 400);
    }

    return success(result.task, "Giao việc thành công");
  } catch (err) {
    console.error("Assign Warehouse Task Error:", err);
    return errorResponse("Không thể giao việc warehouse task", 500);
  }
}

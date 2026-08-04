/**
 * ==================================================
 * GET /api/warehouse/tasks/:id
 * ==================================================
 *
 * Sprint 6.3 — Warehouse Integration
 *
 * Get warehouse task by ID with order and history details.
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { warehouseService } from "@/services/warehouse.service";
import { warehouseHistoryService } from "@/services/warehouse-history.service";
import { success, error as errorResponse } from "@/utils/response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("warehouse.view")) {
      return errorResponse("Bạn không có quyền xem warehouse", 403);
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    const task = await warehouseService.getTaskById(id);
    if (!task) {
      return errorResponse("WarehouseTask không tồn tại", 404);
    }

    // Get history
    const histories = await warehouseHistoryService.getHistoryByTaskId(id);

    return success(
      { task, histories },
      "Lấy warehouse task thành công"
    );
  } catch (err) {
    console.error("Get Warehouse Task Error:", err);
    return errorResponse("Không thể lấy warehouse task", 500);
  }
}

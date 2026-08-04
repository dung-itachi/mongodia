/**
 * ==================================================
 * GET /api/warehouse/tasks
 * ==================================================
 *
 * Sprint 6.3 — Warehouse Integration
 *
 * Get all warehouse tasks with pagination and filters.
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { warehouseService } from "@/services/warehouse.service";
import { success, error as errorResponse } from "@/utils/response";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.string().optional(),
  assignedEmployeeId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("warehouse.view")) {
      return errorResponse("Bạn không có quyền xem warehouse", 403);
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = querySchema.safeParse(Object.fromEntries(searchParams));

    if (!query.success) {
      return errorResponse("Dữ liệu query không hợp lệ", 400);
    }

    const { page, limit, status, assignedEmployeeId } = query.data;

    const result = await warehouseService.getAllTasks({
      page,
      limit,
      status,
      assignedEmployeeId,
    });

    return success(result, "Lấy danh sách warehouse task thành công");
  } catch (err) {
    console.error("Get Warehouse Tasks Error:", err);
    return errorResponse("Không thể lấy danh sách warehouse task", 500);
  }
}

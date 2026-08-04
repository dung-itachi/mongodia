/**
 * ==================================================
 * GET /api/warehouse/tasks/:id/inventory
 * ==================================================
 *
 * Sprint 6.4 — Inventory Movement
 *
 * Get inventory movements for a warehouse task.
 */

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { inventoryService } from "@/services/inventory.service";
import { success, error as errorResponse } from "@/utils/response";
import mongoose from "mongoose";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("inventory.view")) {
      return errorResponse("Bạn không có quyền xem inventory", 403);
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    const result = await inventoryService.getMovements({
      warehouseTaskId: id,
      page: 1,
      limit: 100,
    });

    return success({
      movements: result.movements,
      total: result.total,
    });
  } catch (err) {
    console.error("Warehouse Task Inventory Error:", err);
    return errorResponse("Không thể lấy inventory movements", 500);
  }
}
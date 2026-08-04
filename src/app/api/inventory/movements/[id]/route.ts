/**
 * ==================================================
 * GET /api/inventory/movements/:id
 * ==================================================
 *
 * Sprint 6.4 — Inventory Movement
 *
 * Get inventory movement by ID.
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

    const movement = await inventoryService.getMovementById(id);

    if (!movement) {
      return errorResponse("Movement không tồn tại", 404);
    }

    return success(movement, "Lấy movement thành công");
  } catch (err) {
    console.error("Inventory Movement Detail Error:", err);
    return errorResponse("Không thể lấy thông tin inventory movement", 500);
  }
}
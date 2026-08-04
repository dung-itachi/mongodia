/**
 * ==================================================
 * GET /api/inventory/movements
 * ==================================================
 *
 * Sprint 6.4 — Inventory Movement
 *
 * List inventory movements with pagination and filters.
 */

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { inventoryService } from "@/services/inventory.service";
import { success, error as errorResponse } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("inventory.view")) {
      return errorResponse("Bạn không có quyền xem inventory", 403);
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const warehouseId = searchParams.get("warehouseId") ?? undefined;
    const orderId = searchParams.get("orderId") ?? undefined;
    const warehouseTaskId = searchParams.get("warehouseTaskId") ?? undefined;

    const result = await inventoryService.getMovements({
      warehouseId,
      orderId,
      warehouseTaskId,
      page,
      limit,
    });

    return success({
      movements: result.movements,
      total: result.total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(result.total / limit)),
    });
  } catch (err) {
    console.error("Inventory Movements List Error:", err);
    return errorResponse("Không thể lấy danh sách inventory movements", 500);
  }
}
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAllWarehouses, canAccessWarehouse } from "@/lib/warehouse-scope";
import { queryInventory } from "@/services/warehouse/warehouseInventoryQuery.service";
import { success, error } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("inventory.view")) return error("Bạn không có quyền xem tồn kho", 403);
    
    const params = new URL(request.url).searchParams;
    const warehouseId = params.get("warehouseId") ?? undefined;
    
    if (!warehouseId && !canAccessAllWarehouses(currentUser)) {
      return error("Nhân viên kho chỉ được xem tồn kho kho được giao", 403);
    }
    if (warehouseId && !canAccessWarehouse(currentUser, warehouseId)) {
      return error("Bạn không có quyền truy cập kho này", 403);
    }
    
    await connectDB();
    
    const result = await queryInventory({
      warehouseId,
      itemType: params.get("itemType") ?? undefined,
      productId: params.get("productId") ?? undefined,
      variantId: params.get("variantId") ?? undefined,
      giftId: params.get("giftId") ?? undefined,
      search: params.get("search") ?? undefined,
      page: Number(params.get("page") ?? 1),
      limit: Math.min(Number(params.get("limit") ?? 20), 100),
    });
    
    return success(result);
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "Không thể lấy tồn kho", 400);
  }
}

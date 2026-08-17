import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { canAccessWarehouse, canAccessAllWarehouses } from "@/lib/warehouse-scope";
import { warehouseAdjustmentService, type AdjustmentItemInput } from "@/services/warehouse/warehouse-adjustment.service";
import { success, error } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("inventory.view") && !currentUser.permissions.includes("warehouse.adjust")) {
      return error("Bạn không có quyền xem điều chỉnh tồn kho", 403);
    }

    const params = new URL(request.url).searchParams;
    const warehouseId = params.get("warehouseId") ?? undefined;
    const type = params.get("type") ?? undefined;

    // Check warehouse access
    if (!warehouseId && !canAccessAllWarehouses(currentUser)) {
      return error("Nhân viên kho chỉ được xem điều chỉnh của kho được giao", 403);
    }
    if (warehouseId && !canAccessWarehouse(currentUser, warehouseId)) {
      return error("Bạn không có quyền truy cập kho này", 403);
    }

    await connectDB();

    return success(
      await warehouseAdjustmentService.listAdjustments({
        warehouseId,
        type,
        page: Number(params.get("page") ?? 1),
        limit: Math.min(Number(params.get("limit") ?? 20), 100),
      })
    );
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "Không thể lấy danh sách điều chỉnh", 400);
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("warehouse.adjust") && !currentUser.permissions.includes("inventory-adjustment.create")) {
      return error("Bạn không có quyền điều chỉnh tồn kho", 403);
    }

    const body = await request.json() as {
      warehouseId?: string;
      items?: AdjustmentItemInput[];
      note?: string;
    };

    if (!body.warehouseId) {
      return error("Vui lòng chọn kho", 400);
    }

    if (!body.items || !body.items.length) {
      return error("Vui lòng thêm ít nhất một mặt hàng cần điều chỉnh", 400);
    }

    // Validate items
    for (const item of body.items) {
      if (!item.reason?.trim()) {
        return error("Vui lòng nhập lý do điều chỉnh cho tất cả các mặt hàng", 400);
      }
      if (typeof item.newQuantity !== "number" || item.newQuantity < 0) {
        return error("Số lượng mới phải là số không âm", 400);
      }
      if (!item.productId && !item.variantId && !item.giftId) {
        return error("Vui lòng chọn ít nhất một sản phẩm, biến thể hoặc quà tặng", 400);
      }
    }

    if (!canAccessWarehouse(currentUser, body.warehouseId)) {
      return error("Bạn không có quyền thao tác kho này", 403);
    }

    await connectDB();

    const result = await warehouseAdjustmentService.createAdjustment(
      body.warehouseId,
      body.items,
      currentUser.employee._id.toString(),
      body.note
    );

    if (!result.success) {
      return error(result.error, 400);
    }

    return success(result, `Điều chỉnh tồn kho thành công. Mã: ${result.adjustmentCode}`);
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "Không thể tạo điều chỉnh tồn kho", 400);
  }
}

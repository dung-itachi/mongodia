import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { canAccessWarehouse } from "@/lib/warehouse-scope";
import { warehouseWorkflowService, type WarehouseItemInput } from "@/services/warehouse/warehouseWorkflow.service";
import WarehouseReceipt from "@/models/WarehouseReceipt";
import { success, error } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("inventory.view")) return error("Bạn không có quyền xem phiếu nhập", 403);
    const params = new URL(request.url).searchParams;
    const warehouseId = params.get("warehouseId") ?? undefined;
    if (warehouseId && !canAccessWarehouse(currentUser, warehouseId)) return error("Bạn không có quyền truy cập kho này", 403);
    await connectDB();
    return success(await warehouseWorkflowService.listReceipts({ warehouseId, page: Number(params.get("page") ?? 1), limit: Math.min(Number(params.get("limit") ?? 20), 100) }));
  } catch (cause) { return error(cause instanceof Error ? cause.message : "Không thể lấy phiếu nhập", 400); }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("warehouse.import")) return error("Bạn không có quyền nhập kho", 403);
    const body = await request.json() as { warehouseId?: string; items?: WarehouseItemInput[]; note?: string };
    if (!body.warehouseId || !canAccessWarehouse(currentUser, body.warehouseId)) return error("Bạn không có quyền thao tác kho này", 403);
    await connectDB();
    const receipt = await warehouseWorkflowService.createReceipt({ warehouseId: body.warehouseId, items: body.items ?? [], note: body.note, employeeId: currentUser.employee._id.toString() });
    return success(receipt, "Tạo phiếu nhập kho thành công");
  } catch (cause) { return error(cause instanceof Error ? cause.message : "Không thể tạo phiếu nhập kho", 400); }
}

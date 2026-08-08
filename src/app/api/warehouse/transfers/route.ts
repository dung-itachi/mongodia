import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { canAccessWarehouse } from "@/lib/warehouse-scope";
import { warehouseWorkflowService, type WarehouseItemInput } from "@/services/warehouse/warehouseWorkflow.service";
import { success, error } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("warehouse.view")) return error("Bạn không có quyền xem phiếu chuyển", 403);
    await connectDB();
    return success(await warehouseWorkflowService.listTransfers({ status: new URL(request.url).searchParams.get("status") ?? undefined, page: Number(new URL(request.url).searchParams.get("page") ?? 1), limit: 20 }));
  } catch (cause) { return error(cause instanceof Error ? cause.message : "Không thể lấy phiếu chuyển", 400); }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("warehouse.transfer")) return error("Bạn không có quyền chuyển kho", 403);
    const body = await request.json() as { sourceWarehouseId?: string; destinationWarehouseId?: string; items?: WarehouseItemInput[]; note?: string; status?: "DRAFT" | "SENT" | "COMPLETED" };
    if (!body.sourceWarehouseId || !body.destinationWarehouseId || !canAccessWarehouse(currentUser, body.sourceWarehouseId) || !canAccessWarehouse(currentUser, body.destinationWarehouseId)) return error("Bạn không có quyền thao tác một trong các kho", 403);
    await connectDB();
    const transfer = await warehouseWorkflowService.createTransfer({ sourceWarehouseId: body.sourceWarehouseId, destinationWarehouseId: body.destinationWarehouseId, items: body.items ?? [], note: body.note, status: body.status, employeeId: currentUser.employee._id.toString() });
    return success(transfer, "Tạo phiếu chuyển kho thành công");
  } catch (cause) { return error(cause instanceof Error ? cause.message : "Không thể tạo phiếu chuyển kho", 400); }
}

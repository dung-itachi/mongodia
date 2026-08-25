import WarehouseTransfer from "@/models/WarehouseTransfer";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { canAccessWarehouse } from "@/lib/warehouse-scope";
import { warehouseWorkflowService } from "@/services/warehouse/warehouseWorkflow.service";
import { success, error } from "@/utils/response";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("warehouse.receive")) return error("Bạn không có quyền nhận chuyển kho", 403);
    await connectDB();
    const { id } = await params;
    const transfer = await WarehouseTransfer.findById(id).select("destinationWarehouseId").lean();
    if (!transfer) return error("Phiếu chuyển không tồn tại", 404);
    if (!canAccessWarehouse(currentUser, transfer.destinationWarehouseId.toString())) return error("Bạn không có quyền nhận hàng vào kho này", 403);
    const body = await request.json() as { receivedQuantities?: number[]; note?: string };
    const updated = await warehouseWorkflowService.receiveTransfer({ transferId: id, receivedQuantities: body.receivedQuantities ?? [], note: body.note, employeeId: currentUser.employee._id.toString() });
    return success(updated, "Nhận chuyển kho thành công");
  } catch (cause) {
    // Map atomic-guard conflict to HTTP 409 instead of generic 400.
    const status = (cause as { status?: number } | null)?.status;
    if (status === 409) return error(cause instanceof Error ? cause.message : "Phiếu chuyển không thể nhận", 409);
    return error(cause instanceof Error ? cause.message : "Không thể nhận chuyển kho", 400);
  }
}

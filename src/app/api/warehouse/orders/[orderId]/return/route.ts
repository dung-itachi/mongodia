import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { canAccessWarehouse } from "@/lib/warehouse-scope";
import { Order } from "@/models/Order";
import { orderShipmentService, type ShipmentItem } from "@/services/warehouse/orderShipment.service";
import { success, error } from "@/utils/response";

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("warehouse.return")) return error("Bạn không có quyền hoàn kho", 403);
    const { orderId } = await params;
    await connectDB();
    const order = await Order.findById(orderId).select("warehouseId").lean();
    if (!order?.warehouseId) return error("Đơn hàng chưa gán kho", 400);
    if (!canAccessWarehouse(currentUser, order.warehouseId.toString())) return error("Bạn không có quyền hoàn kho cho đơn này", 403);
    const body = await request.json() as { items?: ShipmentItem[]; note?: string };
    if (!Array.isArray(body.items) || body.items.length === 0) return error("Phải chọn mặt hàng hoàn", 400);
    const result = await orderShipmentService.returnOrder({
      orderId,
      employeeId: currentUser.employee._id.toString(),
      items: body.items,
      note: body.note,
    });

    if (!result.success) {
      // WriteConflict (concurrent return on same inventory) → 409 retryable.
      const isRetryable =
        result.error.startsWith("Đơn đang được xử lý") ||
        result.error.includes("xung đột đồng thời");
      if (isRetryable) {
        return error(result.error, 409);
      }
      return error(result.error, 400);
    }

    if (result.alreadyReturned) {
      const message = result.terminalStatus === "RECONCILED"
        ? "Đơn đã đối soát, không thể nhập hoàn kho."
        : result.terminalStatus === "CANCELLED"
          ? "Đơn đã bị hủy, không thể nhập hoàn kho."
          : "Đơn đã được nhập hoàn kho trước đó.";
      return success(null, message);
    }

    return success(result.itemsReturned, "Nhập hoàn kho thành công");
  } catch (cause) { return error(cause instanceof Error ? cause.message : "Hoàn kho thất bại", 400); }
}

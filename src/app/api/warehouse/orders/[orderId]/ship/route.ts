import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { canAccessWarehouse } from "@/lib/warehouse-scope";
import { Order } from "@/models/Order";
import { orderShipmentService, getTerminalMessage, type ShipmentItem } from "@/services/warehouse/orderShipment.service";
import { success, error } from "@/utils/response";

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("warehouse.ship")) return error("Bạn không có quyền xuất kho", 403);
    const { orderId } = await params;
    await connectDB();
    const order = await Order.findById(orderId).select("warehouseId").lean();
    if (!order?.warehouseId) return error("Đơn hàng chưa gán kho", 400);
    if (!canAccessWarehouse(currentUser, order.warehouseId.toString())) return error("Bạn không có quyền xuất kho cho đơn này", 403);
    const body = await request.json() as { items?: ShipmentItem[]; note?: string };

    const result = await orderShipmentService.shipOrder({
      orderId,
      employeeId: currentUser.employee._id.toString(),
      actualShipments: body.items,
      note: body.note,
    });

    if (!result.success) {
      return error(result.error, 400);
    }

    if (result.alreadyShipped) {
      // Show a precise user-facing message based on which terminal status blocked the shipment.
      const message = result.terminalStatus ? getTerminalMessage(result.terminalStatus) : "Đơn đã được xuất kho trước đó.";
      return success(null, message);
    }

    return success(result.shipments, "Xuất kho thành công");
  } catch (cause) { return error(cause instanceof Error ? cause.message : "Xuất kho thất bại", 400); }
}

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { Order } from "@/models/Order";
import { mapOrderList } from "@/mappers/order.mapper";
import { success, error as errorResponse } from "@/utils/response";
import { OrderStatus } from "@/constants/orderStatus";
import { canAccessWarehouse, canAccessAllWarehouses } from "@/lib/warehouse-scope";

/**
 * GET /api/warehouse/orders
 *
 * List orders assigned to warehouses for shipment processing.
 * Used by Warehouse Order Shipment UI.
 *
 * === WAREHOUSE SCOPE ===
 * - Uses existing canAccessWarehouse() abstraction from warehouse-scope.ts
 * - Admin/MANAGER/permission="*" can access all warehouses
 * - Regular users can only see orders from their assigned warehouse
 * - Frontend's warehouseId filter is VALIDATED against user's scope
 *
 * === PERMISSIONS ===
 * - Requires: warehouse.view
 *
 * === QUERY PARAMS ===
 * - warehouseId: Filter by warehouse (validated against user scope)
 * - keyword: Search by orderCode or customerName
 * - status: Filter by order status (default: PACKING, CONFIRMED)
 * - page, limit: Pagination
 *
 * === SECURITY ===
 * - User CANNOT bypass scope by sending arbitrary warehouseId
 * - Backend validates warehouseId against user's allowed warehouses
 * - Returns empty result if user tries to access unauthorized warehouse
 */
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("warehouse.view")) {
      return errorResponse("Bạn không có quyền xem kho", 403);
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const keyword = searchParams.get("keyword") ?? "";
    const warehouseId = searchParams.get("warehouseId") ?? "";

    // User's assigned warehouse (uses existing warehouse-scope abstraction)
    const userAssignedWarehouse = (currentUser.employee as { warehouseId?: { toString: () => string } | null } | undefined)?.warehouseId?.toString();

    // Check if user has admin/manager access to all warehouses
    const hasFullAccess = canAccessAllWarehouses(currentUser);

    const filter: Record<string, unknown> = { isActive: true };

    // Default: show orders that are ready for warehouse processing
    // CONFIRMED → PACKING → needs warehouse action to ship
    if (!searchParams.has("status")) {
      filter.status = { $in: [OrderStatus.CONFIRMED, OrderStatus.PACKING] };
    }

    // Apply warehouse scope filter
    if (hasFullAccess) {
      // Admin/MANAGER: can view all warehouses, respect warehouseId filter if provided
      if (warehouseId) {
        filter.warehouseId = warehouseId;
      }
      // If no warehouseId, no filter applied - shows all accessible warehouses
    } else {
      // Regular user: can only see their assigned warehouse
      if (!userAssignedWarehouse) {
        // User has no warehouse assigned - return empty
        return success({ items: [], total: 0, page, limit, totalPages: 0 });
      }

      if (warehouseId) {
        // User tries to filter by a specific warehouse
        // Validate against their assigned warehouse
        if (!canAccessWarehouse(currentUser, warehouseId)) {
          // Attempting to access unauthorized warehouse - return empty (not error)
          return success({ items: [], total: 0, page, limit, totalPages: 0 });
        }
        filter.warehouseId = warehouseId;
      } else {
        // No filter: show only user's assigned warehouse
        filter.warehouseId = userAssignedWarehouse;
      }
    }

    // Search: orderCode / customerName / phone
    if (keyword) {
      filter.$or = [
        { orderCode: { $regex: keyword, $options: "i" } },
        { customerName: { $regex: keyword, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Order.find(filter)
        .populate("customerId", "_id code name phone")
        .populate("warehouseId", "_id code name")
        .populate("saleEmployeeId", "_id employeeCode fullName")
        .populate("productId", "_id code name")
        .populate("comboId", "_id code name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return success({
      items: mapOrderList(items),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Warehouse Orders List Error:", error);
    return errorResponse("Không thể lấy danh sách đơn hàng kho", 500);
  }
}

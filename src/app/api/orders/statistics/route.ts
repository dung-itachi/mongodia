/**
 * GET /api/orders/statistics
 *
 * Trả về thống kê tổng hợp về đơn hàng cho popup "Thống kê đơn hàng".
 *
 * Bộ lọc hỗ trợ (mirror với GET /api/orders):
 *   - status           → lọc theo trạng thái (URL ?status=...)
 *   - keyword          → lọc theo orderCode / customerName / phone
 *   - createdFrom/To   → lọc theo ngày tạo
 *   - orderType        → lọc theo loại đơn
 *   - orderSource      → lọc theo kênh bán
 *   - saleEmployeeId   → lọc theo nhân viên sale
 *   - marketingEmployeeId → lọc theo nhân viên marketing
 *   - warehouseId      → lọc theo kho
 *
 * Response (OrderStatisticsResponse):
 *   {
 *     total: number,                   // tổng số đơn (theo filter)
 *     funnel: {                         // phễu trạng thái
 *       confirmed: number,
 *       packing: number,
 *       shipping: number,
 *       delivered: number,
 *       reconciled: number,
 *     },
 *     successRate: number,             // (DELIVERED + RECONCILED) / total (%)
 *     returnRate: number,              // RETURNED / total (%)
 *     cancelledRate: number,           // CANCELLED / total (%)
 *   }
 *
 * Lưu ý:
 *   - Tỷ lệ = 0 khi `total === 0` (tránh chia cho 0).
 *   - Endpoint này CHỈ aggregate; không trả danh sách đơn.
 */

import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { Order } from "@/models/Order";
import { OrderStatus } from "@/constants/orderStatus";

import { success, error as errorResponse } from "@/utils/response";
import Customer from "@/models/Customer";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("order.view")) {
      return errorResponse("Bạn không có quyền xem đơn hàng", 403);
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    // -------- Parse filters (mirror /api/orders) --------
    const keyword = searchParams.get("keyword") ?? "";
    const status = searchParams.get("status") ?? "";
    const orderType = searchParams.get("orderType") ?? "";
    const orderSource = searchParams.get("orderSource") ?? "";
    const warehouseId = searchParams.get("warehouseId") ?? "";
    const saleEmployeeId = searchParams.get("saleEmployeeId") ?? "";
    const marketingEmployeeId = searchParams.get("marketingEmployeeId") ?? "";
    const createdFrom = searchParams.get("createdFrom") ?? "";
    const createdTo = searchParams.get("createdTo") ?? "";

    const filter: Record<string, unknown> = { isActive: true };

    if (keyword) {
      // Phone có thể nằm trên Customer → lookup Customer ids trước
      const customers = await Customer.find({
        phone: { $regex: keyword, $options: "i" },
      })
        .select("_id")
        .lean();
      const customerIds = customers.map((c) => c._id);

      const orClauses: Record<string, unknown>[] = [
        { orderCode: { $regex: keyword, $options: "i" } },
        { customerName: { $regex: keyword, $options: "i" } },
      ];
      if (customerIds.length > 0) {
        orClauses.push({ customerId: { $in: customerIds } });
      }
      filter.$or = orClauses;
    }

    if (status) {
      filter.status = status;
    }

    if (orderType) {
      filter.orderType = orderType;
    }

    if (orderSource) {
      filter.orderSource = orderSource;
    }

    if (warehouseId) {
      if (mongoose.Types.ObjectId.isValid(warehouseId)) {
        filter.warehouseId = new mongoose.Types.ObjectId(warehouseId);
      }
    }

    if (saleEmployeeId && mongoose.Types.ObjectId.isValid(saleEmployeeId)) {
      filter.saleEmployeeId = new mongoose.Types.ObjectId(saleEmployeeId);
    }

    if (
      marketingEmployeeId &&
      mongoose.Types.ObjectId.isValid(marketingEmployeeId)
    ) {
      filter.marketingEmployeeId = new mongoose.Types.ObjectId(
        marketingEmployeeId
      );
    }

    if (createdFrom || createdTo) {
      filter.createdAt = {};
      if (createdFrom) {
        (filter.createdAt as Record<string, Date>).$gte = new Date(createdFrom);
      }
      if (createdTo) {
        const endDate = new Date(createdTo);
        endDate.setHours(23, 59, 59, 999);
        (filter.createdAt as Record<string, Date>).$lte = endDate;
      }
    }

    // -------- Aggregate: phễu trạng thái --------
    // Đếm theo status cụ thể (CONFIRMED, PACKING, SHIPPING, DELIVERED, RECONCILED)
    const funnelStatusList = [
      OrderStatus.CONFIRMED,
      OrderStatus.PACKING,
      OrderStatus.SHIPPING,
      OrderStatus.DELIVERED,
      OrderStatus.RECONCILED,
    ];

    const funnelFilter = { ...filter };
    if (funnelFilter.status) {
      // Khi caller đã filter theo status, funnel chỉ còn đúng 1 status đó.
      // Để giữ logic đồng nhất, ta không ép filter.status khi đếm funnel.
      delete funnelFilter.status;
    }

    const funnelCounts = await Order.aggregate([
      { $match: funnelFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const funnelMap: Record<string, number> = {};
    for (const row of funnelCounts) {
      funnelMap[String(row._id)] = Number(row.count) || 0;
    }

    const funnel = {
      confirmed: funnelMap[OrderStatus.CONFIRMED] ?? 0,
      packing: funnelMap[OrderStatus.PACKING] ?? 0,
      shipping: funnelMap[OrderStatus.SHIPPING] ?? 0,
      delivered: funnelMap[OrderStatus.DELIVERED] ?? 0,
      reconciled: funnelMap[OrderStatus.RECONCILED] ?? 0,
    };

    // -------- Aggregate: tổng số đơn theo filter --------
    // Dùng cùng filter (giữ status nếu có) để "total" khớp với danh sách hiện tại.
    const total = await Order.countDocuments(filter);

    // -------- Tính tỷ lệ (an toàn khi total = 0) --------
    const safePercent = (num: number, den: number): number => {
      if (!den || den <= 0) return 0;
      return Math.round((num / den) * 10000) / 100; // 2 chữ số thập phân
    };

    const successRate = safePercent(
      funnel.delivered + funnel.reconciled,
      total
    );
    const returnRate = safePercent(funnelMap[OrderStatus.RETURNED] ?? 0, total);
    const cancelledRate = safePercent(
      funnelMap[OrderStatus.CANCELLED] ?? 0,
      total
    );

    return success({
      total,
      funnel,
      successRate,
      returnRate,
      cancelledRate,
      // Trả thêm để UI dùng nếu cần: tổng đơn trong từng trạng thái (full breakdown)
      statusBreakdown: {
        [OrderStatus.WAIT_CONFIRM]: funnelMap[OrderStatus.WAIT_CONFIRM] ?? 0,
        [OrderStatus.CONFIRMED]: funnel.confirmed,
        [OrderStatus.PACKING]: funnel.packing,
        [OrderStatus.SHIPPING]: funnel.shipping,
        [OrderStatus.DELIVERED]: funnel.delivered,
        [OrderStatus.RETURNED]: funnelMap[OrderStatus.RETURNED] ?? 0,
        [OrderStatus.RECONCILED]: funnel.reconciled,
        [OrderStatus.CANCELLED]: funnelMap[OrderStatus.CANCELLED] ?? 0,
      },
    });
  } catch (error) {
    console.error("Order Statistics Error:", error);
    return errorResponse("Không thể lấy thống kê đơn hàng", 500);
  }
}

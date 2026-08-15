/**
 * ==================================================
 * CUSTOMER LOOKUP API (Reusable)
 * ==================================================
 *
 * Sprint — Marketing Input: "Check customer before submit"
 *
 * GET /api/customers/lookup
 *   Query params:
 *     - phone  (preferred): exact match on Customer.phone
 *     - keyword (fallback): partial match on name/phone/email
 *
 * Response:
 *   {
 *     success: true,
 *     data: {
 *       customer: CustomerResponse | null,
 *       orders: { items: OrderListItem[], total, page, limit, totalPages },
 *       statistics: { totalOrders, totalRevenue, averageOrderValue, lastOrderDate }
 *     }
 *   }
 *
 * Designed to be reused by:
 *   - MarketingInputSection (check before creating lead)
 *   - Any future entry-point that needs to "look up a customer by phone"
 */

import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import { success, error as errorResponse } from "@/utils/response";
import { customerRepository } from "@/repositories/customer.repository";
import { mapCustomer } from "@/mappers/customer.mapper";
import { Order } from "@/models/Order";
import { mapOrderList } from "@/mappers/order.mapper";

const DEFAULT_PAGE_SIZE = 5;

function badRequest(message: string) {
  return errorResponse(message, 400);
}

function forbidden(message: string) {
  return errorResponse(message, 403);
}

function serverError(message: string) {
  return errorResponse(message, 500);
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("customer.view")) {
      return forbidden("Bạn không có quyền xem khách hàng");
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone")?.trim() ?? "";
    const keyword = searchParams.get("keyword")?.trim() ?? "";

    if (!phone && !keyword) {
      return badRequest("Vui lòng cung cấp 'phone' hoặc 'keyword'");
    }

    let customerDoc: Record<string, unknown> | null = null;

    if (phone) {
      // Phone lookup: phone is indexed + unique, so this is O(1)
      const normalized = phone.replace(/[\s.-]/g, "");
      customerDoc = await customerRepository.findByPhone(normalized) as unknown as Record<string, unknown> | null;

      // Fallback: try original phone (in case of format mismatch)
      if (!customerDoc && normalized !== phone) {
        customerDoc = await customerRepository.findByPhone(phone) as unknown as Record<string, unknown> | null;
      }
    } else if (keyword) {
      // Use keyword as a CustomerFilter to find the closest match
      const { items } = await customerRepository.findAll({
        keyword,
        pageSize: 1,
        page: 1,
        isActive: true,
      });
      customerDoc = (items[0] as unknown as Record<string, unknown>) ?? null;
    }

    const mappedCustomer = mapCustomer(customerDoc);

    // ---- Empty hit → short-circuit ------------------------------------
    if (!mappedCustomer) {
      return success({
        customer: null,
        orders: { items: [], total: 0, page: 1, limit: DEFAULT_PAGE_SIZE, totalPages: 1 },
        statistics: {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          lastOrderDate: null,
          firstOrderDate: null,
        },
      });
    }

    const customerId = mappedCustomer._id;
    const objectId = new mongoose.Types.ObjectId(customerId);

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? String(DEFAULT_PAGE_SIZE));
    const skip = (page - 1) * limit;

    const [items, total, aggregate] = await Promise.all([
      Order.find({ customerId: objectId, isActive: { $ne: false } })
        .populate("customerId", "_id code name phone")
        .populate("leadId", "_id leadCode")
        .populate("productId", "_id code name")
        .populate("comboId", "_id code name")
        .populate("warehouseId", "_id code name")
        .populate("marketingEmployeeId", "_id employeeCode fullName")
        .populate("saleEmployeeId", "_id employeeCode fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments({ customerId: objectId, isActive: { $ne: false } }),
      Order.aggregate<{ _id: null; totalRevenue: number; lastOrderDate: Date | null; firstOrderDate: Date | null }>([
        { $match: { customerId: objectId, isActive: { $ne: false } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            lastOrderDate: { $max: "$createdAt" },
            firstOrderDate: { $min: "$createdAt" },
          },
        },
      ]),
    ]);

    const stats = aggregate[0] ?? {
      _id: null,
      totalRevenue: 0,
      lastOrderDate: null,
      firstOrderDate: null,
    };
    const totalRevenue = stats.totalRevenue ?? 0;
    const totalOrders = total;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return success({
      customer: mappedCustomer,
      orders: {
        items: mapOrderList(items),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      statistics: {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        lastOrderDate: stats.lastOrderDate ? stats.lastOrderDate.toISOString() : null,
        firstOrderDate: stats.firstOrderDate ? stats.firstOrderDate.toISOString() : null,
      },
    });
  } catch (error) {
    console.error("Customer Lookup Error:", error);
    return serverError("Không thể tra cứu khách hàng");
  }
}

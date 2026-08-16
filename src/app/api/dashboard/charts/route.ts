/**
 * Dashboard Charts API Route
 *
 * GET /api/dashboard/charts?range=day|week|month
 *
 * Trả về dữ liệu chart cho `/dashboard`:
 *   - pipeline: phân bố trạng thái Lead/Order (real data).
 *   - revenue: doanh thu 6 tháng gần nhất (real data từ Order).
 *   - leadSource: phân bố nguồn Lead (real data).
 *   - topSale: top 5 nhân viên sale theo doanh thu đơn hàng (real data).
 *   - topMarketing: top 5 nhân viên MKT theo doanh thu đơn hàng (real data).
 *
 * Query `range` chỉ áp dụng cho `topMarketing` (day | week | month, mặc định month).
 *
 * Scope:
 *   - ADMIN / GLOBAL: xem tất cả.
 *   - Non-GLOBAL: filter theo scope (MKT / SALE / ...).
 */

import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { OrderHistory } from "@/models/OrderHistory";
import { Lead } from "@/models/Lead";
import Employee from "@/models/Employee";

import { OrderStatus } from "@/constants/orderStatus";
import { LeadStatus } from "@/constants/leadStatus";
import { SOURCE_TYPE_LABELS } from "@/models/Lead";

import {
  getCurrentUser,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth";
import { getAccountScope } from "@/lib/account-scope";

import type { TopMarketingRange } from "@/types/dashboard-chart";

const DEFAULT_RANGE: TopMarketingRange = "month";

function isTopMarketingRange(value: string): value is TopMarketingRange {
  return value === "day" || value === "week" || value === "month";
}

function getRangeBounds(range: TopMarketingRange): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );

  let start: Date;
  switch (range) {
    case "day":
      start = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          0,
          0,
          0,
          0
        )
      );
      break;
    case "week":
      start = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - 6,
          0,
          0,
          0,
          0
        )
      );
      break;
    default:
      start = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - 29,
          0,
          0,
          0,
          0
        )
      );
  }

  return { start, end };
}

/** 6 tháng gần nhất (YYYY-MM keys). */
function getLastSixMonths(): { start: Date; keys: string[] } {
  const now = new Date();
  const keys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)
    );
    keys.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    );
  }
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1, 0, 0, 0, 0)
  );
  return { start, keys };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get("range") ?? DEFAULT_RANGE;
    const range: TopMarketingRange = isTopMarketingRange(rangeParam)
      ? rangeParam
      : DEFAULT_RANGE;

    let currentUser;
    try {
      currentUser = await getCurrentUser(request);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return NextResponse.json(
          { success: false, message: err.message },
          { status: 401 }
        );
      }
      throw err;
    }

    const scope = getAccountScope(currentUser);
    const isGlobal = scope === "GLOBAL";
    const roleCode = currentUser.role.code;
    const userObjectId = new Types.ObjectId(
      currentUser.employee._id.toString()
    );

    const leadScopeMatch: Record<string, unknown> = { isActive: true };
    const orderScopeMatch: Record<string, unknown> = { isActive: true };
    if (!isGlobal) {
      if (roleCode === "MKT") {
        leadScopeMatch.marketingEmployeeId = userObjectId;
        orderScopeMatch.marketingEmployeeId = userObjectId;
      } else if (roleCode === "SALE") {
        leadScopeMatch.saleEmployeeId = userObjectId;
        orderScopeMatch.saleEmployeeId = userObjectId;
      } else {
        leadScopeMatch.saleEmployeeId = userObjectId;
        orderScopeMatch.saleEmployeeId = userObjectId;
      }
    }

    // ===== Pipeline (real) =====
    const [leadStatusAgg, orderStatusAgg] = await Promise.all([
      Lead.aggregate<{ _id: LeadStatus; count: number }>([
        { $match: leadScopeMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Order.aggregate<{ _id: OrderStatus; count: number }>([
        { $match: orderScopeMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const lcMap = new Map<LeadStatus, number>();
    for (const r of leadStatusAgg) lcMap.set(r._id, r.count);
    const ocMap = new Map<OrderStatus, number>();
    for (const r of orderStatusAgg) ocMap.set(r._id, r.count);

    const sumLeads = (...keys: LeadStatus[]) =>
      keys.reduce((s, k) => s + (lcMap.get(k) ?? 0), 0);
    const sumOrders = (...keys: OrderStatus[]) =>
      keys.reduce((s, k) => s + (ocMap.get(k) ?? 0), 0);

    const pipeline = [
      { label: "Mới", value: sumLeads(LeadStatus.NEW) },
      {
        label: "KNM",
        value: sumLeads(
          LeadStatus.CONTACTED,
          LeadStatus.QUALIFIED,
          LeadStatus.ASSIGNED,
          LeadStatus.PROCESSING
        ),
      },
      {
        label: "Chốt",
        value: sumLeads(LeadStatus.CLOSED, LeadStatus.ORDER_CREATED),
      },
      { label: "Đang giao", value: sumOrders(OrderStatus.SHIPPING) },
      {
        label: "Giao TC",
        value: sumOrders(OrderStatus.DELIVERED, OrderStatus.RECONCILED),
      },
      { label: "Hoàn hàng", value: sumOrders(OrderStatus.RETURNED) },
    ];

    // ===== Revenue (real — 6 tháng gần nhất) =====
    const { start: revStart, keys: monthKeys } = getLastSixMonths();
    const revenueMatch = {
      ...orderScopeMatch,
      createdAt: { $gte: revStart },
      status: { $ne: OrderStatus.CANCELLED },
    };
    const revenueAgg = await Order.aggregate<{
      _id: string;
      revenue: number;
    }>([
      { $match: revenueMatch },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$createdAt" },
          },
          revenue: { $sum: "$totalAmount" },
        },
      },
    ]);
    const revenueMap = new Map<string, number>();
    for (const r of revenueAgg) revenueMap.set(r._id, r.revenue ?? 0);
    const revenue = monthKeys.map((k) => ({
      date: k,
      revenue: revenueMap.get(k) ?? 0,
    }));

    // ===== Lead Source (real — group theo sourceType) =====
    const leadSourceAgg = await Lead.aggregate<{ _id: string; count: number }>([
      { $match: leadScopeMatch },
      { $group: { _id: "$sourceType", count: { $sum: 1 } } },
    ]);
    const leadSource = leadSourceAgg
      .map((r: { _id: string; count: number }) => ({
        source: SOURCE_TYPE_LABELS[r._id as keyof typeof SOURCE_TYPE_LABELS] ?? r._id,
        count: r.count,
      }))
      .sort(
        (a: { count: number }, b: { count: number }) => b.count - a.count
      );

    // ===== Top Sale (real — top 5 nhân viên sale theo doanh thu đơn) =====
    const topSaleMatch = {
      ...orderScopeMatch,
      saleEmployeeId: { $ne: null },
      status: { $ne: OrderStatus.CANCELLED },
    };
    const topSaleAgg = await Order.aggregate<{
      _id: Types.ObjectId;
      revenue: number;
    }>([
      { $match: topSaleMatch },
      {
        $group: {
          _id: "$saleEmployeeId",
          revenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]);
    const saleEmpIds = topSaleAgg
      .map((r) => r._id)
      .filter((id): id is Types.ObjectId => Boolean(id));
    const saleEmpDocs = saleEmpIds.length
      ? await Employee.find({ _id: { $in: saleEmpIds } })
          .select("_id fullName username")
          .lean()
      : [];
    const saleEmpMap = new Map<string, string>();
    for (const e of saleEmpDocs) {
      saleEmpMap.set(e._id.toString(), e.fullName || e.username || "Unknown");
    }
    const topSale = topSaleAgg.map((r) => ({
      name: saleEmpMap.get(r._id.toString()) ?? "Unknown",
      total: r.revenue ?? 0,
    }));

    // ===== Top Marketing (real — top 5 nhân viên MKT theo doanh thu đơn trong range) =====
    const { start, end } = getRangeBounds(range);
    const topMarketingMatch: Record<string, unknown> = {
      ...orderScopeMatch,
      marketingEmployeeId: { $ne: null },
      createdAt: { $gte: start, $lte: end },
      status: { $ne: OrderStatus.CANCELLED },
    };
    const topMarketingAgg = await Order.aggregate<{
      _id: Types.ObjectId;
      revenue: number;
      orders: number;
    }>([
      { $match: topMarketingMatch },
      {
        $group: {
          _id: "$marketingEmployeeId",
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]);
    const mktIds = topMarketingAgg
      .map((r) => r._id)
      .filter((id): id is Types.ObjectId => Boolean(id));
    const mktDocs = mktIds.length
      ? await Employee.find({ _id: { $in: mktIds } })
          .select("_id fullName username")
          .lean()
      : [];
    const mktMap = new Map<string, string>();
    for (const e of mktDocs) {
      mktMap.set(e._id.toString(), e.fullName || e.username || "Unknown");
    }
    const topMarketing = topMarketingAgg.map((r) => ({
      employeeId: r._id.toString(),
      name: mktMap.get(r._id.toString()) ?? "Unknown",
      revenue: r.revenue ?? 0,
      orders: r.orders ?? 0,
    }));

    // Suppress unused-import lint cho OrderHistory (giữ cho reference).
    void OrderHistory;

    return NextResponse.json({
      success: true,
      data: {
        pipeline,
        revenue,
        leadSource,
        topSale,
        topMarketing,
        _meta: {
          range,
          scope: isGlobal ? "GLOBAL" : "SELF",
          dateRange: {
            start: start.toISOString().slice(0, 10),
            end: end.toISOString().slice(0, 10),
          },
        },
      },
      message: "Dashboard chart data fetched successfully",
    });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json(
        { success: false, message: err.message },
        { status: 403 }
      );
    }
    console.error("Dashboard charts API error:", err);
    return NextResponse.json(
      { success: false, message: "Không thể tải dữ liệu biểu đồ dashboard" },
      { status: 500 }
    );
  }
}
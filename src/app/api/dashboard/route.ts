/**
 * Dashboard API Route
 *
 * GET /api/dashboard
 *
 * Trả về dữ liệu tổng quan cho `/dashboard`:
 *   - summary: KPI stats tổng hợp (Leads, Orders, Revenue) với trend.
 *   - pipeline: phân bố theo trạng thái Lead / Order.
 *
 * Toàn bộ dữ liệu tính từ MongoDB (Lead + Order collections) — không mock.
 *
 * Scope:
 *   - ADMIN / GLOBAL: xem tất cả data.
 *   - MKT (SELF): chỉ thấy leads/orders do mình phụ trách (`marketingEmployeeId`).
 *   - SALE (SELF): chỉ thấy leads/orders do mình phụ trách (`saleEmployeeId`).
 *
 * Trend so sánh với cùng kỳ 30 ngày trước (revenue).
 *
 * Performance:
 *   - Pipeline + current + previous aggregations gộp thành 1 pipeline per collection
 *     (dùng `$cond` để phân biệt period). Giảm từ 5 round-trips xuống 2.
 *   - `$project` sớm để drop các field nặng (orderItems, payments, summary).
 *   - Wrap toàn bộ DB work trong `unstable_cache` với revalidate 30s.
 */

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { unstable_cache } from "next/cache";

import { connectDB } from "@/lib/mongodb";
import { Lead } from "@/models/Lead";
import Order from "@/models/Order";

import { OrderStatus } from "@/constants/orderStatus";
import { LeadStatus } from "@/constants/leadStatus";

import {
  getCurrentUser,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth";
import { getAccountScope } from "@/lib/account-scope";

import type {
  DashboardPipeline,
  DashboardResponse,
  DashboardSummary,
  DashboardTrend,
  DashboardPeriod,
} from "@/types/dashboard";

/** Validate period string from query. */
function parsePeriod(raw: string | null): DashboardPeriod {
  const valid: DashboardPeriod[] = ["1d", "3d", "7d", "month", "prev_month"];
  if (raw && valid.includes(raw as DashboardPeriod)) {
    return raw as DashboardPeriod;
  }
  return "month";
}

/**
 * Compute UTC start/end for the current window based on period.
 */
function getWindowByPeriod(period: DashboardPeriod): {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
} {
  const now = new Date();
  const todayEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );

  let start: Date;
  let end: Date = todayEnd;
  let prevLengthDays: number;

  switch (period) {
    case "1d": {
      start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
      );
      prevLengthDays = 1;
      break;
    }
    case "3d": {
      start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 2, 0, 0, 0, 0)
      );
      prevLengthDays = 3;
      break;
    }
    case "7d": {
      start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6, 0, 0, 0, 0)
      );
      prevLengthDays = 7;
      break;
    }
    case "month": {
      start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
      );
      const currentLength = now.getUTCDate();
      prevLengthDays = currentLength;
      const prevEnd = new Date(start.getTime() - 1);
      const prevStart = new Date(
        Date.UTC(
          prevEnd.getUTCFullYear(),
          prevEnd.getUTCMonth(),
          prevEnd.getUTCDate() - prevLengthDays + 1,
          0, 0, 0, 0
        )
      );
      return { start, end, previousStart: prevStart, previousEnd: prevEnd };
    }
    case "prev_month": {
      const prevMonth = now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1;
      const prevYear = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
      const daysInPrevMonth = new Date(
        Date.UTC(prevYear, prevMonth + 1, 0)
      ).getUTCDate();
      start = new Date(Date.UTC(prevYear, prevMonth, 1, 0, 0, 0, 0));
      end = new Date(
        Date.UTC(prevYear, prevMonth, daysInPrevMonth, 23, 59, 59, 999)
      );
      prevLengthDays = daysInPrevMonth;
      break;
    }
  }

  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(
    Date.UTC(
      previousEnd.getUTCFullYear(),
      previousEnd.getUTCMonth(),
      previousEnd.getUTCDate() - prevLengthDays + 1,
      0, 0, 0, 0
    )
  );
  return { start, end, previousStart, previousEnd };
}

function makeTrend(current: number, previous: number): DashboardTrend {
  if (previous <= 0) {
    if (current > 0) return { percent: 100, direction: "up" };
    return { percent: 0, direction: "flat" };
  }
  const diff = ((current - previous) / previous) * 100;
  const rounded = Math.round(diff * 10) / 10;
  if (Math.abs(rounded) < 0.05) return { percent: 0, direction: "flat" };
  return {
    percent: Math.abs(rounded),
    direction: rounded > 0 ? "up" : "down",
  };
}

interface DashboardQueryArgs {
  scope: "GLOBAL" | "SELF";
  roleCode: string;
  period: DashboardPeriod;
  userObjectId: string;
}

async function fetchDashboardData(args: DashboardQueryArgs): Promise<DashboardResponse> {
  const { scope, roleCode, period, userObjectId } = args;
  const userOid = new Types.ObjectId(userObjectId);

  const leadScopeMatch: Record<string, unknown> = {};
  const orderScopeMatch: Record<string, unknown> = { isActive: true };
  if (scope !== "GLOBAL") {
    // Non-GLOBAL: scope theo role của user (MKT/SALE/...).
    if (roleCode === "MKT") {
      leadScopeMatch.marketingEmployeeId = userOid;
      orderScopeMatch.marketingEmployeeId = userOid;
    } else if (roleCode === "SALE") {
      leadScopeMatch.saleEmployeeId = userOid;
      orderScopeMatch.saleEmployeeId = userOid;
    } else {
      // WAREHOUSE / EMPLOYEE / LEADER / MANAGER: mặc định chỉ thấy lead/ord do mình phụ trách.
      leadScopeMatch.saleEmployeeId = userOid;
      orderScopeMatch.saleEmployeeId = userOid;
    }
  }

  const { start, end, previousStart, previousEnd } = getWindowByPeriod(period);

  // ===== Gộp 4 aggregation (pipeline + current + previous) thành 2 pipeline =====
  // Lead: group by status, period (cur/prev) — 1 round-trip
  // Order: group by status, period (cur/prev) — 1 round-trip
  const [leadGrouped, orderGrouped] = await Promise.all([
    Lead.aggregate<{
      _id: { status: LeadStatus; period: "cur" | "prev" };
      count: number;
      revenue: number;
    }>([
      {
        $match: {
          ...leadScopeMatch,
          isActive: true,
          createdAt: { $gte: previousStart, $lte: end },
        },
      },
      // Drop các field nặng để $group chỉ làm việc trên các field cần thiết.
      {
        $project: {
          _id: 0,
          status: 1,
          unitPriceMNT: { $ifNull: ["$unitPriceMNT", 0] },
          createdAt: 1,
        },
      },
      {
        $group: {
          _id: {
            status: "$status",
            period: { $cond: [{ $gte: ["$createdAt", start] }, "cur", "prev"] },
          },
          count: { $sum: 1 },
          revenue: { $sum: "$unitPriceMNT" },
        },
      },
    ]),
    Order.aggregate<{
      _id: { status: OrderStatus; period: "cur" | "prev" };
      count: number;
      revenue: number;
    }>([
      {
        $match: {
          ...orderScopeMatch,
          createdAt: { $gte: previousStart, $lte: end },
        },
      },
      {
        $project: {
          _id: 0,
          status: 1,
          totalAmount: 1,
          createdAt: 1,
        },
      },
      {
        $group: {
          _id: {
            status: "$status",
            period: { $cond: [{ $gte: ["$createdAt", start] }, "cur", "prev"] },
          },
          count: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
    ]),
  ]);

  // ===== Build pipeline (toàn thời gian — group theo status, bỏ qua period) =====
  const leadCountsAll = new Map<LeadStatus, number>();
  const orderCountsAll = new Map<OrderStatus, number>();
  // Current/previous counters
  const curLeadCounts = new Map<LeadStatus, number>();
  const curOrderCounts = new Map<OrderStatus, number>();
  let curLeadRevenue = 0;
  let curOrderRevenue = 0;
  let prevOrderRevenue = 0;
  let curTotalOrders = 0;

  for (const row of leadGrouped) {
    const s = row._id.status;
    leadCountsAll.set(s, (leadCountsAll.get(s) ?? 0) + row.count);
    if (row._id.period === "cur") {
      curLeadCounts.set(s, row.count);
      curLeadRevenue += row.revenue;
    }
  }
  for (const row of orderGrouped) {
    const s = row._id.status;
    orderCountsAll.set(s, (orderCountsAll.get(s) ?? 0) + row.count);
    if (row._id.period === "cur") {
      curOrderCounts.set(s, row.count);
      curTotalOrders += row.count;
      if (s !== OrderStatus.CANCELLED) curOrderRevenue += row.revenue;
    } else {
      if (s !== OrderStatus.CANCELLED) prevOrderRevenue += row.revenue;
    }
  }

  const sumLeads = (...keys: LeadStatus[]) =>
    keys.reduce((s, k) => s + (leadCountsAll.get(k) ?? 0), 0);
  const sumOrders = (...keys: OrderStatus[]) =>
    keys.reduce((s, k) => s + (orderCountsAll.get(k) ?? 0), 0);

  const pipeline: DashboardPipeline = {
    new: sumLeads(LeadStatus.NEW),
    contacted: sumLeads(
      LeadStatus.CONTACTED,
      LeadStatus.QUALIFIED,
      LeadStatus.ASSIGNED,
      LeadStatus.PROCESSING
    ),
    closed: sumLeads(LeadStatus.CLOSED, LeadStatus.ORDER_CREATED),
    shipping: sumOrders(OrderStatus.SHIPPING),
    delivered: sumOrders(OrderStatus.DELIVERED, OrderStatus.RECONCILED),
    returned: sumOrders(OrderStatus.RETURNED),
    cancelled: sumOrders(OrderStatus.CANCELLED),
  };

  const totalLeads = Array.from(curLeadCounts.values()).reduce(
    (s, v) => s + v,
    0
  );
  const closedLeads =
    (curLeadCounts.get(LeadStatus.CLOSED) ?? 0) +
    (curLeadCounts.get(LeadStatus.ORDER_CREATED) ?? 0);
  const shippingOrders = curOrderCounts.get(OrderStatus.SHIPPING) ?? 0;
  const deliveredOrders =
    (curOrderCounts.get(OrderStatus.DELIVERED) ?? 0) +
    (curOrderCounts.get(OrderStatus.RECONCILED) ?? 0);
  const returnedOrders = curOrderCounts.get(OrderStatus.RETURNED) ?? 0;
  const cancelledOrders = curOrderCounts.get(OrderStatus.CANCELLED) ?? 0;

  const trend = makeTrend(curOrderRevenue, prevOrderRevenue);

  const summary: DashboardSummary = {
    totalLeads,
    closedLeads,
    shippingOrders,
    deliveredOrders,
    returnedOrders,
    cancelledOrders,
    revenue: curOrderRevenue,
    totalOrders: curTotalOrders,
    trend,
  };

  return { summary, pipeline };
}

export async function GET(request: Request) {
  try {
    await connectDB();

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

    const { searchParams } = new URL(request.url);
    const period = parsePeriod(searchParams.get("period"));
    const accountScope = getAccountScope(currentUser);
    const isGlobal = accountScope === "GLOBAL";
    const scope = isGlobal ? "GLOBAL" : "SELF";
    const roleCode = currentUser.role.code;
    const userObjectId = currentUser.employee._id.toString();
    const today = new Date().toISOString().slice(0, 10);

    // Cache 30s cho mỗi (scope, roleCode, period, userId). Include today in key
    // so that "current period" aggregations don't serve stale yesterday data.
    const cachedFetch = unstable_cache(
      async () => fetchDashboardData({ scope, roleCode, period, userObjectId }),
      [`dashboard:summary:${scope}:${roleCode}:${period}:${userObjectId}:${today}`],
      { revalidate: 30, tags: [`dashboard:${userObjectId}`] }
    );

    const data = await cachedFetch();

    return NextResponse.json({
      success: true,
      data,
      message: "Dashboard data fetched successfully",
    });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json(
        { success: false, message: err.message },
        { status: 403 }
      );
    }
    console.error("Dashboard API error:", err);
    return NextResponse.json(
      { success: false, message: "Không thể tải dữ liệu dashboard" },
      { status: 500 }
    );
  }
}

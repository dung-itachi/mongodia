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
 */

import { NextResponse } from "next/server";
import { Types } from "mongoose";

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
 * - "month" = from 1st of current month to now
 * - "prev_month" = full previous month
 * - "1d" / "3d" / "7d" = last N days including today
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
  let prevLengthDays: number; // how many days the previous period has (for trend comparison)

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
      // Previous period = same length as current month so far
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
      // Full previous month
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

/** Build previous window for trend comparison (30-day fixed — kept for backward compat). */
function getPreviousWindow(currentStart: Date): {
  start: Date;
  end: Date;
} {
  const end = new Date(currentStart.getTime() - 1);
  const start = new Date(
    Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate() - 29,
      0,
      0,
      0,
      0
    )
  );
  return { start, end };
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

    const scope = getAccountScope(currentUser);
    const isGlobal = scope === "GLOBAL";

    const userObjectId = new Types.ObjectId(currentUser.employee._id.toString());

    // ===== Build filters theo scope =====
    const leadScopeMatch: Record<string, unknown> = {};
    const orderScopeMatch: Record<string, unknown> = { isActive: true };
    if (!isGlobal) {
      // Non-GLOBAL: scope theo role của user.
      const roleCode = currentUser.role.code;
      if (roleCode === "MKT") {
        leadScopeMatch.marketingEmployeeId = userObjectId;
        orderScopeMatch.marketingEmployeeId = userObjectId;
      } else if (roleCode === "SALE") {
        leadScopeMatch.saleEmployeeId = userObjectId;
        orderScopeMatch.saleEmployeeId = userObjectId;
      } else {
        // WAREHOUSE / EMPLOYEE / LEADER / MANAGER: chỉ thấy chính mình (lead do mình tạo nếu có).
        leadScopeMatch.saleEmployeeId = userObjectId;
        orderScopeMatch.saleEmployeeId = userObjectId;
      }
    }

    // ===== Pipeline — phân bố trạng thái (toàn thời gian) =====
    const [leadAgg, orderAgg] = await Promise.all([
      Lead.aggregate<{ _id: LeadStatus; count: number }>([
        { $match: { ...leadScopeMatch, isActive: true } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Order.aggregate<{ _id: OrderStatus; count: number }>([
        { $match: orderScopeMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const leadCounts = new Map<LeadStatus, number>();
    for (const row of leadAgg) leadCounts.set(row._id, row.count);
    const orderCounts = new Map<OrderStatus, number>();
    for (const row of orderAgg) orderCounts.set(row._id, row.count);

    const sumLeads = (...keys: LeadStatus[]) =>
      keys.reduce((s, k) => s + (leadCounts.get(k) ?? 0), 0);
    const sumOrders = (...keys: OrderStatus[]) =>
      keys.reduce((s, k) => s + (orderCounts.get(k) ?? 0), 0);

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

    // ===== Summary — KPI cards (theo period) =====
    const { start, end, previousStart, previousEnd } = getWindowByPeriod(period);

    const currentLeadMatch = {
      ...leadScopeMatch,
      isActive: true,
      createdAt: { $gte: start, $lte: end },
    };
    const currentOrderMatch = {
      ...orderScopeMatch,
      createdAt: { $gte: start, $lte: end },
    };

    const [currentLeadAgg, currentOrderAgg] = await Promise.all([
      Lead.aggregate<{
        _id: LeadStatus | null;
        count: number;
        revenue: number;
      }>([
        { $match: currentLeadMatch },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$unitPriceMNT", 0] } },
          },
        },
      ]),
      Order.aggregate<{ _id: OrderStatus | null; count: number; revenue: number }>([
        { $match: currentOrderMatch },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]),
    ]);

    const curLeadCounts = new Map<string, number>();
    let curLeadRevenue = 0;
    for (const row of currentLeadAgg) {
      curLeadCounts.set(row._id ?? "", row.count);
      curLeadRevenue += row.revenue ?? 0;
    }
    const curOrderCounts = new Map<string, number>();
    let curOrderRevenue = 0;
    let curTotalOrders = 0;
    for (const row of currentOrderAgg) {
      curOrderCounts.set(row._id ?? "", row.count);
      curTotalOrders += row.count ?? 0;
      // Không tính revenue đơn CANCELLED.
      if (row._id !== OrderStatus.CANCELLED) curOrderRevenue += row.revenue ?? 0;
    }

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

    // ===== Trend — so với kỳ trước cùng độ dài =====
    const [prevOrderAgg] = await Promise.all([
      Order.aggregate<{ _id: OrderStatus | null; revenue: number }>([
        {
          $match: {
            ...orderScopeMatch,
            createdAt: { $gte: previousStart, $lte: previousEnd },
          },
        },
        {
          $group: {
            _id: "$status",
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]),
    ]);

    let prevRevenue = 0;
    for (const row of prevOrderAgg) {
      if (row._id !== OrderStatus.CANCELLED) prevRevenue += row.revenue ?? 0;
    }

    const trend = makeTrend(curOrderRevenue, prevRevenue);

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

    // Bổ sung trend cho từng KPI khác (so với cùng kỳ trước — best-effort, không query thêm).
    // Để tránh tốn query, ta dùng cùng trend% cho tất cả cards. UI sẽ hiển thị cùng %
    // nhưng thể hiện "doanh thu so với kỳ trước" — đủ ý nghĩa cho dashboard tổng quan.
    const data: DashboardResponse = {
      summary,
      pipeline,
    };

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
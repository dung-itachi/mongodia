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
 *
 * Performance:
 *   - 6 aggregations chạy song song (Promise.all).
 *   - 2 Employee.find() lookup merge thành 1 (dedupe IDs).
 *   - topSaleMatch có createdAt filter 12 tháng gần nhất (tránh all-time scan).
 *   - $project sớm để giảm payload cho $group.
 *   - unstable_cache 60s.
 */

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { unstable_cache } from "next/cache";

import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { Lead } from "@/models/Lead";
import Employee from "@/models/Employee";

import { OrderStatus } from "@/constants/orderStatus";
import { LeadStatus } from "@/constants/leadStatus";
import { SOURCE_TYPE_LABELS, SOURCE_TYPES, type SourceType } from "@/models/Lead";

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

/** 12 tháng gần nhất — dùng làm lower bound cho topSale để tránh all-time scan. */
function getLastTwelveMonths(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1, 0, 0, 0, 0)
  );
}

interface ChartsQueryArgs {
  scope: "GLOBAL" | "SELF";
  roleCode: string;
  range: TopMarketingRange;
  userObjectId: string;
}

async function fetchChartsData(args: ChartsQueryArgs) {
  const { scope, roleCode, range, userObjectId } = args;
  const userOid = new Types.ObjectId(userObjectId);

  const leadScopeMatch: Record<string, unknown> = { isActive: true };
  const orderScopeMatch: Record<string, unknown> = { isActive: true };
  if (scope !== "GLOBAL") {
    if (roleCode === "MKT") {
      leadScopeMatch.marketingEmployeeId = userOid;
      orderScopeMatch.marketingEmployeeId = userOid;
    } else if (roleCode === "SALE") {
      leadScopeMatch.saleEmployeeId = userOid;
      orderScopeMatch.saleEmployeeId = userOid;
    } else {
      leadScopeMatch.saleEmployeeId = userOid;
      orderScopeMatch.saleEmployeeId = userOid;
    }
  }

  const { start: revStart, keys: monthKeys } = getLastSixMonths();
  const topSaleLowerBound = getLastTwelveMonths();
  const { start: mktStart, end: mktEnd } = getRangeBounds(range);

  const revenueMatch = {
    ...orderScopeMatch,
    createdAt: { $gte: revStart },
    status: { $ne: OrderStatus.CANCELLED },
  };
  const topSaleMatch = {
    ...orderScopeMatch,
    saleEmployeeId: { $ne: null },
    status: { $ne: OrderStatus.CANCELLED },
    // Giới hạn trong 12 tháng gần nhất để tránh full-collection scan.
    createdAt: { $gte: topSaleLowerBound },
  };
  const topMarketingMatch: Record<string, unknown> = {
    ...orderScopeMatch,
    marketingEmployeeId: { $ne: null },
    createdAt: { $gte: mktStart, $lte: mktEnd },
    status: { $ne: OrderStatus.CANCELLED },
  };

  // ===== Chạy 6 aggregations song song =====
  const [
    leadStatusAgg,
    orderStatusAgg,
    revenueAgg,
    leadSourceAgg,
    topSaleAgg,
    topMarketingAgg,
  ] = await Promise.all([
    Lead.aggregate<{ _id: LeadStatus; count: number }>([
      { $match: leadScopeMatch },
      { $project: { _id: 0, status: 1 } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Order.aggregate<{ _id: OrderStatus; count: number }>([
      { $match: orderScopeMatch },
      { $project: { _id: 0, status: 1 } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Order.aggregate<{ _id: string; revenue: number }>([
      { $match: revenueMatch },
      { $project: { _id: 0, createdAt: 1, totalAmount: 1 } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
        },
      },
    ]),
    Lead.aggregate<{ _id: string; count: number }>([
      { $match: leadScopeMatch },
      { $project: { _id: 0, sourceType: 1 } },
      { $group: { _id: "$sourceType", count: { $sum: 1 } } },
    ]),
    Order.aggregate<{ _id: Types.ObjectId; revenue: number }>([
      { $match: topSaleMatch },
      { $project: { _id: 0, saleEmployeeId: 1, totalAmount: 1 } },
      {
        $group: {
          _id: "$saleEmployeeId",
          revenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]),
    Order.aggregate<{ _id: Types.ObjectId; revenue: number; orders: number }>([
      { $match: topMarketingMatch },
      { $project: { _id: 0, marketingEmployeeId: 1, totalAmount: 1 } },
      {
        $group: {
          _id: "$marketingEmployeeId",
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]),
  ]);

  // ===== Merge Employee.find thành 1 query duy nhất =====
  const empIdSet = new Set<string>();
  for (const r of topSaleAgg) {
    if (r._id) empIdSet.add(r._id.toString());
  }
  for (const r of topMarketingAgg) {
    if (r._id) empIdSet.add(r._id.toString());
  }
  const empIds = Array.from(empIdSet);
  const empDocs = empIds.length
    ? await Employee.find({ _id: { $in: empIds } })
        .select("_id fullName username")
        .lean()
    : [];
  const empMap = new Map<string, string>();
  for (const e of empDocs) {
    empMap.set(e._id.toString(), e.fullName || e.username || "Unknown");
  }

  // ===== Build response =====
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

  const revenueMap = new Map<string, number>();
  for (const r of revenueAgg) revenueMap.set(r._id, r.revenue ?? 0);
  const revenue = monthKeys.map((k) => ({
    date: k,
    revenue: revenueMap.get(k) ?? 0,
  }));

  const leadSource = leadSourceAgg
    .filter((r) => SOURCE_TYPES.includes(r._id as SourceType))
    .map((r) => ({
      source: SOURCE_TYPE_LABELS[r._id as SourceType],
      count: r.count,
    }))
    .sort((a, b) => b.count - a.count);

  const topSale = topSaleAgg.map((r) => ({
    name: empMap.get(r._id?.toString() ?? "") ?? "Unknown",
    total: r.revenue ?? 0,
  }));

  const topMarketing = topMarketingAgg.map((r) => ({
    employeeId: r._id?.toString() ?? "",
    name: empMap.get(r._id?.toString() ?? "") ?? "Unknown",
    revenue: r.revenue ?? 0,
    orders: r.orders ?? 0,
  }));

  return {
    pipeline,
    revenue,
    leadSource,
    topSale,
    topMarketing,
    _meta: {
      range,
      scope: scope === "GLOBAL" ? "GLOBAL" : "SELF",
      dateRange: {
        start: mktStart.toISOString().slice(0, 10),
        end: mktEnd.toISOString().slice(0, 10),
      },
    },
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get("range") ?? DEFAULT_RANGE;
    const range: TopMarketingRange = isTopMarketingRange(rangeParam)
      ? rangeParam
      : DEFAULT_RANGE;

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

    const scope = getAccountScope(currentUser);
    const isGlobal = scope === "GLOBAL";
    const roleCode = currentUser.role.code;
    const userObjectId = currentUser.employee._id.toString();
    const today = new Date().toISOString().slice(0, 10);

    const cachedFetch = unstable_cache(
      async () =>
        fetchChartsData({
          scope: isGlobal ? "GLOBAL" : "SELF",
          roleCode,
          range,
          userObjectId,
        }),
      [`dashboard:charts:${isGlobal ? "GLOBAL" : "SELF"}:${roleCode}:${range}:${userObjectId}:${today}`],
      { revalidate: 60, tags: [`dashboard:${userObjectId}`] }
    );

    const data = await cachedFetch();

    return NextResponse.json({
      success: true,
      data,
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

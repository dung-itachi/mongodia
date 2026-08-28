/**
 * Daily Report API Route
 *
 * GET /api/marketing/dashboard/daily-report
 *
 * Trả về dữ liệu chi tiết theo từng ngày:
 * - 📈 Doanh số theo ngày (từ Order)
 * - 📊 Báo cáo Ads theo ngày (từ MarketingExpenseReport)
 *
 * Scope (Sprint 7.4 — fix "Doanh số theo ngày" theo tài khoản đăng nhập):
 * - MKT (non-admin): chỉ thấy đơn của chính mình (filter `marketingEmployeeId`).
 * - ADMIN / GLOBAL: thấy tất cả MKT, có thể chọn riêng 1 MKT qua query `marketingEmployeeId`.
 * - Báo cáo Ads cũng filter theo cùng scope.
 *
 * Sprint 8.X — Additional filters:
 * - `areaId`: lọc theo khu vực (được resolve thành danh sách employeeId trong area đó).
 * - `teamId`: lọc theo team (được resolve thành danh sách employeeId trong team đó).
 * - Priority: marketingEmployeeId > teamId > areaId (mỗi param override previous).
 */

import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { MarketingExpenseReport } from "@/models/MarketingExpenseReport";
import Employee from "@/models/Employee";
import Team from "@/models/Team";
import Area from "@/models/Area";
import { OrderStatus } from "@/constants/orderStatus";
import { getCurrentUser, UnauthorizedError, ForbiddenError } from "@/lib/auth";
import { getAccountScope } from "@/lib/account-scope";
import { success, error as errorResponse } from "@/utils/response";

/**
 * Resolve an areaId or teamId into a list of marketing employee ObjectIds.
 * Returns undefined when no such filter should be applied.
 *
 * NOTE: areaId/teamId values are CODE strings (e.g., "PVD"), not ObjectIds.
 */
async function resolveMarketingEmployeeIds(params: {
  areaId?: string | null;
  teamId?: string | null;
  marketingEmployeeId?: string | null;
}): Promise<string[] | undefined> {
  if (params.marketingEmployeeId) {
    return [params.marketingEmployeeId];
  }

  const { areaId, teamId } = params;

  if (teamId && teamId !== "__all__") {
    // Query by code (string) since Team uses code as identifier
    const team = await Team.findOne({ code: teamId }).select("leaderId managerId").lean();
    if (!team) return [];
    const ids = new Set<string>();
    if (team.leaderId) ids.add(team.leaderId.toString());
    if (team.managerId) ids.add(team.managerId.toString());
    const members = await Employee.find({ teamId: team._id })
      .select("_id")
      .lean();
    members.forEach((e) => ids.add(e._id.toString()));
    return ids.size > 0 ? Array.from(ids) : undefined;
  }

  if (areaId && areaId !== "__all__") {
    // Query by code (string) since Area uses code as identifier (e.g., "PVD")
    const area = await Area.findOne({ code: areaId }).select("teamIds").lean();
    if (!area || !area.teamIds || area.teamIds.length === 0) return [];
    const employeeIds = new Set<string>();
    for (const teamId2 of area.teamIds) {
      const members = await Employee.find({ teamId: teamId2 })
        .select("_id")
        .lean();
      members.forEach((e) => employeeIds.add(e._id.toString()));
    }
    return employeeIds.size > 0 ? Array.from(employeeIds) : undefined;
  }

  return undefined;
}

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    const dateStr = searchParams.get("date"); // Optional: filter by specific date
    const marketingEmployeeIdParam = searchParams.get("marketingEmployeeId");
    const areaIdParam = searchParams.get("areaId");
    const teamIdParam = searchParams.get("teamId");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const groupBy = searchParams.get("groupBy"); // "employee" | null

    // ----------------------------------------------------------------
    // Auth & scope
    // ----------------------------------------------------------------
    let currentUser;
    try {
      currentUser = await getCurrentUser(request);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return errorResponse(err.message, 401);
      }
      throw err;
    }

    const scope = getAccountScope(currentUser);
    const isGlobal = scope === "GLOBAL";

    // Resolve effective marketingEmployeeId filter:
    // - Non-GLOBAL user bị khoá cứng theo chính mình.
    // - GLOBAL user: nếu truyền marketingEmployeeId thì lọc theo; không truyền = tất cả.
    // Priority: marketingEmployeeId > teamId > areaId.
    let effectiveMarketingEmployeeId: string | null = null;
    if (!isGlobal) {
      effectiveMarketingEmployeeId = currentUser.employee._id.toString();
    } else if (marketingEmployeeIdParam && marketingEmployeeIdParam.trim()) {
      effectiveMarketingEmployeeId = marketingEmployeeIdParam.trim();
    }

    // Resolve area/team into a list of marketing employee IDs for $in queries.
    const resolvedEmployeeIds = await resolveMarketingEmployeeIds({
      marketingEmployeeId: effectiveMarketingEmployeeId,
      areaId: areaIdParam,
      teamId: teamIdParam,
    });

    // Calculate date range (from explicit params OR period)
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else if (dateStr) {
      // Filter by specific date
      startDate = new Date(dateStr);
      endDate = new Date(dateStr);
      endDate.setUTCHours(23, 59, 59, 999);
    } else {
      // Calculate based on period
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

      switch (period) {
        case "7d":
          startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6, 0, 0, 0, 0));
          break;
        case "30d":
          startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29, 0, 0, 0, 0));
          break;
        case "90d":
          startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 89, 0, 0, 0, 0));
          break;
        default:
          startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6, 0, 0, 0, 0));
      }
    }

    // Build match stages applying scope
    const orderMatch: Record<string, unknown> = {
      createdAt: { $gte: startDate, $lte: endDate },
      isActive: true,
      status: { $nin: [OrderStatus.CANCELLED, OrderStatus.RETURNED] },
    };
    if (resolvedEmployeeIds && resolvedEmployeeIds.length > 0) {
      orderMatch.marketingEmployeeId = { $in: resolvedEmployeeIds };
    }

    const adsMatch: Record<string, unknown> = {
      reportDate: { $gte: startDate, $lte: endDate },
      isActive: { $ne: false },
    };
    if (resolvedEmployeeIds && resolvedEmployeeIds.length > 0) {
      adsMatch.marketingEmployeeId = { $in: resolvedEmployeeIds };
    }

    // Fetch Revenue Data (Orders) by day
    // If groupBy=employee, include marketingEmployeeId in grouping for per-MKT breakdown
    const revenueByDayPipeline: import("mongoose").PipelineStage[] = [
      { $match: orderMatch },
      {
        $group: groupBy === "employee"
          ? {
              _id: {
                date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                marketingEmployeeId: "$marketingEmployeeId",
              },
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: "$totalAmount" },
              avgOrderValue: { $avg: "$totalAmount" },
              pushed: { $sum: 1 },
              called: { $sum: { $cond: [{ $ne: ["$status", OrderStatus.WAIT_CONFIRM] }, 1, 0] } },
              closed: { $sum: { $cond: [{ $in: ["$status", [OrderStatus.CONFIRMED, OrderStatus.PACKING, OrderStatus.SHIPPING, OrderStatus.DELIVERED, OrderStatus.RETURNED, OrderStatus.RECONCILED]] }, 1, 0] } },
              shipped: { $sum: { $cond: [{ $in: ["$status", [OrderStatus.SHIPPING, OrderStatus.DELIVERED, OrderStatus.RECONCILED]] }, 1, 0] } },
              deliveredOk: { $sum: { $cond: [{ $in: ["$status", [OrderStatus.DELIVERED, OrderStatus.RECONCILED]] }, 1, 0] } },
            }
          : {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: "$totalAmount" },
              avgOrderValue: { $avg: "$totalAmount" },
              pushed: { $sum: 1 },
              called: { $sum: { $cond: [{ $ne: ["$status", OrderStatus.WAIT_CONFIRM] }, 1, 0] } },
              closed: { $sum: { $cond: [{ $in: ["$status", [OrderStatus.CONFIRMED, OrderStatus.PACKING, OrderStatus.SHIPPING, OrderStatus.DELIVERED, OrderStatus.RETURNED, OrderStatus.RECONCILED]] }, 1, 0] } },
              shipped: { $sum: { $cond: [{ $in: ["$status", [OrderStatus.SHIPPING, OrderStatus.DELIVERED, OrderStatus.RECONCILED]] }, 1, 0] } },
              deliveredOk: { $sum: { $cond: [{ $in: ["$status", [OrderStatus.DELIVERED, OrderStatus.RECONCILED]] }, 1, 0] } },
            },
      },
      { $sort: { ...(groupBy === "employee" ? { "_id.date": 1 } : { _id: 1 }) } },
      {
        $project: {
          _id: 0,
          ...(groupBy === "employee"
            ? { date: "$_id.date", marketingEmployeeId: "$_id.marketingEmployeeId" }
            : { date: "$_id" }),
          totalOrders: 1,
          totalRevenue: 1,
          avgOrderValue: 1,
          pushed: 1,
          called: 1,
          closed: 1,
          shipped: 1,
          deliveredOk: 1,
        },
      },
    ];
    const revenueByDay = await Order.aggregate(revenueByDayPipeline);

    // Fetch Ads Expense Data by day
    const adsByDayPipeline: import("mongoose").PipelineStage[] = [
      { $match: adsMatch },
      {
        $group: groupBy === "employee"
          ? {
              _id: {
                date: { $dateToString: { format: "%Y-%m-%d", date: "$reportDate" } },
                marketingEmployeeId: "$marketingEmployeeId",
              },
              totalSpent: { $sum: { $add: [{ $ifNull: ["$spentBudget.morning", 0] }, { $ifNull: ["$spentBudget.afternoon", 0] }, { $ifNull: ["$spentBudget.emergency", 0] }] } },
              totalRevenue: { $sum: "$totalRevenue" },
              totalLeads: { $sum: "$totalLeads" },
              closedLeads: { $sum: "$closedLeads" },
            }
          : {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$reportDate" } },
              totalSpent: { $sum: { $add: [{ $ifNull: ["$spentBudget.morning", 0] }, { $ifNull: ["$spentBudget.afternoon", 0] }, { $ifNull: ["$spentBudget.emergency", 0] }] } },
              totalRevenue: { $sum: "$totalRevenue" },
              totalLeads: { $sum: "$totalLeads" },
              closedLeads: { $sum: "$closedLeads" },
            },
      },
      { $sort: groupBy === "employee" ? { "_id.date": 1 } : { _id: 1 } },
      {
        $project: {
          _id: 0,
          ...(groupBy === "employee"
            ? { date: "$_id.date", marketingEmployeeId: "$_id.marketingEmployeeId" }
            : { date: "$_id" }),
          totalSpent: 1,
          totalRevenue: 1,
          totalLeads: 1,
          closedLeads: 1,
          roas: { $cond: [{ $gt: ["$totalSpent", 0] }, { $round: [{ $divide: ["$totalRevenue", "$totalSpent"] }, 2] }, 0] },
        },
      },
    ];
    const adsByDay = await MarketingExpenseReport.aggregate(adsByDayPipeline);

    // Merge data by date
    const dateMap = new Map<
      string,
      {
        date: string;
        revenue: number;
        orders: number;
        avgOrder: number;
        adsSpent: number;
        adsRevenue: number;
        leads: number;
        closedLeads: number;
        roas: number;
        pushed: number;
        called: number;
        closed: number;
        shipped: number;
        deliveredOk: number;
      }
    >();

    // Initialize all dates in range
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const dateKey = cursor.toISOString().slice(0, 10);
      dateMap.set(dateKey, {
        date: dateKey,
        revenue: 0,
        orders: 0,
        avgOrder: 0,
        adsSpent: 0,
        adsRevenue: 0,
        leads: 0,
        closedLeads: 0,
        roas: 0,
        pushed: 0,
        called: 0,
        closed: 0,
        shipped: 0,
        deliveredOk: 0,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    // Fill in revenue data
    for (const item of revenueByDay) {
      if (groupBy === "employee") {
        const eid = item.marketingEmployeeId as unknown as string;
        if (!eid) continue;
      }
      const existing = dateMap.get(item.date);
      if (existing) {
        existing.revenue = item.totalRevenue;
        existing.orders = item.totalOrders;
        existing.avgOrder = Math.round(item.avgOrderValue);
        existing.pushed = item.pushed ?? 0;
        existing.called = item.called ?? 0;
        existing.closed = item.closed ?? 0;
        existing.shipped = item.shipped ?? 0;
        existing.deliveredOk = item.deliveredOk ?? 0;
      }
    }

    // Fill in ads data
    for (const item of adsByDay) {
      const existing = dateMap.get(item.date);
      if (existing) {
        existing.adsSpent = item.totalSpent;
        existing.adsRevenue = item.totalRevenue;
        existing.leads = item.totalLeads;
        existing.closedLeads = item.closedLeads;
        existing.roas = item.roas;
      }
    }

    // Convert to array and calculate totals
    const dailyData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const totals = dailyData.reduce(
      (acc, day) => ({
        totalRevenue: acc.totalRevenue + day.revenue,
        totalOrders: acc.totalOrders + day.orders,
        totalAdsSpent: acc.totalAdsSpent + day.adsSpent,
        totalAdsRevenue: acc.totalAdsRevenue + day.adsRevenue,
        totalLeads: acc.totalLeads + day.leads,
        totalClosedLeads: acc.totalClosedLeads + day.closedLeads,
        totalPushed: acc.totalPushed + day.pushed,
        totalCalled: acc.totalCalled + day.called,
        totalClosed: acc.totalClosed + day.closed,
        totalShipped: acc.totalShipped + day.shipped,
        totalDeliveredOk: acc.totalDeliveredOk + day.deliveredOk,
      }),
      {
        totalRevenue: 0,
        totalOrders: 0,
        totalAdsSpent: 0,
        totalAdsRevenue: 0,
        totalLeads: 0,
        totalClosedLeads: 0,
        totalPushed: 0,
        totalCalled: 0,
        totalClosed: 0,
        totalShipped: 0,
        totalDeliveredOk: 0,
      }
    );

    // ── groupBy=employee: per-MKT breakdown ──────────────────────────────────
    type DailyTotals = {
      totalRevenue: number;
      totalOrders: number;
      totalAdsSpent: number;
      totalAdsRevenue: number;
      totalLeads: number;
      totalClosedLeads: number;
      totalPushed: number;
      totalCalled: number;
      totalClosed: number;
      totalShipped: number;
      totalDeliveredOk: number;
      avgDailyRevenue: number;
      overallROAS: number;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type DailyDataRow = Record<string, any>;

    type EmployeeGroup = {
      marketingEmployeeId: string;
      employeeName: string;
      data: DailyDataRow[];
      summary: DailyTotals;
    };

    let groupedData: EmployeeGroup[] | undefined;
    if (groupBy === "employee" && resolvedEmployeeIds && resolvedEmployeeIds.length > 0) {
      // Build date-keyed maps for revenue and ads keyed by (date, empId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const revByEmpDate = new Map<string, any>();
      for (const item of revenueByDay) {
        const eid = String(item.marketingEmployeeId ?? "");
        if (!eid) continue;
        revByEmpDate.set(`${eid}|${item.date}`, item);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adsByEmpDate = new Map<string, any>();
      for (const item of adsByDay) {
        const eid = String(item.marketingEmployeeId ?? "");
        if (!eid) continue;
        adsByEmpDate.set(`${eid}|${item.date}`, item);
      }

      // Lookup employee names
      const empDocs = await Employee.find({ _id: { $in: resolvedEmployeeIds } })
        .select("fullName employeeCode")
        .lean();
      const empNameMap = new Map<string, string>();
      for (const e of empDocs) {
        empNameMap.set(String(e._id), e.employeeCode ? `${e.fullName} (${e.employeeCode})` : e.fullName);
      }

      // Build grouped data per employee
      groupedData = [];
      for (const empId of resolvedEmployeeIds) {
        const empName = empNameMap.get(empId) || empId;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const empDateMap = new Map<string, any>();
        for (const [key, item] of revByEmpDate) {
          if (!key.startsWith(`${empId}|`)) continue;
          const dateKey = key.slice(empId.length + 1);
          empDateMap.set(dateKey, {
            date: dateKey,
            revenue: item.totalRevenue,
            orders: item.totalOrders,
            avgOrder: Math.round(item.avgOrderValue),
            adsSpent: 0,
            adsRevenue: 0,
            leads: 0,
            closedLeads: 0,
            roas: 0,
            pushed: item.pushed ?? 0,
            called: item.called ?? 0,
            closed: item.closed ?? 0,
            shipped: item.shipped ?? 0,
            deliveredOk: item.deliveredOk ?? 0,
          });
        }

        for (const [key, item] of adsByEmpDate) {
          if (!key.startsWith(`${empId}|`)) continue;
          const dateKey = key.slice(empId.length + 1);
          const existing = empDateMap.get(dateKey) ?? {
            date: dateKey,
            revenue: 0,
            orders: 0,
            avgOrder: 0,
            adsSpent: 0,
            adsRevenue: 0,
            leads: 0,
            closedLeads: 0,
            roas: 0,
            pushed: 0,
            called: 0,
            closed: 0,
            shipped: 0,
            deliveredOk: 0,
          };
          existing.adsSpent = item.totalSpent;
          existing.adsRevenue = item.totalRevenue;
          existing.leads = item.totalLeads;
          existing.closedLeads = item.closedLeads;
          existing.roas = item.roas;
          empDateMap.set(dateKey, existing);
        }

        // Fill in zero-row for dates with no data
        for (const d of dailyData) {
          if (!empDateMap.has(d.date)) {
            empDateMap.set(d.date, { ...d, revenue: 0, orders: 0, avgOrder: 0, adsSpent: 0, adsRevenue: 0, leads: 0, closedLeads: 0, roas: 0, pushed: 0, called: 0, closed: 0, shipped: 0, deliveredOk: 0 });
          }
        }

        const empData = Array.from(empDateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        const empTotals = empData.reduce(
          (acc, day) => ({
            totalRevenue: acc.totalRevenue + day.revenue,
            totalOrders: acc.totalOrders + day.orders,
            totalAdsSpent: acc.totalAdsSpent + day.adsSpent,
            totalAdsRevenue: acc.totalAdsRevenue + day.adsRevenue,
            totalLeads: acc.totalLeads + day.leads,
            totalClosedLeads: acc.totalClosedLeads + day.closedLeads,
            totalPushed: acc.totalPushed + day.pushed,
            totalCalled: acc.totalCalled + day.called,
            totalClosed: acc.totalClosed + day.closed,
            totalShipped: acc.totalShipped + day.shipped,
            totalDeliveredOk: acc.totalDeliveredOk + day.deliveredOk,
          }),
          { totalRevenue: 0, totalOrders: 0, totalAdsSpent: 0, totalAdsRevenue: 0, totalLeads: 0, totalClosedLeads: 0, totalPushed: 0, totalCalled: 0, totalClosed: 0, totalShipped: 0, totalDeliveredOk: 0 }
        );

        // Only include MKTs that have at least one non-zero revenue or adsSpent row
        const hasData = empData.some(d => d.revenue > 0 || d.adsSpent > 0 || d.orders > 0);
        if (hasData) {
          groupedData.push({
            marketingEmployeeId: empId,
            employeeName: empName,
            data: empData,
            summary: {
              ...empTotals,
              avgDailyRevenue: Math.round(empTotals.totalRevenue / empData.length) || 0,
              overallROAS: empTotals.totalAdsSpent > 0 ? Math.round((empTotals.totalAdsRevenue / empTotals.totalAdsSpent) * 100) / 100 : 0,
            },
          });
        }
      }
    }

    return success({
      period,
      scope: isGlobal ? "GLOBAL" : "SELF",
      effectiveMarketingEmployeeId,
      dateRange: {
        start: startDate.toISOString().slice(0, 10),
        end: endDate.toISOString().slice(0, 10),
      },
      data: dailyData,
      summary: {
        totalDays: dailyData.length,
        totalRevenue: totals.totalRevenue,
        totalOrders: totals.totalOrders,
        avgDailyRevenue: Math.round(totals.totalRevenue / dailyData.length) || 0,
        totalAdsSpent: totals.totalAdsSpent,
        totalAdsRevenue: totals.totalAdsRevenue,
        totalLeads: totals.totalLeads,
        totalClosedLeads: totals.totalClosedLeads,
        overallROAS:
          totals.totalAdsSpent > 0
            ? Math.round((totals.totalAdsRevenue / totals.totalAdsSpent) * 100) / 100
            : 0,
        totalPushed: totals.totalPushed,
        totalCalled: totals.totalCalled,
        totalClosed: totals.totalClosed,
        totalShipped: totals.totalShipped,
        totalDeliveredOk: totals.totalDeliveredOk,
      },
      ...(groupedData ? { groupedData } : {}),
    });
  } catch (err) {
    if (err instanceof ForbiddenError) return errorResponse(err.message, 403);
    console.error("Daily Report API Error:", err);
    return errorResponse("Không thể lấy dữ liệu báo cáo theo ngày", 500);
  }
}

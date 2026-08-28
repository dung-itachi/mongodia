/**
 * ==================================================
 * SALES DASHBOARD REPOSITORY
 * ==================================================
 *
 * Sprint 8.2 — Sales Dashboard
 *
 * Clean Architecture: Repository layer for Sales Dashboard.
 * ONLY contains MongoDB aggregation pipelines.
 */

import mongoose from "mongoose";
import { Order } from "@/models/Order";
import { Customer } from "@/models/Customer";
import { CustomerActivity } from "@/models/CustomerActivity";
import { ActivityResult } from "@/models/CustomerActivity";

// ============================================================================
// Types
// ============================================================================

export interface DashboardCards {
  todayRevenue: number;
  monthRevenue: number;
  todayOrders: number;
  monthOrders: number;
  newCustomers: number;
  activeCustomers: number;
  todayFollowUps: number;
  missedFollowUps: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface RevenueTrendData {
  daily: ChartDataPoint[];
  weekly: ChartDataPoint[];
  monthly: ChartDataPoint[];
}

export interface OrderTrendData {
  daily: ChartDataPoint[];
  weekly: ChartDataPoint[];
  monthly: ChartDataPoint[];
}

export interface CustomerTrendData {
  daily: ChartDataPoint[];
  weekly: ChartDataPoint[];
  monthly: ChartDataPoint[];
}

export interface TopSalesItem {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  revenue: number;
  orderCount: number;
  customerCount: number;
}

export interface FollowUpItem {
  activityId: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  customerPhone: string;
  activityTitle: string;
  nextFollowUpAt: string;
  result?: string;
}

// ============================================================================
// Helper functions
// ============================================================================

function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ============================================================================
// Repository
// ============================================================================

export class SalesDashboardRepository {
  /**
   * Aggregate dashboard cards data.
   */
  async aggregateDashboardCards(
    saleEmployeeId?: string
  ): Promise<DashboardCards> {
    const now = new Date();
    const startOfToday = getStartOfDay(now);
    const endOfToday = getEndOfDay(now);
    const startOfMonth = getStartOfMonth(now);

    // Build base filter
    const baseFilter: Record<string, unknown> = {
      isActive: { $ne: false },
    };
    if (saleEmployeeId) {
      baseFilter.saleEmployeeId = new mongoose.Types.ObjectId(saleEmployeeId);
    }

    // 1. Today Revenue
    const todayRevenueResult = await Order.aggregate([
      {
        $match: {
          ...baseFilter,
          status: { $nin: ["CANCELLED"] },
        },
      },
      {
        $addFields: {
          computedDate: { $ifNull: ["$confirmedAt", "$createdAt"] }
        }
      },
      {
        $match: {
          computedDate: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]);
    const todayRevenue = todayRevenueResult[0]?.total ?? 0;

    // 2. Month Revenue
    const monthRevenueResult = await Order.aggregate([
      {
        $match: {
          ...baseFilter,
          status: { $nin: ["CANCELLED"] },
        },
      },
      {
        $addFields: {
          computedDate: { $ifNull: ["$confirmedAt", "$createdAt"] }
        }
      },
      {
        $match: {
          computedDate: { $gte: startOfMonth, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]);
    const monthRevenue = monthRevenueResult[0]?.total ?? 0;

    // 3. Today Orders
    const todayOrdersResult = await Order.aggregate([
      {
        $match: baseFilter,
      },
      {
        $addFields: {
          computedDate: { $ifNull: ["$confirmedAt", "$createdAt"] }
        }
      },
      {
        $match: {
          computedDate: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);
    const todayOrders = todayOrdersResult[0]?.count ?? 0;

    // 4. Month Orders
    const monthOrdersResult = await Order.aggregate([
      {
        $match: baseFilter,
      },
      {
        $addFields: {
          computedDate: { $ifNull: ["$confirmedAt", "$createdAt"] }
        }
      },
      {
        $match: {
          computedDate: { $gte: startOfMonth, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);
    const monthOrders = monthOrdersResult[0]?.count ?? 0;

    // 5. New Customers (this month)
    const customerFilter: Record<string, unknown> = {
      isActive: { $ne: false },
    };
    if (saleEmployeeId) {
      customerFilter.saleEmployeeId = new mongoose.Types.ObjectId(saleEmployeeId);
    }
    const newCustomersResult = await Customer.aggregate([
      {
        $match: {
          ...customerFilter,
          createdAt: { $gte: startOfMonth, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);
    const newCustomers = newCustomersResult[0]?.count ?? 0;

    // 6. Active Customers (have orders this month)
    const activeCustomersResult = await Order.aggregate([
      {
        $match: {
          ...baseFilter,
          createdAt: { $gte: startOfMonth, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: "$customerId",
        },
      },
      {
        $count: "total",
      },
    ]);
    const activeCustomers = activeCustomersResult[0]?.total ?? 0;

    // 7. Today Follow-ups
    const followUpFilter: Record<string, unknown> = {
      nextFollowUpAt: { $gte: startOfToday, $lte: endOfToday },
    };
    if (saleEmployeeId) {
      followUpFilter.employeeId = new mongoose.Types.ObjectId(saleEmployeeId);
    }
    const todayFollowUpsResult = await CustomerActivity.aggregate([
      { $match: followUpFilter },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);
    const todayFollowUps = todayFollowUpsResult[0]?.count ?? 0;

    // 8. Missed Follow-ups (before today, not SUCCESS)
    const missedFilter: Record<string, unknown> = {
      nextFollowUpAt: { $lt: startOfToday },
      result: { $ne: ActivityResult.SUCCESS },
    };
    if (saleEmployeeId) {
      missedFilter.employeeId = new mongoose.Types.ObjectId(saleEmployeeId);
    }
    const missedFollowUpsResult = await CustomerActivity.aggregate([
      { $match: missedFilter },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);
    const missedFollowUps = missedFollowUpsResult[0]?.count ?? 0;

    return {
      todayRevenue,
      monthRevenue,
      todayOrders,
      monthOrders,
      newCustomers,
      activeCustomers,
      todayFollowUps,
      missedFollowUps,
    };
  }

  /**
   * Aggregate revenue trend data.
   */
  async aggregateRevenueTrend(
    days: number = 30,
    saleEmployeeId?: string
  ): Promise<RevenueTrendData> {
    const now = new Date();
    const startOfPeriod = new Date(now);
    startOfPeriod.setDate(startOfPeriod.getDate() - days);

    const baseMatch: Record<string, unknown> = {
      status: { $nin: ["CANCELLED"] },
    };
    if (saleEmployeeId) {
      baseMatch.saleEmployeeId = new mongoose.Types.ObjectId(saleEmployeeId);
    }

    // Daily trend
    const dailyResult = await Order.aggregate([
      { $match: baseMatch },
      {
        $addFields: {
          computedDate: { $ifNull: ["$confirmedAt", "$createdAt"] }
        }
      },
      {
        $match: {
          computedDate: { $gte: startOfPeriod, $lte: now }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$computedDate" },
          },
          value: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Generate all dates in range
    const dailyMap = new Map<string, number>();
    dailyResult.forEach((r) => dailyMap.set(r._id, r.value));

    const daily: ChartDataPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      daily.push({
        date: dateStr,
        value: dailyMap.get(dateStr) ?? 0,
        label: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      });
    }

    // Weekly trend (last 12 weeks)
    const weeklyStart = new Date(now);
    weeklyStart.setDate(weeklyStart.getDate() - 12 * 7);

    const weeklyResult = await Order.aggregate([
      { $match: baseMatch },
      {
        $addFields: {
          computedDate: { $ifNull: ["$confirmedAt", "$createdAt"] }
        }
      },
      {
        $match: {
          computedDate: { $gte: weeklyStart, $lte: now }
        }
      },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: "$computedDate" },
            week: { $isoWeek: "$computedDate" },
          },
          value: { $sum: "$totalAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
    ]);

    const weekly: ChartDataPoint[] = weeklyResult.map((r) => ({
      date: `${r._id.year}-W${r._id.week}`,
      value: r.value,
      label: `T${r._id.week}/${r._id.year}`,
    }));

    // Monthly trend (last 12 months)
    const monthlyStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const monthlyResult = await Order.aggregate([
      { $match: baseMatch },
      {
        $addFields: {
          computedDate: { $ifNull: ["$confirmedAt", "$createdAt"] }
        }
      },
      {
        $match: {
          computedDate: { $gte: monthlyStart, $lte: now }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$computedDate" },
            month: { $month: "$computedDate" },
          },
          value: { $sum: "$totalAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthly: ChartDataPoint[] = monthlyResult.map((r) => ({
      date: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
      value: r.value,
      label: `T${r._id.month}/${r._id.year}`,
    }));

    return { daily, weekly, monthly };
  }

  /**
   * Aggregate order trend data.
   */
  async aggregateOrderTrend(
    days: number = 30,
    saleEmployeeId?: string
  ): Promise<OrderTrendData> {
    const now = new Date();
    const startOfPeriod = new Date(now);
    startOfPeriod.setDate(startOfPeriod.getDate() - days);

    const baseMatch: Record<string, unknown> = {};
    if (saleEmployeeId) {
      baseMatch.saleEmployeeId = new mongoose.Types.ObjectId(saleEmployeeId);
    }

    // Daily trend
    const dailyResult = await Order.aggregate([
      { $match: baseMatch },
      {
        $addFields: {
          computedDate: { $ifNull: ["$confirmedAt", "$createdAt"] }
        }
      },
      {
        $match: {
          computedDate: { $gte: startOfPeriod, $lte: now }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$computedDate" },
          },
          value: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyMap = new Map<string, number>();
    dailyResult.forEach((r) => dailyMap.set(r._id, r.value));

    const daily: ChartDataPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      daily.push({
        date: dateStr,
        value: dailyMap.get(dateStr) ?? 0,
        label: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      });
    }

    // Weekly trend
    const weeklyStart = new Date(now);
    weeklyStart.setDate(weeklyStart.getDate() - 12 * 7);

    const weeklyResult = await Order.aggregate([
      { $match: baseMatch },
      {
        $addFields: {
          computedDate: { $ifNull: ["$confirmedAt", "$createdAt"] }
        }
      },
      {
        $match: {
          computedDate: { $gte: weeklyStart, $lte: now }
        }
      },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: "$computedDate" },
            week: { $isoWeek: "$computedDate" },
          },
          value: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
    ]);

    const weekly: ChartDataPoint[] = weeklyResult.map((r) => ({
      date: `${r._id.year}-W${r._id.week}`,
      value: r.value,
      label: `T${r._id.week}/${r._id.year}`,
    }));

    // Monthly trend
    const monthlyStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const monthlyResult = await Order.aggregate([
      { $match: baseMatch },
      {
        $addFields: {
          computedDate: { $ifNull: ["$confirmedAt", "$createdAt"] }
        }
      },
      {
        $match: {
          computedDate: { $gte: monthlyStart, $lte: now }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$computedDate" },
            month: { $month: "$computedDate" },
          },
          value: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthly: ChartDataPoint[] = monthlyResult.map((r) => ({
      date: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
      value: r.value,
      label: `T${r._id.month}/${r._id.year}`,
    }));

    return { daily, weekly, monthly };
  }

  /**
   * Aggregate customer trend data.
   */
  async aggregateCustomerTrend(
    days: number = 30,
    saleEmployeeId?: string
  ): Promise<CustomerTrendData> {
    const now = new Date();
    const startOfPeriod = new Date(now);
    startOfPeriod.setDate(startOfPeriod.getDate() - days);

    const baseMatch: Record<string, unknown> = {
      isActive: { $ne: false },
      createdAt: { $gte: startOfPeriod, $lte: now },
    };
    if (saleEmployeeId) {
      baseMatch.saleEmployeeId = new mongoose.Types.ObjectId(saleEmployeeId);
    }

    // Daily trend
    const dailyResult = await Customer.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          value: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyMap = new Map<string, number>();
    dailyResult.forEach((r) => dailyMap.set(r._id, r.value));

    const daily: ChartDataPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      daily.push({
        date: dateStr,
        value: dailyMap.get(dateStr) ?? 0,
        label: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      });
    }

    // Weekly trend
    const weeklyStart = new Date(now);
    weeklyStart.setDate(weeklyStart.getDate() - 12 * 7);
    const weeklyMatch = { ...baseMatch, createdAt: { $gte: weeklyStart, $lte: now } };

    const weeklyResult = await Customer.aggregate([
      { $match: weeklyMatch },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: "$createdAt" },
            week: { $isoWeek: "$createdAt" },
          },
          value: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
    ]);

    const weekly: ChartDataPoint[] = weeklyResult.map((r) => ({
      date: `${r._id.year}-W${r._id.week}`,
      value: r.value,
      label: `T${r._id.week}/${r._id.year}`,
    }));

    // Monthly trend
    const monthlyStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const monthlyMatch = { ...baseMatch, createdAt: { $gte: monthlyStart, $lte: now } };

    const monthlyResult = await Customer.aggregate([
      { $match: monthlyMatch },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          value: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthly: ChartDataPoint[] = monthlyResult.map((r) => ({
      date: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
      value: r.value,
      label: `T${r._id.month}/${r._id.year}`,
    }));

    return { daily, weekly, monthly };
  }

  /**
   * Aggregate top sales rankings.
   */
  async aggregateTopSales(
    type: "revenue" | "orders" | "customers" = "revenue",
    limit: number = 10,
    saleEmployeeId?: string
  ): Promise<TopSalesItem[]> {
    const now = new Date();
    const startOfMonth = getStartOfMonth(now);

    const baseMatch: Record<string, unknown> = {
      status: { $nin: ["CANCELLED"] },
    };
    if (saleEmployeeId) {
      baseMatch.saleEmployeeId = new mongoose.Types.ObjectId(saleEmployeeId);
    }

    const pipeline: mongoose.PipelineStage[] = [
      { $match: baseMatch },
      {
        $addFields: {
          computedDate: { $ifNull: ["$confirmedAt", "$createdAt"] }
        }
      },
      {
        $match: {
          computedDate: { $gte: startOfMonth }
        }
      }
    ];

    switch (type) {
      case "revenue":
        pipeline.push({
          $group: {
            _id: "$saleEmployeeId",
            revenue: { $sum: "$totalAmount" },
            orderCount: { $sum: 1 },
          },
        } as mongoose.PipelineStage.Group);
        pipeline.push({ $sort: { revenue: -1 } as Record<string, 1 | -1> });
        break;
      case "orders":
        pipeline.push({
          $group: {
            _id: "$saleEmployeeId",
            orderCount: { $sum: 1 },
          },
        } as mongoose.PipelineStage.Group);
        pipeline.push({ $sort: { orderCount: -1 } as Record<string, 1 | -1> });
        break;
      case "customers":
        pipeline.push({
          $group: {
            _id: "$saleEmployeeId",
            customerCount: { $addToSet: "$customerId" },
          },
        } as mongoose.PipelineStage.Group);
        pipeline.push({ $sort: { customerCount: -1 } as Record<string, 1 | -1> });
        break;
      default:
        pipeline.push({
          $group: {
            _id: "$saleEmployeeId",
            revenue: { $sum: "$totalAmount" },
          },
        } as mongoose.PipelineStage.Group);
        pipeline.push({ $sort: { revenue: -1 } as Record<string, 1 | -1> });
    }

    pipeline.push({ $limit: limit });
    pipeline.push({
      $lookup: {
        from: "employees",
        localField: "_id",
        foreignField: "_id",
        as: "employee",
      },
    } as mongoose.PipelineStage.Lookup);
    pipeline.push({ $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } });

    const result = await Order.aggregate(pipeline);

    return result.map((r) => ({
      employeeId: r._id?.toString() ?? "",
      employeeCode: r.employee?.employeeCode ?? "",
      employeeName: r.employee?.fullName ?? "Unknown",
      revenue: r.revenue ?? 0,
      orderCount: r.orderCount ?? 0,
      customerCount: Array.isArray(r.customerCount) ? r.customerCount.length : 0,
    }));
  }

  /**
   * Get today's follow-ups.
   */
  async aggregateTodayFollowUps(
    limit: number = 20,
    saleEmployeeId?: string
  ): Promise<FollowUpItem[]> {
    const now = new Date();
    const startOfToday = getStartOfDay(now);
    const endOfToday = getEndOfDay(now);

    const match: Record<string, unknown> = {
      nextFollowUpAt: { $gte: startOfToday, $lte: endOfToday },
    };
    if (saleEmployeeId) {
      match.employeeId = new mongoose.Types.ObjectId(saleEmployeeId);
    }

    const result = await CustomerActivity.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "customers",
          localField: "customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
      { $sort: { nextFollowUpAt: 1 } },
      { $limit: limit },
    ]);

    return result.map((r) => ({
      activityId: r._id.toString(),
      customerId: r.customer?._id?.toString() ?? "",
      customerCode: r.customer?.customerCode ?? "",
      customerName: r.customer?.fullName ?? "Unknown",
      customerPhone: r.customer?.phone ?? "",
      activityTitle: r.title,
      nextFollowUpAt: r.nextFollowUpAt?.toISOString() ?? "",
      result: r.result,
    }));
  }

  /**
   * Get missed follow-ups.
   */
  async aggregateMissedFollowUps(
    limit: number = 20,
    saleEmployeeId?: string
  ): Promise<FollowUpItem[]> {
    const now = new Date();
    const startOfToday = getStartOfDay(now);

    const match: Record<string, unknown> = {
      nextFollowUpAt: { $lt: startOfToday },
      result: { $ne: ActivityResult.SUCCESS },
    };
    if (saleEmployeeId) {
      match.employeeId = new mongoose.Types.ObjectId(saleEmployeeId);
    }

    const result = await CustomerActivity.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "customers",
          localField: "customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
      { $sort: { nextFollowUpAt: 1 } },
      { $limit: limit },
    ]);

    return result.map((r) => ({
      activityId: r._id.toString(),
      customerId: r.customer?._id?.toString() ?? "",
      customerCode: r.customer?.customerCode ?? "",
      customerName: r.customer?.fullName ?? "Unknown",
      customerPhone: r.customer?.phone ?? "",
      activityTitle: r.title,
      nextFollowUpAt: r.nextFollowUpAt?.toISOString() ?? "",
      result: r.result,
    }));
  }
}

export const salesDashboardRepository = new SalesDashboardRepository();

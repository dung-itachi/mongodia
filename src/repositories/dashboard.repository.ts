/**
 * Dashboard Repository (Sprint 7.3 — Drill-down & Export)
 *
 * Clean Architecture: Repository layer cho Dashboard.
 *
 * KHÔNG chứa business logic — chỉ MongoDB aggregation.
 *
 * Cấu trúc:
 * - aggregateMarketingDashboard() — trả về tất cả dashboard data
 * - aggregateExportData(filter) — Sprint 7.3
 * - aggregateDrillDown(filter) — Sprint 7.3
 */

import { Lead } from "@/models/Lead";
import { Order } from "@/models/Order";
import { MarketingExpenseReport } from "@/models/MarketingExpenseReport";
import { LeadStatus } from "@/constants/leadStatus";
import { OrderStatus } from "@/constants/orderStatus";
import { LeadSource, LEAD_SOURCE_LABELS } from "@/constants/leadSource";
import type {
  MarketingSummary,
  DailyLeadChartItem,
  LeadSourceChartItem,
  TopMarketingItem,
  DailyChartItem,
  MonthlyChartItem,
  TopMarketingChannel,
} from "@/types/marketing-dashboard";
import type {
  MarketingDashboardFilter,
  DrillDownData,
  ExportData,
} from "@/types/marketing-dashboard-filter";

// ============================================================================
// Lead Aggregations
// ============================================================================

/**
 * Aggregate lead summary counts using $facet.
 */
export async function aggregateLeadSummary(): Promise<{
  todayLead: number;
  weekLead: number;
  monthLead: number;
  totalLead: number;
  assignedLead: number;
  closedLead: number;
  conversionRate: number;
}> {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const weekStart = new Date(todayStart);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

  const results = await Lead.aggregate([
    { $match: { isActive: true } },
    {
      $facet: {
        todayLead: [
          { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
          { $count: "count" },
        ],
        weekLead: [
          { $match: { createdAt: { $gte: weekStart } } },
          { $count: "count" },
        ],
        monthLead: [
          { $match: { createdAt: { $gte: monthStart } } },
          { $count: "count" },
        ],
        totalLead: [{ $count: "count" }],
        assignedLead: [
          { $match: { saleEmployeeId: { $exists: true, $ne: null } } },
          { $count: "count" },
        ],
        closedLead: [
          { $match: { status: LeadStatus.CLOSED } },
          { $count: "count" },
        ],
      },
    },
  ]).exec();

  const facet = results[0] ?? {};
  const todayResult = (facet.todayLead?.[0]?.count as number) ?? 0;
  const weekResult = (facet.weekLead?.[0]?.count as number) ?? 0;
  const monthResult = (facet.monthLead?.[0]?.count as number) ?? 0;
  const totalResult = (facet.totalLead?.[0]?.count as number) ?? 0;
  const assignedResult = (facet.assignedLead?.[0]?.count as number) ?? 0;
  const closedResult = (facet.closedLead?.[0]?.count as number) ?? 0;

  const conversionRate = totalResult > 0
    ? Math.round((closedResult / totalResult) * 1000) / 10
    : 0;

  return {
    todayLead: todayResult,
    weekLead: weekResult,
    monthLead: monthResult,
    totalLead: totalResult,
    assignedLead: assignedResult,
    closedLead: closedResult,
    conversionRate,
  };
}

/**
 * Aggregate lead counts grouped by sourceType.
 */
export async function aggregateLeadSource(): Promise<LeadSourceChartItem[]> {
  const pipeline = [
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$sourceType",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 as const } },
    { $project: { _id: 0, source: "$_id", count: 1 } },
  ];

  const results = await Lead.aggregate(pipeline).exec();

  return results.map((r) => ({
    source: LEAD_SOURCE_LABELS[r.source as LeadSource] ?? r.source,
    count: r.count,
  }));
}

/**
 * Aggregate top marketing employees by lead performance (Lead-based).
 */
export async function aggregateTopMarketingByLeads(limit = 5): Promise<TopMarketingItem[]> {
  const pipeline = [
    {
      $match: {
        marketingEmployeeId: { $exists: true, $ne: null },
        isActive: true,
      },
    },
    {
      $group: {
        _id: "$marketingEmployeeId",
        totalLead: { $sum: 1 },
        closedLead: {
          $sum: { $cond: [{ $eq: ["$status", LeadStatus.CLOSED] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: "employees",
        localField: "_id",
        foreignField: "_id",
        as: "employee",
      },
    },
    { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        employeeId: { $toString: "$_id" },
        employeeName: { $ifNull: ["$employee.name", "Unknown"] },
        avatar: { $ifNull: ["$employee.avatar", null] },
        totalLead: 1,
        closedLead: 1,
        conversionRate: {
          $cond: [
            { $gt: ["$totalLead", 0] },
            { $round: [{ $multiply: [{ $divide: ["$closedLead", "$totalLead"] }, 100] }, 1] },
            0,
          ],
        },
      },
    },
    { $sort: { totalLead: -1 as const } },
    { $limit: limit },
  ];

  const results = await Lead.aggregate(pipeline).exec();

  return results.map((r) => ({
    employeeId: r.employeeId,
    employeeName: r.employeeName,
    avatar: r.avatar,
    totalLead: r.totalLead,
    closedLead: r.closedLead,
    conversionRate: r.conversionRate,
  }));
}

// ============================================================================
// Expense Aggregations
// ============================================================================

/**
 * Aggregate expense summary from MarketingExpenseReport.
 */
export async function aggregateExpenseSummary(): Promise<{
  totalSpent: number;
  totalRevenue: number;
  totalLeads: number;
  totalClosedLeads: number;
  roas: number;
  cpa: number;
  averageConversionRate: number;
}> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

  const results = await MarketingExpenseReport.aggregate([
    {
      $match: {
        reportDate: { $gte: monthStart },
        isActive: { $ne: false },
      },
    },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: { $add: ["$spentBudget.morning", "$spentBudget.afternoon", "$spentBudget.emergency"] } },
        totalRevenue: { $sum: "$totalRevenue" },
        totalLeads: { $sum: "$totalLeads" },
        totalClosedLeads: { $sum: "$closedLeads" },
        avgConversionRate: { $avg: "$conversionRate" },
      },
    },
    {
      $project: {
        _id: 0,
        totalSpent: 1,
        totalRevenue: 1,
        totalLeads: 1,
        totalClosedLeads: 1,
        avgConversionRate: { $ifNull: ["$avgConversionRate", 0] },
      },
    },
  ]).exec();

  const result = results[0] ?? { totalSpent: 0, totalRevenue: 0, totalLeads: 0, totalClosedLeads: 0, avgConversionRate: 0 };
  const roas = result.totalSpent > 0 ? result.totalRevenue / result.totalSpent : 0;
  const cpa = result.totalClosedLeads > 0 ? result.totalSpent / result.totalClosedLeads : 0;

  return {
    totalSpent: result.totalSpent,
    totalRevenue: result.totalRevenue,
    totalLeads: result.totalLeads,
    totalClosedLeads: result.totalClosedLeads,
    roas,
    cpa,
    averageConversionRate: result.avgConversionRate,
  };
}

/**
 * Aggregate top marketing channels by ROAS (Expense-based).
 */
export async function aggregateTopMarketingChannels(limit = 10): Promise<TopMarketingChannel[]> {
  const pipeline = [
    {
      $match: {
        isActive: { $ne: false },
      },
    },
    {
      $group: {
        _id: "$marketingEmployeeId",
        totalSpent: { $sum: { $add: ["$spentBudget.morning", "$spentBudget.afternoon", "$spentBudget.emergency"] } },
        totalRevenue: { $sum: "$totalRevenue" },
        totalLeads: { $sum: "$totalLeads" },
        totalClosedLeads: { $sum: "$closedLeads" },
      },
    },
    {
      $lookup: {
        from: "employees",
        localField: "_id",
        foreignField: "_id",
        as: "employee",
      },
    },
    { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        marketingEmployeeId: { $toString: "$_id" },
        marketingEmployeeName: { $ifNull: ["$employee.name", "Unknown"] },
        totalSpent: 1,
        totalRevenue: 1,
        roas: {
          $cond: [
            { $gt: ["$totalSpent", 0] },
            { $round: [{ $divide: ["$totalRevenue", "$totalSpent"] }, 2] },
            0,
          ],
        },
        totalLeads: 1,
        totalClosedLeads: 1,
      },
    },
    { $sort: { roas: -1 as const } },
    { $limit: limit },
  ];

  return MarketingExpenseReport.aggregate(pipeline).exec();
}

// ============================================================================
// Revenue Aggregations
// ============================================================================

/**
 * Aggregate revenue summary from Order collection.
 */
export async function aggregateRevenueSummary(): Promise<{
  todayRevenue: number;
  monthRevenue: number;
  totalRevenue: number;
  orderCount: number;
}> {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

  const results = await Order.aggregate([
    {
      $match: {
        status: { $nin: [OrderStatus.CANCELLED, OrderStatus.RETURNED] },
        isActive: true,
      },
    },
    {
      $facet: {
        todayRevenue: [
          { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ],
        monthRevenue: [
          { $match: { createdAt: { $gte: monthStart } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ],
        totalRevenue: [
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ],
        orderCount: [
          { $count: "count" },
        ],
      },
    },
  ]).exec();

  const facet = results[0] ?? {};
  const todayResult = (facet.todayRevenue?.[0]?.total as number) ?? 0;
  const monthResult = (facet.monthRevenue?.[0]?.total as number) ?? 0;
  const totalResult = (facet.totalRevenue?.[0]?.total as number) ?? 0;
  const countResult = (facet.orderCount?.[0]?.count as number) ?? 0;

  return {
    todayRevenue: todayResult,
    monthRevenue: monthResult,
    totalRevenue: totalResult,
    orderCount: countResult,
  };
}

// ============================================================================
// Chart Aggregations (Sprint 7.2)
// ============================================================================

export type ChartPeriod = "7d" | "30d" | "90d";

function getDateRange(period: ChartPeriod): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  const days = period === "7d" ? 6 : period === "30d" ? 29 : 89;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days, 0, 0, 0, 0));

  return { start, end };
}

export type TrendDataPoint = {
  date: string;
  value: number;
};

export type LeadTrendData = TrendDataPoint[];

export type ExpenseTrendData = TrendDataPoint[];

export type RevenueTrendData = TrendDataPoint[];

export type ROASTrendData = TrendDataPoint[];

export type ConversionTrendData = TrendDataPoint[];

/**
 * Aggregate lead trend data by period.
 */
export async function aggregateLeadTrend(period: ChartPeriod = "7d"): Promise<LeadTrendData> {
  const { start, end } = getDateRange(period);

  const pipeline = [
    { $match: { createdAt: { $gte: start, $lte: end }, isActive: true } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 as const } },
    { $project: { _id: 0, date: "$_id", value: "$count" } },
  ];

  const results = await Lead.aggregate(pipeline).exec();
  return fillMissingDates(results, start, end, "count");
}

/**
 * Aggregate expense trend data by period.
 */
export async function aggregateExpenseTrend(period: ChartPeriod = "7d"): Promise<ExpenseTrendData> {
  const { start, end } = getDateRange(period);

  const pipeline = [
    { $match: { reportDate: { $gte: start, $lte: end }, isActive: { $ne: false } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$reportDate" } },
        total: { $sum: { $add: ["$spentBudget.morning", "$spentBudget.afternoon", "$spentBudget.emergency"] } },
      },
    },
    { $sort: { _id: 1 as const } },
    { $project: { _id: 0, date: "$_id", value: "$total" } },
  ];

  const results = await MarketingExpenseReport.aggregate(pipeline).exec();
  return fillMissingDates(results, start, end, "total");
}

/**
 * Aggregate revenue trend data by period.
 */
export async function aggregateRevenueTrend(period: ChartPeriod = "7d"): Promise<RevenueTrendData> {
  const { start, end } = getDateRange(period);

  const pipeline = [
    { $match: { createdAt: { $gte: start, $lte: end }, isActive: true, status: { $nin: [OrderStatus.CANCELLED, OrderStatus.RETURNED] } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        total: { $sum: "$totalAmount" },
      },
    },
    { $sort: { _id: 1 as const } },
    { $project: { _id: 0, date: "$_id", value: "$total" } },
  ];

  const results = await Order.aggregate(pipeline).exec();
  return fillMissingDates(results, start, end, "total");
}

/**
 * Aggregate ROAS trend data by period.
 */
export async function aggregateROASTrend(period: ChartPeriod = "7d"): Promise<ROASTrendData> {
  const { start, end } = getDateRange(period);

  const pipeline = [
    { $match: { reportDate: { $gte: start, $lte: end }, isActive: { $ne: false } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$reportDate" } },
        spent: { $sum: { $add: ["$spentBudget.morning", "$spentBudget.afternoon", "$spentBudget.emergency"] } },
        revenue: { $sum: "$totalRevenue" },
      },
    },
    {
      $project: {
        _id: 0,
        date: "$_id",
        value: {
          $cond: [{ $gt: ["$spent", 0] }, { $divide: ["$revenue", "$spent"] }, 0],
        },
      },
    },
    { $sort: { date: 1 as const } },
  ];

  const results = await MarketingExpenseReport.aggregate(pipeline).exec();
  return fillMissingDates(results, start, end, "value");
}

/**
 * Aggregate conversion trend data by period.
 */
export async function aggregateConversionTrend(period: ChartPeriod = "7d"): Promise<ConversionTrendData> {
  const { start, end } = getDateRange(period);

  const pipeline = [
    { $match: { createdAt: { $gte: start, $lte: end }, isActive: true } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        total: { $sum: 1 },
        closed: { $sum: { $cond: [{ $eq: ["$status", LeadStatus.CLOSED] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        date: "$_id",
        value: {
          $cond: [
            { $gt: ["$total", 0] },
            { $multiply: [{ $divide: ["$closed", "$total"] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { date: 1 as const } },
  ];

  const results = await Lead.aggregate(pipeline).exec();
  return fillMissingDates(results, start, end, "value");
}

/**
 * Fill missing dates in trend data with zeros.
 */
function fillMissingDates<T extends { date: string; value: number }>(
  data: T[],
  start: Date,
  end: Date,
  _valueField: string
): TrendDataPoint[] {
  const dataMap = new Map<string, number>();
  for (const d of data) {
    dataMap.set(d.date, d.value);
  }

  const result: TrendDataPoint[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const dateStr = cursor.toISOString().slice(0, 10);
    result.push({ date: dateStr, value: dataMap.get(dateStr) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

// ============================================================================
// Ranking Aggregations (Sprint 7.2)
// ============================================================================

export type TopFacebookPageItem = {
  pageId: string;
  pageName: string;
  totalLeads: number;
  totalRevenue: number;
  roas: number;
};

export type TopMarketingEmployeeItem = {
  employeeId: string;
  employeeName: string;
  avatar?: string | null;
  totalLeads: number;
  qualifiedLeads: number;
  closedLeads: number;
  revenue: number;
};

export type TopCampaignItem = {
  campaignId: string;
  campaignName: string;
  totalSpent: number;
  totalRevenue: number;
  roas: number;
  totalLeads: number;
};

/**
 * Aggregate top Facebook pages by performance.
 */
export async function aggregateTopFacebookPages(limit = 10): Promise<TopFacebookPageItem[]> {
  const pipeline = [
    {
      $match: {
        facebookPageId: { $exists: true, $ne: null },
        isActive: { $ne: false },
      },
    },
    {
      $group: {
        _id: "$facebookPageId",
        totalSpent: { $sum: { $add: ["$spentBudget.morning", "$spentBudget.afternoon", "$spentBudget.emergency"] } },
        totalRevenue: { $sum: "$totalRevenue" },
        totalLeads: { $sum: "$totalLeads" },
      },
    },
    {
      $lookup: {
        from: "facebookpages",
        localField: "_id",
        foreignField: "_id",
        as: "page",
      },
    },
    { $unwind: { path: "$page", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        pageId: { $toString: "$_id" },
        pageName: { $ifNull: ["$page.name", "Unknown Page"] },
        totalSpent: 1,
        totalRevenue: 1,
        totalLeads: 1,
        roas: {
          $cond: [
            { $gt: ["$totalSpent", 0] },
            { $round: [{ $divide: ["$totalRevenue", "$totalSpent"] }, 2] },
            0,
          ],
        },
      },
    },
    { $sort: { totalRevenue: -1 as const } },
    { $limit: limit },
  ];

  return MarketingExpenseReport.aggregate(pipeline).exec();
}

/**
 * Aggregate top marketing employees by comprehensive performance.
 */
export async function aggregateTopMarketingEmployees(limit = 10): Promise<TopMarketingEmployeeItem[]> {
  const pipeline = [
    {
      $match: {
        marketingEmployeeId: { $exists: true, $ne: null },
        isActive: true,
      },
    },
    {
      $lookup: {
        from: "marketingexperiencereports",
        localField: "marketingEmployeeId",
        foreignField: "marketingEmployeeId",
        as: "expenseData",
        pipeline: [
          { $match: { isActive: { $ne: false } } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$totalRevenue" },
            },
          },
        ],
      },
    },
    {
      $group: {
        _id: "$marketingEmployeeId",
        totalLeads: { $sum: 1 },
        qualifiedLeads: {
          $sum: { $cond: [{ $in: ["$status", [LeadStatus.QUALIFIED, LeadStatus.ASSIGNED]] }, 1, 0] },
        },
        closedLeads: {
          $sum: { $cond: [{ $eq: ["$status", LeadStatus.CLOSED] }, 1, 0] },
        },
        revenue: {
          $sum: { $arrayElemAt: ["$expenseData.totalRevenue", 0] },
        },
      },
    },
    {
      $lookup: {
        from: "employees",
        localField: "_id",
        foreignField: "_id",
        as: "employee",
      },
    },
    { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        employeeId: { $toString: "$_id" },
        employeeName: { $ifNull: ["$employee.name", "Unknown"] },
        avatar: { $ifNull: ["$employee.avatar", null] },
        totalLeads: 1,
        qualifiedLeads: 1,
        closedLeads: 1,
        revenue: { $ifNull: [{ $arrayElemAt: ["$expenseData.totalRevenue", 0] }, 0] },
      },
    },
    { $sort: { closedLeads: -1 as const } },
    { $limit: limit },
  ];

  return Lead.aggregate(pipeline).exec();
}

/**
 * Aggregate top campaigns by ROAS.
 * Assumes campaign info is stored in note field or via facebookPageId.
 */
export async function aggregateTopCampaigns(limit = 10): Promise<TopCampaignItem[]> {
  const pipeline = [
    {
      $match: {
        isActive: { $ne: false },
      },
    },
    {
      $group: {
        _id: "$facebookPageId",
        totalSpent: { $sum: { $add: ["$spentBudget.morning", "$spentBudget.afternoon", "$spentBudget.emergency"] } },
        totalRevenue: { $sum: "$totalRevenue" },
        totalLeads: { $sum: "$totalLeads" },
      },
    },
    {
      $lookup: {
        from: "facebookpages",
        localField: "_id",
        foreignField: "_id",
        as: "page",
      },
    },
    { $unwind: { path: "$page", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        campaignId: { $toString: "$_id" },
        campaignName: { $ifNull: ["$page.name", "Direct"] },
        totalSpent: 1,
        totalRevenue: 1,
        totalLeads: 1,
        roas: {
          $cond: [
            { $gt: ["$totalSpent", 0] },
            { $round: [{ $divide: ["$totalRevenue", "$totalSpent"] }, 2] },
            0,
          ],
        },
      },
    },
    { $sort: { roas: -1 as const } },
    { $limit: limit },
  ];

  return MarketingExpenseReport.aggregate(pipeline).exec();
}

// ============================================================================
// Chart Data Aggregation
// ============================================================================

/**
 * Aggregate all chart data for dashboard.
 */
export async function aggregateChartData(period: ChartPeriod = "7d") {
  const [leadTrend, expenseTrend, revenueTrend, roasTrend, conversionTrend] = await Promise.all([
    aggregateLeadTrend(period),
    aggregateExpenseTrend(period),
    aggregateRevenueTrend(period),
    aggregateROASTrend(period),
    aggregateConversionTrend(period),
  ]);

  return {
    leadTrend,
    expenseTrend,
    revenueTrend,
    roasTrend,
    conversionTrend,
  };
}

/**
 * Aggregate all ranking data for dashboard.
 */
export async function aggregateRankingData() {
  const [topPages, topEmployees, topCampaigns] = await Promise.all([
    aggregateTopFacebookPages(),
    aggregateTopMarketingEmployees(),
    aggregateTopCampaigns(),
  ]);

  return {
    topFacebookPages: topPages,
    topMarketingEmployees: topEmployees,
    topCampaigns: topCampaigns,
  };
}

// ============================================================================
// Combined Dashboard Aggregations
// ============================================================================

/**
 * Aggregate full Marketing Dashboard data in one call.
 * Gộp lead, expense, revenue, charts để Service gọi 1 lần.
 */
export async function aggregateMarketingDashboard(): Promise<{
  lead: {
    todayLead: number;
    weekLead: number;
    monthLead: number;
    totalLead: number;
    assignedLead: number;
    closedLead: number;
    conversionRate: number;
  };
  expense: {
    totalSpent: number;
    totalRevenue: number;
    totalLeads: number;
    totalClosedLeads: number;
    roas: number;
    cpa: number;
    averageConversionRate: number;
  };
  revenue: {
    todayRevenue: number;
    monthRevenue: number;
    totalRevenue: number;
    orderCount: number;
  };
  roas: number;
  conversion: number;
}> {
  const [leadSummary, expenseSummary, revenueSummary] = await Promise.all([
    aggregateLeadSummary(),
    aggregateExpenseSummary(),
    aggregateRevenueSummary(),
  ]);

  return {
    lead: leadSummary,
    expense: expenseSummary,
    revenue: revenueSummary,
    roas: expenseSummary.roas,
    conversion: expenseSummary.averageConversionRate,
  };
}

// ============================================================================
// Export & Drill-down Aggregations (Sprint 7.3)
// ============================================================================

function buildLeadMatch(filter: MarketingDashboardFilter): Record<string, unknown> {
  const match: Record<string, unknown> = { isActive: true };

  if (filter.dateRange?.startDate) {
    const startDate = new Date(filter.dateRange.startDate);
    match.createdAt = { $gte: startDate };
  }
  if (filter.dateRange?.endDate) {
    const endDate = new Date(filter.dateRange.endDate);
    endDate.setUTCHours(23, 59, 59, 999);
    if (match.createdAt) {
      (match.createdAt as Record<string, Date>).$lte = endDate;
    } else {
      match.createdAt = { $lte: endDate };
    }
  }
  if (filter.facebookPageId) {
    match.facebookPageId = filter.facebookPageId;
  }
  if (filter.marketingEmployeeId) {
    match.marketingEmployeeId = filter.marketingEmployeeId;
  }
  if (filter.source) {
    match.sourceType = filter.source;
  }
  if (filter.status) {
    match.status = filter.status;
  }
  return match;
}

function buildExpenseMatch(filter: MarketingDashboardFilter): Record<string, unknown> {
  const match: Record<string, unknown> = { isActive: { $ne: false } };

  if (filter.dateRange?.startDate) {
    const startDate = new Date(filter.dateRange.startDate);
    match.reportDate = { $gte: startDate };
  }
  if (filter.dateRange?.endDate) {
    const endDate = new Date(filter.dateRange.endDate);
    endDate.setUTCHours(23, 59, 59, 999);
    if (match.reportDate) {
      (match.reportDate as Record<string, Date>).$lte = endDate;
    } else {
      match.reportDate = { $lte: endDate };
    }
  }
  if (filter.facebookPageId) {
    match.facebookPageId = filter.facebookPageId;
  }
  if (filter.marketingEmployeeId) {
    match.marketingEmployeeId = filter.marketingEmployeeId;
  }
  if (filter.campaignId) {
    match.facebookPageId = filter.campaignId;
  }
  return match;
}

/**
 * Aggregate export data — all metrics needed for Excel/PDF export.
 */
export async function aggregateExportData(
  filter: MarketingDashboardFilter
): Promise<ExportData> {
  const leadMatch = buildLeadMatch(filter);
  const expenseMatch = buildExpenseMatch(filter);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  const periodDays = filter.period === "7d" ? 6 : filter.period === "30d" ? 29 : 89;
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - periodDays, 0, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  const [summaryFacets, leadTrend, expenseTrend, revenueTrend, roasTrend, conversionTrend, expenseSummary, topPages, topEmployees, topCampaigns] =
    await Promise.all([
      // Summary facets
      Lead.aggregate([
        {
          $match: leadMatch,
        },
        {
          $facet: {
            totalLead: [{ $count: "count" }],
            closedLead: [
              { $match: { status: LeadStatus.CLOSED } },
              { $count: "count" },
            ],
            todayLead: [
              { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
              { $count: "count" },
            ],
            monthLead: [
              { $match: { createdAt: { $gte: monthStart } } },
              { $count: "count" },
            ],
            assignedLead: [
              { $match: { saleEmployeeId: { $exists: true, $ne: null } } },
              { $count: "count" },
            ],
          },
        },
      ]).exec(),

      // Lead trend
      Lead.aggregate([
        {
          $match: {
            ...leadMatch,
            createdAt: { $gte: periodStart, $lte: periodEnd },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 as const } },
        { $project: { _id: 0, date: "$_id", value: "$count" } },
      ]).exec(),

      // Expense trend
      MarketingExpenseReport.aggregate([
        {
          $match: {
            ...expenseMatch,
            reportDate: { $gte: periodStart, $lte: periodEnd },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$reportDate" } },
            total: { $sum: { $add: ["$spentBudget.morning", "$spentBudget.afternoon", "$spentBudget.emergency"] } },
          },
        },
        { $sort: { _id: 1 as const } },
        { $project: { _id: 0, date: "$_id", value: "$total" } },
      ]).exec(),

      // Revenue trend
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: periodStart, $lte: periodEnd },
            isActive: true,
            status: { $nin: [OrderStatus.CANCELLED, OrderStatus.RETURNED] },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 as const } },
        { $project: { _id: 0, date: "$_id", value: "$total" } },
      ]).exec(),

      // ROAS trend
      MarketingExpenseReport.aggregate([
        {
          $match: {
            ...expenseMatch,
            reportDate: { $gte: periodStart, $lte: periodEnd },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$reportDate" } },
            spent: { $sum: { $add: ["$spentBudget.morning", "$spentBudget.afternoon", "$spentBudget.emergency"] } },
            revenue: { $sum: "$totalRevenue" },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            value: {
              $cond: [{ $gt: ["$spent", 0] }, { $divide: ["$revenue", "$spent"] }, 0],
            },
          },
        },
        { $sort: { date: 1 as const } },
      ]).exec(),

      // Conversion trend
      Lead.aggregate([
        {
          $match: {
            ...leadMatch,
            createdAt: { $gte: periodStart, $lte: periodEnd },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: 1 },
            closed: { $sum: { $cond: [{ $eq: ["$status", LeadStatus.CLOSED] }, 1, 0] } },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            value: {
              $cond: [
                { $gt: ["$total", 0] },
                { $multiply: [{ $divide: ["$closed", "$total"] }, 100] },
                0,
              ],
            },
          },
        },
        { $sort: { date: 1 as const } },
      ]).exec(),

      // Expense summary
      MarketingExpenseReport.aggregate([
        { $match: expenseMatch },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: { $add: ["$spentBudget.morning", "$spentBudget.afternoon", "$spentBudget.emergency"] } },
            totalRevenue: { $sum: "$totalRevenue" },
            totalClosedLeads: { $sum: "$closedLeads" },
          },
        },
      ]).exec(),

      // Top Facebook Pages
      aggregateTopFacebookPagesWithFilter(leadMatch),

      // Top Marketing Employees
      aggregateTopMarketingEmployeesWithFilter(leadMatch),

      // Top Campaigns
      aggregateTopCampaignsWithFilter(leadMatch),
    ]);

  const facets = summaryFacets[0] ?? {};
  const totalLead = (facets.totalLead?.[0]?.count as number) ?? 0;
  const closedLead = (facets.closedLead?.[0]?.count as number) ?? 0;
  const todayLead = (facets.todayLead?.[0]?.count as number) ?? 0;
  const monthLead = (facets.monthLead?.[0]?.count as number) ?? 0;
  const assignedLead = (facets.assignedLead?.[0]?.count as number) ?? 0;

  const expenseResult = expenseSummary[0] ?? { totalSpent: 0, totalRevenue: 0, totalClosedLeads: 0 };
  const roas = expenseResult.totalSpent > 0 ? expenseResult.totalRevenue / expenseResult.totalSpent : 0;
  const cpa = expenseResult.totalClosedLeads > 0 ? expenseResult.totalSpent / expenseResult.totalClosedLeads : 0;
  const conversionRate = totalLead > 0 ? Math.round((closedLead / totalLead) * 1000) / 10 : 0;

  return {
    summary: {
      todayLead,
      monthLead,
      totalLead,
      assignedLead,
      closedLead,
      totalSpent: expenseResult.totalSpent,
      monthRevenue: expenseResult.totalRevenue,
      roas,
      cpa,
      conversionRate,
    },
    leads: leadTrend,
    expenses: expenseTrend,
    revenues: revenueTrend,
    roas: roasTrend,
    cpa: conversionTrend,
    facebookPages: topPages,
    marketingEmployees: topEmployees,
    campaigns: topCampaigns,
  };
}

async function aggregateTopFacebookPagesWithFilter(
  leadMatch: Record<string, unknown>
): Promise<ExportData["facebookPages"]> {
  const pipeline = [
    { $match: { facebookPageId: { $exists: true, $ne: null }, isActive: { $ne: false } } },
    {
      $group: {
        _id: "$facebookPageId",
        totalSpent: { $sum: { $add: ["$spentBudget.morning", "$spentBudget.afternoon", "$spentBudget.emergency"] } },
        totalRevenue: { $sum: "$totalRevenue" },
        totalLeads: { $sum: "$totalLeads" },
      },
    },
    {
      $lookup: {
        from: "facebookpages",
        localField: "_id",
        foreignField: "_id",
        as: "page",
      },
    },
    { $unwind: { path: "$page", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        pageId: { $toString: "$_id" },
        pageName: { $ifNull: ["$page.name", "Unknown Page"] },
        totalSpent: 1,
        totalRevenue: 1,
        totalLeads: 1,
        roas: {
          $cond: [
            { $gt: ["$totalSpent", 0] },
            { $round: [{ $divide: ["$totalRevenue", "$totalSpent"] }, 2] },
            0,
          ],
        },
      },
    },
    { $sort: { totalRevenue: -1 as const } },
    { $limit: 10 },
  ];

  return MarketingExpenseReport.aggregate(pipeline).exec();
}

async function aggregateTopMarketingEmployeesWithFilter(
  leadMatch: Record<string, unknown>
): Promise<ExportData["marketingEmployees"]> {
  const pipeline = [
    {
      $match: {
        marketingEmployeeId: { $exists: true, $ne: null },
        isActive: true,
      },
    },
    {
      $lookup: {
        from: "marketingexperiencereports",
        localField: "marketingEmployeeId",
        foreignField: "marketingEmployeeId",
        as: "expenseData",
        pipeline: [
          { $match: { isActive: { $ne: false } } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$totalRevenue" },
            },
          },
        ],
      },
    },
    {
      $group: {
        _id: "$marketingEmployeeId",
        totalLeads: { $sum: 1 },
        qualifiedLeads: {
          $sum: { $cond: [{ $in: ["$status", [LeadStatus.QUALIFIED, LeadStatus.ASSIGNED]] }, 1, 0] },
        },
        closedLeads: {
          $sum: { $cond: [{ $eq: ["$status", LeadStatus.CLOSED] }, 1, 0] },
        },
        revenue: {
          $sum: { $arrayElemAt: ["$expenseData.totalRevenue", 0] },
        },
      },
    },
    {
      $lookup: {
        from: "employees",
        localField: "_id",
        foreignField: "_id",
        as: "employee",
      },
    },
    { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        employeeId: { $toString: "$_id" },
        employeeName: { $ifNull: ["$employee.name", "Unknown"] },
        avatar: { $ifNull: ["$employee.avatar", null] },
        totalLeads: 1,
        qualifiedLeads: 1,
        closedLeads: 1,
        revenue: { $ifNull: [{ $arrayElemAt: ["$expenseData.totalRevenue", 0] }, 0] },
      },
    },
    { $sort: { closedLeads: -1 as const } },
    { $limit: 10 },
  ];

  return Lead.aggregate(pipeline).exec();
}

async function aggregateTopCampaignsWithFilter(
  leadMatch: Record<string, unknown>
): Promise<ExportData["campaigns"]> {
  const pipeline = [
    {
      $match: {
        isActive: { $ne: false },
      },
    },
    {
      $group: {
        _id: "$facebookPageId",
        totalSpent: { $sum: { $add: ["$spentBudget.morning", "$spentBudget.afternoon", "$spentBudget.emergency"] } },
        totalRevenue: { $sum: "$totalRevenue" },
        totalLeads: { $sum: "$totalLeads" },
      },
    },
    {
      $lookup: {
        from: "facebookpages",
        localField: "_id",
        foreignField: "_id",
        as: "page",
      },
    },
    { $unwind: { path: "$page", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        campaignId: { $toString: "$_id" },
        campaignName: { $ifNull: ["$page.name", "Direct"] },
        totalSpent: 1,
        totalRevenue: 1,
        totalLeads: 1,
        roas: {
          $cond: [
            { $gt: ["$totalSpent", 0] },
            { $round: [{ $divide: ["$totalRevenue", "$totalSpent"] }, 2] },
            0,
          ],
        },
      },
    },
    { $sort: { roas: -1 as const } },
    { $limit: 10 },
  ];

  return MarketingExpenseReport.aggregate(pipeline).exec();
}

/**
 * Aggregate drill-down data — leads, expenses, revenues for a specific filter.
 */
export async function aggregateDrillDown(
  filter: MarketingDashboardFilter
): Promise<DrillDownData> {
  const leadMatch = buildLeadMatch(filter);
  const expenseMatch = buildExpenseMatch(filter);

  const [leads, expenses, revenues, expenseSummary] = await Promise.all([
    // Leads
    Lead.aggregate([
      { $match: leadMatch },
      {
        $lookup: {
          from: "employees",
          localField: "marketingEmployeeId",
          foreignField: "_id",
          as: "marketingEmployee",
        },
      },
      {
        $lookup: {
          from: "facebookpages",
          localField: "facebookPageId",
          foreignField: "_id",
          as: "facebookPage",
        },
      },
      {
        $project: {
          _id: { $toString: "$_id" },
          leadCode: 1,
          customerName: 1,
          phone: 1,
          sourceType: 1,
          status: 1,
          marketingEmployeeName: {
            $ifNull: [{ $arrayElemAt: ["$marketingEmployee.name", 0] }, null],
          },
          facebookPageName: {
            $ifNull: [{ $arrayElemAt: ["$facebookPage.name", 0] }, null],
          },
          createdAt: {
            $dateToString: { format: "%Y-%m-%d %H:%M", date: "$createdAt" },
          },
        },
      },
      { $sort: { createdAt: -1 as const } },
      { $limit: 100 },
    ]).exec(),

    // Expenses
    MarketingExpenseReport.aggregate([
      { $match: expenseMatch },
      {
        $lookup: {
          from: "employees",
          localField: "marketingEmployeeId",
          foreignField: "_id",
          as: "marketingEmployee",
        },
      },
      {
        $lookup: {
          from: "facebookpages",
          localField: "facebookPageId",
          foreignField: "_id",
          as: "facebookPage",
        },
      },
      {
        $project: {
          _id: { $toString: "$_id" },
          reportDate: {
            $dateToString: { format: "%Y-%m-%d", date: "$reportDate" },
          },
          marketingEmployeeName: {
            $ifNull: [{ $arrayElemAt: ["$marketingEmployee.name", 0] }, null],
          },
          facebookPageName: {
            $ifNull: [{ $arrayElemAt: ["$facebookPage.name", 0] }, null],
          },
          totalSpent: {
            $add: ["$spentBudget.morning", "$spentBudget.afternoon", "$spentBudget.emergency"],
          },
          totalRevenue: 1,
          totalLeads: 1,
          roas: 1,
        },
      },
      { $sort: { reportDate: -1 as const } },
      { $limit: 100 },
    ]).exec(),

    // Revenues
    Order.aggregate([
      {
        $match: {
          isActive: true,
          status: { $nin: [OrderStatus.CANCELLED, OrderStatus.RETURNED] },
        },
      },
      { $limit: 100 },
    ]).exec(),

    // Expense summary
    MarketingExpenseReport.aggregate([
      { $match: expenseMatch },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: { $add: ["$spentBudget.morning", "$spentBudget.afternoon", "$spentBudget.emergency"] } },
          totalRevenue: { $sum: "$totalRevenue" },
          totalClosedLeads: { $sum: "$closedLeads" },
        },
      },
    ]).exec(),
  ]);

  const expenseResult = expenseSummary[0] ?? { totalSpent: 0, totalRevenue: 0, totalClosedLeads: 0 };
  const roas = expenseResult.totalSpent > 0 ? expenseResult.totalRevenue / expenseResult.totalSpent : 0;
  const cpa = expenseResult.totalClosedLeads > 0 ? expenseResult.totalSpent / expenseResult.totalClosedLeads : 0;

  return {
    leads: leads.map((l) => ({
      _id: l._id,
      leadCode: l.leadCode,
      customerName: l.customerName,
      phone: l.phone,
      sourceType: l.sourceType,
      status: l.status,
      marketingEmployeeName: l.marketingEmployeeName ?? undefined,
      facebookPageName: l.facebookPageName ?? undefined,
      createdAt: l.createdAt,
    })),
    expenses: expenses.map((e) => ({
      _id: e._id,
      reportDate: e.reportDate,
      marketingEmployeeName: e.marketingEmployeeName ?? undefined,
      facebookPageName: e.facebookPageName ?? undefined,
      totalSpent: e.totalSpent,
      totalRevenue: e.totalRevenue,
      totalLeads: e.totalLeads,
      roas: e.roas,
    })),
    revenues: revenues.map((r) => ({
      _id: r._id?.toString() ?? "",
      orderCode: r.orderCode,
      customerName: r.customerName ?? "",
      totalAmount: r.totalAmount ?? 0,
      status: r.status ?? "",
      createdAt: r.createdAt?.toString() ?? "",
    })),
    summary: {
      totalLeads: leads.length,
      totalExpense: expenseResult.totalSpent,
      totalRevenue: expenseResult.totalRevenue,
      roas,
      cpa,
    },
  };
}

// ============================================================================
// Repository Export
// ============================================================================

export const dashboardRepository = {
  // Summary methods
  aggregateLeadSummary,
  aggregateLeadSource,
  aggregateTopMarketingByLeads,
  aggregateExpenseSummary,
  aggregateTopMarketingChannels,
  aggregateRevenueSummary,
  // Chart trend methods
  aggregateLeadTrend,
  aggregateExpenseTrend,
  aggregateRevenueTrend,
  aggregateROASTrend,
  aggregateConversionTrend,
  // Ranking methods
  aggregateTopFacebookPages,
  aggregateTopMarketingEmployees,
  aggregateTopCampaigns,
  // Combined methods
  aggregateMarketingDashboard,
  aggregateChartData,
  aggregateRankingData,
  // Sprint 7.3
  aggregateExportData,
  aggregateDrillDown,
};

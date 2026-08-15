/**
 * Lead Repository (Sprint 5.2 — Lead Domain Foundation)
 *
 * Clean Architecture: Repository layer cho Lead.
 * Chỉ làm việc với MongoDB - không có business logic.
 *
 * Sprint 5.4A: Chứa toàn bộ Mongo Aggregation cho Dashboard.
 */

import mongoose, { type SortOrder } from "mongoose";
import { Lead, type ILead } from "@/models/Lead";
import { LeadStatus } from "@/constants/leadStatus";
import type {
  LeadSearchParams,
  CreateLeadInput,
  UpdateLeadInput,
} from "@/types/lead";
import type {
  MarketingSummary,
  DailyLeadChartItem,
  LeadSourceChartItem,
  TopMarketingItem,
} from "@/types/marketing-dashboard";
import { LeadSource, LEAD_SOURCE_LABELS } from "@/constants/leadSource";

/**
 * Map MongoDB document to Lead domain type
 */
function mapToLead(doc: ILead) {
  const rawDoc = doc as ILead & {
    marketingEmployeeId?: { _id: { toString(): string }; employeeCode: string; name: string };
    saleEmployeeId?: { _id: { toString(): string }; employeeCode: string; name: string };
    comboId?: { _id: { toString(): string }; code: string; name: string };
    productId?: { _id: { toString(): string }; code: string; name: string };
    facebookPageId?: { _id: { toString(): string }; code: string; name: string };
  };

  return {
    _id: doc._id.toString(),
    leadCode: doc.leadCode,
    customerId: doc.customerId?.toString(),
    customerName: doc.customerName,
    customerNewName: doc.customerNewName,
    facebookLink: doc.facebookLink,
    phone: doc.phone,
    phone2: doc.phone2,
    email: doc.email,
    address: doc.address,
    sourceType: doc.sourceType,
    facebookPageId: doc.facebookPageId?.toString(),
    facebookPageAssignmentId: doc.facebookPageAssignmentId?.toString(),
    marketingEmployeeId: rawDoc.marketingEmployeeId && typeof rawDoc.marketingEmployeeId === "object" && "employeeCode" in rawDoc.marketingEmployeeId
      ? rawDoc.marketingEmployeeId._id.toString()
      : doc.marketingEmployeeId?.toString(),
    marketingEmployee: rawDoc.marketingEmployeeId && typeof rawDoc.marketingEmployeeId === "object" && "employeeCode" in rawDoc.marketingEmployeeId
      ? {
          _id: rawDoc.marketingEmployeeId._id.toString(),
          employeeCode: rawDoc.marketingEmployeeId.employeeCode,
          name: rawDoc.marketingEmployeeId.name,
        }
      : undefined,
    saleEmployeeId: rawDoc.saleEmployeeId && typeof rawDoc.saleEmployeeId === "object" && "employeeCode" in rawDoc.saleEmployeeId
      ? rawDoc.saleEmployeeId._id.toString()
      : doc.saleEmployeeId?.toString(),
    saleEmployee: rawDoc.saleEmployeeId && typeof rawDoc.saleEmployeeId === "object" && "employeeCode" in rawDoc.saleEmployeeId
      ? {
          _id: rawDoc.saleEmployeeId._id.toString(),
          employeeCode: rawDoc.saleEmployeeId.employeeCode,
          name: rawDoc.saleEmployeeId.name,
        }
      : undefined,
    combo: rawDoc.comboId && typeof rawDoc.comboId === "object" && "code" in rawDoc.comboId
      ? {
          _id: rawDoc.comboId._id.toString(),
          code: rawDoc.comboId.code,
          name: rawDoc.comboId.name,
        }
      : undefined,
    product: rawDoc.productId && typeof rawDoc.productId === "object" && "code" in rawDoc.productId
      ? {
          _id: rawDoc.productId._id.toString(),
          code: rawDoc.productId.code,
          name: rawDoc.productId.name,
        }
      : undefined,
    facebookPage: rawDoc.facebookPageId && typeof rawDoc.facebookPageId === "object" && "code" in rawDoc.facebookPageId
      ? {
          _id: rawDoc.facebookPageId._id.toString(),
          code: rawDoc.facebookPageId.code,
          name: rawDoc.facebookPageId.name,
        }
      : undefined,
    assignmentType: doc.assignmentType,
    assignedAt: doc.assignedAt,
    categoryId: doc.categoryId?.toString(),
    productId: doc.productId?.toString(),
    comboId: doc.comboId?.toString(),
    quantity: doc.quantity,
    unitPriceMNT: doc.unitPriceMNT,
    exchangeRate: doc.exchangeRate,
    estimatedWeight: doc.estimatedWeight,
    status: doc.status,
    latestRemark: doc.latestRemark,
    note: doc.note,
    isDuplicate: doc.isDuplicate,
    isActive: doc.isActive,
    // Sprint 5.7 — Lead Convert (Sprint 8.4: renamed orderId to convertedOrderId)
    isConverted: doc.isConverted,
    convertedOrderId: doc.convertedOrderId?.toString(),
    convertedAt: doc.convertedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Build MongoDB filter from search params
 */
function buildFilter(params: LeadSearchParams): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (params.keyword) {
    filter.$or = [
      { leadCode: { $regex: params.keyword, $options: "i" } },
      { customerName: { $regex: params.keyword, $options: "i" } },
      { phone: { $regex: params.keyword, $options: "i" } },
      { phone2: { $regex: params.keyword, $options: "i" } },
      { email: { $regex: params.keyword, $options: "i" } },
      { facebookLink: { $regex: params.keyword, $options: "i" } },
    ];
  }

  if (params.status) {
    filter.status = params.status;
  }

  if (params.marketingEmployeeId) {
    filter.marketingEmployeeId = new mongoose.Types.ObjectId(params.marketingEmployeeId);
  }

  if (params.saleEmployeeId) {
    filter.saleEmployeeId = new mongoose.Types.ObjectId(params.saleEmployeeId);
  }

  if (params.facebookPageId) {
    filter.facebookPageId = new mongoose.Types.ObjectId(params.facebookPageId);
  }

  if (params.sourceType) {
    filter.sourceType = params.sourceType;
  }

  if (params.isDuplicate !== undefined) {
    filter.isDuplicate = params.isDuplicate;
  }

  if (params.isActive !== undefined) {
    filter.isActive = params.isActive;
  }

  if (params.createdFrom || params.createdTo) {
    filter.createdAt = {};
    if (params.createdFrom) {
      (filter.createdAt as Record<string, Date>).$gte = new Date(params.createdFrom);
    }
    if (params.createdTo) {
      const endDate = new Date(params.createdTo);
      endDate.setHours(23, 59, 59, 999);
      (filter.createdAt as Record<string, Date>).$lte = endDate;
    }
  }

  return filter;
}

/**
 * CreateLeadInputWithDefaults - includes defaults set by service
 */
type CreateLeadInputWithDefaults = CreateLeadInput & {
  leadCode: string;
  status: string;
  isDuplicate: boolean;
  isActive: boolean;
};

const SORT_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "leadCode",
  "customerName",
  "status",
  "sourceType",
]);

function buildSort(params: LeadSearchParams): Record<string, SortOrder> {
  const sortField = params.sort && SORT_FIELDS.has(params.sort) ? params.sort : "createdAt";
  const sortOrder: SortOrder = params.order === "asc" ? 1 : -1;
  return { [sortField]: sortOrder };
}

export class LeadRepository {
  /**
   * Create a new lead
   */
  async create(data: CreateLeadInputWithDefaults) {
    const doc = await Lead.create(data);
    return mapToLead(doc);
  }

  /**
   * Update a lead by ID
   */
  async update(id: string, data: UpdateLeadInput) {
    // Normalize comboId: empty string → unset; valid string → ObjectId
    const updateData: Record<string, unknown> = { ...data };
    if ("comboId" in updateData) {
      const comboId = updateData.comboId;
      if (!comboId || (typeof comboId === "string" && comboId.trim() === "")) {
        updateData.comboId = null;
      } else if (typeof comboId === "string" && mongoose.Types.ObjectId.isValid(comboId)) {
        updateData.comboId = new mongoose.Types.ObjectId(comboId);
      }
    }
    if ("facebookPageId" in updateData) {
      const pageId = updateData.facebookPageId;
      if (!pageId || (typeof pageId === "string" && pageId.trim() === "")) {
        updateData.facebookPageId = null;
      } else if (typeof pageId === "string" && mongoose.Types.ObjectId.isValid(pageId)) {
        updateData.facebookPageId = new mongoose.Types.ObjectId(pageId);
      }
    }
    if ("marketingEmployeeId" in updateData) {
      const empId = updateData.marketingEmployeeId;
      if (!empId || (typeof empId === "string" && empId.trim() === "")) {
        updateData.marketingEmployeeId = null;
      } else if (typeof empId === "string" && mongoose.Types.ObjectId.isValid(empId)) {
        updateData.marketingEmployeeId = new mongoose.Types.ObjectId(empId);
      }
    }
    if ("saleEmployeeId" in updateData) {
      const empId = updateData.saleEmployeeId;
      if (!empId || (typeof empId === "string" && empId.trim() === "")) {
        updateData.saleEmployeeId = null;
      } else if (typeof empId === "string" && mongoose.Types.ObjectId.isValid(empId)) {
        updateData.saleEmployeeId = new mongoose.Types.ObjectId(empId);
      }
    }
    if ("categoryId" in updateData) {
      const catId = updateData.categoryId;
      if (!catId || (typeof catId === "string" && catId.trim() === "")) {
        updateData.categoryId = null;
      } else if (typeof catId === "string" && mongoose.Types.ObjectId.isValid(catId)) {
        updateData.categoryId = new mongoose.Types.ObjectId(catId);
      }
    }
    if ("productId" in updateData) {
      const prodId = updateData.productId;
      if (!prodId || (typeof prodId === "string" && prodId.trim() === "")) {
        updateData.productId = null;
      } else if (typeof prodId === "string" && mongoose.Types.ObjectId.isValid(prodId)) {
        updateData.productId = new mongoose.Types.ObjectId(prodId);
      }
    }
    updateData.updatedAt = new Date();

    const doc = await Lead.findByIdAndUpdate(id, updateData, { new: true })
      .populate("comboId", "_id code name")
      .populate("productId", "_id code name")
      .populate("facebookPageId", "_id code name")
      .lean();
    if (!doc) return null;
    return mapToLead(doc as ILead);
  }

  /**
   * Delete a lead by ID (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    const result = await Lead.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    return result !== null;
  }

  /**
   * Assign sale employee to a lead
   */
  async assignSale(id: string, saleEmployeeId: string) {
    const doc = await Lead.findByIdAndUpdate(
      id,
      {
        saleEmployeeId: new mongoose.Types.ObjectId(saleEmployeeId),
        assignedAt: new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    )
      .populate("marketingEmployeeId", "_id employeeCode name")
      .populate("saleEmployeeId", "_id employeeCode name")
      .lean();
    if (!doc) return null;
    return mapToLead(doc as ILead);
  }

  /**
   * Find lead by ID
   */
  async findById(id: string) {
    const doc = await Lead.findById(id)
      .populate("marketingEmployeeId", "_id employeeCode name")
      .populate("saleEmployeeId", "_id employeeCode name")
      .populate("comboId", "_id code name")
      .populate("productId", "_id code name")
      .populate("facebookPageId", "_id code name")
      .lean();
    if (!doc) return null;
    return mapToLead(doc as ILead);
  }

  /**
   * Find lead by ID with population
   */
  async findByIdWithPopulate(id: string): Promise<ILead | null> {
    return Lead.findById(id)
      .populate("customerId", "_id code name phone")
      .populate("facebookPageId", "_id code name")
      .populate("marketingEmployeeId", "_id employeeCode name")
      .populate("saleEmployeeId", "_id employeeCode name")
      .populate("categoryId", "_id code name")
      .populate("productId", "_id code name")
      .populate("comboId", "_id code name")
      .lean();
  }

  /**
   * Find all leads with pagination
   */
  async findAll(params: LeadSearchParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;
    const filter = buildFilter(params);

    const [items, total] = await Promise.all([
      Lead.find(filter)
        .populate("marketingEmployeeId", "_id employeeCode name")
        .populate("saleEmployeeId", "_id employeeCode name")
        .populate("comboId", "_id code name")
        .populate("productId", "_id code name")
        .populate("facebookPageId", "_id code name")
        .sort(buildSort(params))
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    return {
      items: items.map((doc) => mapToLead(doc as ILead)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Count leads matching filter
   */
  async count(params: Partial<LeadSearchParams> = {}): Promise<number> {
    const filter = buildFilter(params as LeadSearchParams);
    return Lead.countDocuments(filter);
  }

  /**
   * Check if lead exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const count = await Lead.countDocuments({ _id: id });
    return count > 0;
  }

  /**
   * Check if phone number already exists
   */
  async existsByPhone(phone: string): Promise<boolean> {
    const count = await Lead.countDocuments({
      phone,
      isActive: true,
    });
    return count > 0;
  }

  // =========================================================================
  // Dashboard Aggregation Methods (Sprint 5.4A)
  // =========================================================================

  /**
   * Aggregate summary counts using $facet — runs all 6 counts in one round-trip.
   *
   * todayLead  = count leads with createdAt = today (start → end of today)
   * weekLead   = count leads with createdAt in last 7 days
   * monthLead  = count leads with createdAt from start of current month
   * totalLead  = count all active leads
   * assignedLead = count leads with saleEmployeeId assigned
   * closedLead = count leads with status = CLOSED
   * conversionRate = closedLead / totalLead * 100
   */
  async aggregateSummary(): Promise<MarketingSummary> {
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
   * Aggregate daily lead counts for the last 7 days.
   *
   * Groups by date (YYYY-MM-DD), sorts ascending, fills missing dates with 0
   * so the chart always shows 7 consecutive days.
   */
  async aggregateDailyLead(): Promise<DailyLeadChartItem[]> {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const weekStart = new Date(todayStart);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: weekStart },
          isActive: true,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 as const } },
      { $project: { _id: 0, date: "$_id", count: 1 } },
    ];

    const results = await Lead.aggregate(pipeline).exec();

    const dateMap = new Map<string, number>();
    for (const r of results) {
      dateMap.set(r.date, r.count);
    }

    const items: DailyLeadChartItem[] = [];
    const cursor = new Date(weekStart);
    while (cursor <= now) {
      const dateStr = cursor.toISOString().slice(0, 10);
      items.push({ date: dateStr, count: dateMap.get(dateStr) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return items;
  }

  /**
   * Aggregate lead counts grouped by sourceType.
   *
   * Maps sourceType enum to human-readable label via LEAD_SOURCE_LABELS.
   * Falls back to raw sourceType if label not found.
   */
  async aggregateLeadSource(): Promise<LeadSourceChartItem[]> {
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
   * Aggregate top marketing employees by lead performance.
   *
   * Groups by marketingEmployeeId (already exists in Lead schema).
   * Counts total leads and closed leads per employee, calculates conversionRate.
   * Uses $lookup to fetch employee name from employees collection.
   * Returns top N sorted by totalLead descending.
   *
   * NOTE: Leads without marketingEmployeeId are excluded — expected behaviour.
   */
  async aggregateTopMarketing(limit = 5): Promise<TopMarketingItem[]> {
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

  // =========================================================================
  // Sprint 8.4 — Lead Conversion Methods
  // =========================================================================

  /**
   * Mark a lead as converted (with the order ID).
   */
  async markAsConverted(leadId: string, orderId: string) {
    const doc = await Lead.findByIdAndUpdate(
      leadId,
      {
        isConverted: true,
        convertedOrderId: new mongoose.Types.ObjectId(orderId),
        convertedAt: new Date(),
        updatedAt: new Date(),
      },
      { new: true }
    )
      .populate("marketingEmployeeId", "_id employeeCode name")
      .populate("saleEmployeeId", "_id employeeCode name")
      .populate("comboId", "_id code name")
      .populate("productId", "_id code name")
      .populate("facebookPageId", "_id code name")
      .lean();
    if (!doc) return null;
    return mapToLead(doc as ILead);
  }

  /**
   * Find unconverted leads (for sale to work on).
   */
  async findUnconverted(params: LeadSearchParams = {}) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter = buildFilter(params);
    filter.isConverted = false;
    filter.isActive = true;

    const [items, total] = await Promise.all([
      Lead.find(filter)
        .populate("marketingEmployeeId", "_id employeeCode name")
        .populate("saleEmployeeId", "_id employeeCode name")
        .populate("comboId", "_id code name")
        .populate("productId", "_id code name")
        .populate("facebookPageId", "_id code name")
        .sort(buildSort(params))
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    return {
      items: items.map((doc) => mapToLead(doc as ILead)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Find converted leads (for reporting).
   */
  async findConverted(params: LeadSearchParams = {}) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter = buildFilter(params);
    filter.isConverted = true;
    filter.isActive = true;

    const [items, total] = await Promise.all([
      Lead.find(filter)
        .populate("marketingEmployeeId", "_id employeeCode name")
        .populate("saleEmployeeId", "_id employeeCode name")
        .populate("convertedOrderId", "_id orderCode totalAmount status")
        .populate("comboId", "_id code name")
        .populate("productId", "_id code name")
        .populate("facebookPageId", "_id code name")
        .sort(buildSort(params))
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    return {
      items: items.map((doc) => mapToLead(doc as ILead)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}

// Singleton instance
export const leadRepository = new LeadRepository();

/**
 * ==================================================
 * MARKETING EXPENSE REPOSITORY
 * ==================================================
 *
 * Sprint 6.5 — Marketing Expense Domain
 *
 * Clean Architecture: Repository layer cho MarketingExpenseReport.
 * CHỈ truy cập MongoDB - KHÔNG có business logic.
 */

import mongoose, { type SortOrder } from "mongoose";
import {
  MarketingExpenseReport,
  type IMarketingExpenseReport,
  type IBudgetAllocation,
} from "@/models/MarketingExpenseReport";
import type { Types } from "mongoose";
import type { MarketingExpenseFilter } from "@/types/marketing-expense";

// ============================================================================
// Types
// ============================================================================

export interface CreateMarketingExpenseReportData {
  reportDate: Date;
  marketingEmployeeId: Types.ObjectId;
  facebookPageId?: Types.ObjectId | null;
  requestedBudget: IBudgetAllocation;
  spentBudget: IBudgetAllocation;
  remainingBudget: IBudgetAllocation;
  totalRevenue: number;
  totalLeads: number;
  closedLeads: number;
  conversionRate: number;
  roas: number;
  cpa: number;
  createdBy: Types.ObjectId;
}

export interface UpdateMarketingExpenseReportData {
  marketingEmployeeId?: Types.ObjectId;
  facebookPageId?: Types.ObjectId | null;
  requestedBudget?: IBudgetAllocation;
  spentBudget?: IBudgetAllocation;
  remainingBudget?: IBudgetAllocation;
  totalRevenue?: number;
  totalLeads?: number;
  closedLeads?: number;
  conversionRate?: number;
  roas?: number;
  cpa?: number;
  status?: string;
  approvedBy?: Types.ObjectId | null;
  lockedBy?: Types.ObjectId | null;
  rejectedBy?: Types.ObjectId | null;
  approvedAt?: Date | null;
  lockedAt?: Date | null;
  rejectedAt?: Date | null;
  rejectionReason?: string;
}

// ============================================================================
// Mapper
// ============================================================================

function mapToReport(doc: IMarketingExpenseReport) {
  return {
    _id: doc._id.toString(),
    reportDate: doc.reportDate.toISOString(),
    marketingEmployeeId: doc.marketingEmployeeId.toString(),
    facebookPageId: doc.facebookPageId ? doc.facebookPageId.toString() : null,
    requestedBudget: doc.requestedBudget,
    spentBudget: doc.spentBudget,
    remainingBudget: doc.remainingBudget,
    totalRevenue: doc.totalRevenue,
    totalLeads: doc.totalLeads,
    closedLeads: doc.closedLeads,
    conversionRate: doc.conversionRate,
    roas: doc.roas,
    cpa: doc.cpa,
    status: doc.status,
    createdBy: doc.createdBy.toString(),
    approvedBy: doc.approvedBy ? doc.approvedBy.toString() : null,
    lockedBy: doc.lockedBy ? doc.lockedBy.toString() : null,
    rejectedBy: doc.rejectedBy ? doc.rejectedBy.toString() : null,
    approvedAt: doc.approvedAt ? doc.approvedAt.toISOString() : null,
    lockedAt: doc.lockedAt ? doc.lockedAt.toISOString() : null,
    rejectedAt: doc.rejectedAt ? doc.rejectedAt.toISOString() : null,
    rejectionReason: doc.rejectionReason ?? "",
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// ============================================================================
// Filter builder
// ============================================================================

function buildFilter(params: MarketingExpenseFilter): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (params.status) {
    filter.status = params.status;
  }

  if (params.marketingEmployeeId) {
    filter.marketingEmployeeId = new mongoose.Types.ObjectId(
      params.marketingEmployeeId
    );
  }

  if (params.facebookPageId) {
    filter.facebookPageId = new mongoose.Types.ObjectId(params.facebookPageId);
  }

  if (params.dateFrom || params.dateTo) {
    filter.reportDate = {};
    if (params.dateFrom) {
      (filter.reportDate as Record<string, Date>).$gte = new Date(
        params.dateFrom
      );
    }
    if (params.dateTo) {
      const endDate = new Date(params.dateTo);
      endDate.setHours(23, 59, 59, 999);
      (filter.reportDate as Record<string, Date>).$lte = endDate;
    }
  }

  return filter;
}

const SORT_FIELDS = new Set([
  "reportDate",
  "createdAt",
  "updatedAt",
  "totalRevenue",
  "roas",
  "cpa",
]);

function buildSort(params: MarketingExpenseFilter): Record<string, SortOrder> {
  const sortField =
    params.sort && SORT_FIELDS.has(params.sort) ? params.sort : "reportDate";
  const sortOrder: SortOrder = params.order === "asc" ? 1 : -1;
  return { [sortField]: sortOrder };
}

// ============================================================================
// Repository
// ============================================================================

export class MarketingExpenseRepository {
  /**
   * Create a new report.
   */
  async create(
    data: CreateMarketingExpenseReportData,
    session?: mongoose.ClientSession
  ): Promise<ReturnType<typeof mapToReport>> {
    const doc = new MarketingExpenseReport({
      ...data,
      status: "DRAFT",
    });
    const saved = await doc.save({ session });
    return mapToReport(saved);
  }

  /**
   * Find report by ID.
   */
  async findById(id: string): Promise<ReturnType<typeof mapToReport> | null> {
    const doc = await MarketingExpenseReport.findById(id).lean();
    if (!doc) return null;
    return mapToReport(doc as IMarketingExpenseReport);
  }

  /**
   * Find report by ID with populated refs.
   */
  async findByIdWithPopulate(
    id: string
  ): Promise<IMarketingExpenseReport | null> {
    return MarketingExpenseReport.findById(id)
      .populate("marketingEmployeeId", "_id employeeCode fullName")
      .populate("facebookPageId", "_id code name")
      .lean();
  }

  /**
   * Find all reports with pagination & filters.
   */
  async findAll(params: MarketingExpenseFilter) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;
    const filter = buildFilter(params);

    const [items, total] = await Promise.all([
      MarketingExpenseReport.find(filter)
        .populate("marketingEmployeeId", "_id employeeCode fullName")
        .populate("facebookPageId", "_id code name")
        .sort(buildSort(params))
        .skip(skip)
        .limit(limit)
        .lean(),
      MarketingExpenseReport.countDocuments(filter),
    ]);

    return {
      items: items.map((doc) => mapToReport(doc as IMarketingExpenseReport)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Update a report by ID.
   */
  async update(
    id: string,
    data: UpdateMarketingExpenseReportData,
    session?: mongoose.ClientSession
  ): Promise<ReturnType<typeof mapToReport> | null> {
    const doc = await MarketingExpenseReport.findByIdAndUpdate(id, data, {
      new: true,
      session,
    }).lean();
    if (!doc) return null;
    return mapToReport(doc as IMarketingExpenseReport);
  }

  /**
   * Soft delete a report by ID (hard delete theo yêu cầu nghiệp vụ).
   *
   * Lưu ý: Repository cho phép hard-delete; Service sẽ kiểm tra status
   * trước khi cho phép xóa.
   */
  async delete(id: string, session?: mongoose.ClientSession): Promise<boolean> {
    const result = await MarketingExpenseReport.findByIdAndDelete(id, {
      session,
    });
    return result !== null;
  }

  /**
   * Count reports matching filter.
   */
  async count(
    params: Partial<MarketingExpenseFilter> = {}
  ): Promise<number> {
    const filter = buildFilter(params as MarketingExpenseFilter);
    return MarketingExpenseReport.countDocuments(filter);
  }

  /**
   * Check if a report exists.
   */
  async exists(id: string): Promise<boolean> {
    const count = await MarketingExpenseReport.countDocuments({ _id: id });
    return count > 0;
  }

  /**
   * Find report by exact reportDate (00:00 → 23:59 cùng ngày).
   */
  async findByDate(
    reportDate: Date,
    facebookPageId?: string | null
  ): Promise<ReturnType<typeof mapToReport> | null> {
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    const filter: Record<string, unknown> = {
      reportDate: { $gte: startOfDay, $lte: endOfDay },
    };

    if (facebookPageId) {
      filter.facebookPageId = new mongoose.Types.ObjectId(facebookPageId);
    } else {
      filter.facebookPageId = null;
    }

    const doc = await MarketingExpenseReport.findOne(filter).lean();
    if (!doc) return null;
    return mapToReport(doc as IMarketingExpenseReport);
  }

  /**
   * Find report by exact date AND specific facebookPageId.
   * Dùng cho check duplicate khi tạo report mới.
   */
  async findByDateAndPage(
    reportDate: Date,
    facebookPageId: string | null
  ): Promise<ReturnType<typeof mapToReport> | null> {
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    const filter: Record<string, unknown> = {
      reportDate: { $gte: startOfDay, $lte: endOfDay },
    };

    if (facebookPageId) {
      filter.facebookPageId = new mongoose.Types.ObjectId(facebookPageId);
    } else {
      filter.facebookPageId = null;
    }

    const doc = await MarketingExpenseReport.findOne(filter).lean();
    if (!doc) return null;
    return mapToReport(doc as IMarketingExpenseReport);
  }

  /**
   * Dashboard-level raw rows từ MongoDB.
   *
   * Repository chỉ chiếu field từ MongoDB — KHÔNG tính sum/avg.
   * Service sẽ pass rows này cho `MarketingExpenseCalculator.aggregateMetrics()`.
   *
   * Đặt tên `aggregateDashboardRows` để chừa chỗ cho:
   *   - aggregateMonthlyRows()
   *   - aggregateYearRows()
   *   - aggregateEmployeeRows()
   *   - aggregatePageRows()
   *   - aggregateCampaignRows()
   */
  async aggregateDashboardRows(filter: MarketingExpenseFilter) {
    const match = buildFilter(filter);

    const rows = await MarketingExpenseReport.aggregate<{
      requestedBudget: IBudgetAllocation;
      spentBudget: IBudgetAllocation;
      remainingBudget: IBudgetAllocation;
      totalRevenue: number;
      totalLeads: number;
      closedLeads: number;
      conversionRate: number;
      roas: number;
      cpa: number;
    }>([
      { $match: match },
      {
        $project: {
          _id: 0,
          requestedBudget: 1,
          spentBudget: 1,
          remainingBudget: 1,
          totalRevenue: 1,
          totalLeads: 1,
          closedLeads: 1,
          conversionRate: 1,
          roas: 1,
          cpa: 1,
        },
      },
    ]);

    return rows ?? [];
  }
}

// ============================================================================
// Singleton
// ============================================================================

export const marketingExpenseRepository = new MarketingExpenseRepository();

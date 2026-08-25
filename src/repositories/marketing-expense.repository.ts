/**
 * ==================================================
 * MARKETING EXPENSE REPOSITORY
 * ==================================================
 *
 * Workflow Simplification Refactor (Aug 2026)
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
  updatedBy?: Types.ObjectId | null;
  lockedBy?: Types.ObjectId | null;
  lockedAt?: Date | null;
  reopenedBy?: Types.ObjectId | null;
  reopenedAt?: Date | null;
  note?: string;
  isActive?: boolean;
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
    lockedBy: doc.lockedBy ? doc.lockedBy.toString() : null,
    lockedAt: doc.lockedAt ? doc.lockedAt.toISOString() : null,
    reopenedBy: doc.reopenedBy ? doc.reopenedBy.toString() : null,
    reopenedAt: doc.reopenedAt ? doc.reopenedAt.toISOString() : null,
    note: doc.note ?? "",
    isActive: doc.isActive ?? true,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// ============================================================================
// Filter builder
// ============================================================================

function buildFilter(params: MarketingExpenseFilter): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  // isActive — soft-delete semantics.
  if (params.isActive === false) {
    filter.isActive = false;
  } else if (params.isActive === true) {
    filter.isActive = true;
  } else {
    filter.isActive = { $ne: false };
  }

  // keyword — search trên `note` (case-insensitive substring).
  if (params.keyword && params.keyword.trim().length > 0) {
    filter.note = { $regex: escapeRegex(params.keyword.trim()), $options: "i" };
  }

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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SORT_FIELDS = new Set([
  "reportDate",
  "requestedBudget",
  "spentBudget",
  "totalRevenue",
  "cpa",
  "roas",
  "conversionRate",
  "createdAt",
  "updatedAt",
]);

function buildSort(params: MarketingExpenseFilter): Record<string, SortOrder> {
  const requested = params.sortField;
  const sortField =
    requested && SORT_FIELDS.has(requested) ? requested : "reportDate";
  const sortOrder: SortOrder = params.sortOrder === "asc" ? 1 : -1;
  return { [sortField]: sortOrder };
}

// ============================================================================
// Repository
// ============================================================================

export class MarketingExpenseRepository {
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

  async findById(id: string): Promise<ReturnType<typeof mapToReport> | null> {
    const doc = await MarketingExpenseReport.findOne({
      _id: id,
      isActive: { $ne: false },
    }).lean();
    if (!doc) return null;
    return mapToReport(doc as IMarketingExpenseReport);
  }

  async findByIdWithPopulate(
    id: string
  ): Promise<IMarketingExpenseReport | null> {
    return MarketingExpenseReport.findOne({
      _id: id,
      isActive: { $ne: false },
    })
      .populate("marketingEmployeeId", "_id employeeCode fullName")
      .populate("facebookPageId", "_id code name")
      .populate("createdBy", "_id employeeCode fullName")
      .populate("lockedBy", "_id employeeCode fullName")
      .populate("reopenedBy", "_id employeeCode fullName")
      .lean();
  }

  async findAll(params: MarketingExpenseFilter) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const filter = buildFilter(params);

    const [items, total] = await Promise.all([
      MarketingExpenseReport.find(filter)
        .populate("marketingEmployeeId", "_id employeeCode fullName")
        .populate("facebookPageId", "_id code name")
        .sort(buildSort(params))
        .skip(skip)
        .limit(pageSize)
        .lean(),
      MarketingExpenseReport.countDocuments(filter),
    ]);

    return {
      items: items.map((doc) => mapToReport(doc as IMarketingExpenseReport)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

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

  async softDelete(
    id: string,
    session?: mongoose.ClientSession
  ): Promise<boolean> {
    const result = await MarketingExpenseReport.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { returnDocument: "after", session }
    ).lean();
    return result !== null;
  }

  async delete(id: string, session?: mongoose.ClientSession): Promise<boolean> {
    const result = await MarketingExpenseReport.findByIdAndDelete(id, {
      session,
    });
    return result !== null;
  }

  async count(
    params: Partial<MarketingExpenseFilter> = {}
  ): Promise<number> {
    const filter = buildFilter(params as MarketingExpenseFilter);
    return MarketingExpenseReport.countDocuments(filter);
  }

  async exists(id: string): Promise<boolean> {
    const count = await MarketingExpenseReport.countDocuments({ _id: id });
    return count > 0;
  }

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

  async findByDateAndPage(
    reportDate: Date,
    marketingEmployeeId: string,
    facebookPageId: string | null
  ): Promise<ReturnType<typeof mapToReport> | null> {
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    const filter: Record<string, unknown> = {
      reportDate: { $gte: startOfDay, $lte: endOfDay },
      marketingEmployeeId: new mongoose.Types.ObjectId(marketingEmployeeId),
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

export const marketingExpenseRepository = new MarketingExpenseRepository();

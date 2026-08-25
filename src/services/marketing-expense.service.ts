/**
 * ==================================================
 * MARKETING EXPENSE SERVICE
 * ==================================================
 *
 * Workflow Simplification Refactor (Aug 2026)
 *
 * Clean Architecture: Service layer cho MarketingExpenseReport.
 * Chứa business logic - được gọi bởi API Routes.
 *
 * Business rules mới:
 *   1. Mỗi ngày chỉ có 1 report cho mỗi marketingEmployeeId.
 *      facebookPageId = null → report toàn team.
 *   2. Không thể sửa report LOCKED.
 *      Chỉ DRAFT / REOPENED mới edit được.
 *   3. Chỉ DRAFT / REOPENED mới có thể LOCK.
 *   4. Chỉ LOCKED mới có thể REOPENED.
 *   5. Marketing tự LOCK khi hoàn thành báo cáo.
 *   6. Admin REOPEN khi có sai sót → Marketing sửa → LOCK lại.
 */

import mongoose from "mongoose";
import {
  marketingExpenseRepository,
  type CreateMarketingExpenseReportData,
  type UpdateMarketingExpenseReportData,
} from "@/repositories/marketing-expense.repository";
import { Lead } from "@/models/Lead";
import { MarketingExpenseReportStatus } from "@/constants/marketing-expense";
import {
  canMarketingExpenseDelete,
  canMarketingExpenseLock,
  canMarketingExpenseReopen,
  isMarketingExpenseEditable,
} from "@/configs/marketing-expense.config";
import { MarketingExpenseCalculator } from "@/utils/marketing-expense-calculator";
import type { IBudgetAllocation } from "@/models/MarketingExpenseReport";
import type {
  CreateMarketingExpenseInput,
  MarketingExpenseFilter,
  MarketingExpenseSummary,
  UpdateMarketingExpenseInput,
} from "@/types/marketing-expense";

/**
 * Sync totalLeads and closedLeads from the Lead collection for a given
 * MarketingExpenseReport document. This replaces manual entry with
 * authoritative data from the Lead collection.
 *
 * - totalLeads  = count of leads created on that day for the marketing employee.
 * - closedLeads = count of leads with status CLOSED or ORDER_CREATED.
 *
 * Returns the updated fields so callers can recompute derived metrics.
 */
async function syncLeadMetricsFromLeads(report: {
  reportDate: Date;
  marketingEmployeeId: mongoose.Types.ObjectId;
}): Promise<{ totalLeads: number; closedLeads: number }> {
  const dayStart = new Date(report.reportDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(report.reportDate);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const [summary] = await Lead.aggregate<{ totalLeads: number; closedLeads: number }>([
    {
      $match: {
        marketingEmployeeId: report.marketingEmployeeId,
        createdAt: { $gte: dayStart, $lte: dayEnd },
        isActive: true,
      },
    },
    {
      $group: {
        _id: null,
        totalLeads: { $sum: 1 },
        closedLeads: {
          $sum: {
            $cond: [
              { $in: ["$status", ["CLOSED", "ORDER_CREATED"]] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  return {
    totalLeads: summary?.totalLeads ?? 0,
    closedLeads: summary?.closedLeads ?? 0,
  };
}

/**
 * Recompute and persist all lead-derived metrics for a report after
 * totalLeads / closedLeads have been updated.
 */
async function refreshReportMetrics(reportId: string): Promise<void> {
  const report = await marketingExpenseRepository.findById(reportId);
  if (!report) return;

  const { totalLeads, closedLeads } = await syncLeadMetricsFromLeads({
    reportDate: report.reportDate,
    marketingEmployeeId: report.marketingEmployeeId,
  });

  const spentTotal =
    (report.spentBudget?.morning ?? 0) +
    (report.spentBudget?.afternoon ?? 0) +
    (report.spentBudget?.emergency ?? 0);

  const { remainingBudget, conversionRate, roas, cpa } =
    MarketingExpenseCalculator.calculateAll({
      requestedBudget: report.requestedBudget as IBudgetAllocation,
      spentBudget: report.spentBudget as IBudgetAllocation,
      totalRevenue: report.totalRevenue,
      totalLeads,
      closedLeads,
    });

  await marketingExpenseRepository.update(reportId, {
    totalLeads,
    closedLeads,
    remainingBudget,
    conversionRate,
    roas,
    cpa,
  });
}

// ============================================================================
// Result helpers
// ============================================================================

export interface MarketingExpenseOk<T> {
  success: true;
  data: T;
}

export interface MarketingExpenseErr {
  success: false;
  error: string;
}

export type MarketingExpenseResult<T> =
  | MarketingExpenseOk<T>
  | MarketingExpenseErr;

// ============================================================================
// Internal helpers
// ============================================================================

function normalizeBudget(input?: {
  morning?: number;
  afternoon?: number;
  emergency?: number;
} | null): IBudgetAllocation {
  return {
    morning: Math.max(0, input?.morning ?? 0),
    afternoon: Math.max(0, input?.afternoon ?? 0),
    emergency: Math.max(0, input?.emergency ?? 0),
  };
}

// ============================================================================
// Service
// ============================================================================

export class MarketingExpenseService {
  // --------------------------------------------------------------------------
  // CRUD
  // --------------------------------------------------------------------------

  /**
   * Create a new marketing expense report (DRAFT).
   *
   * Business rules:
   *   - Không tạo report trùng (reportDate, marketingEmployeeId, facebookPageId).
   */
  async create(
    input: CreateMarketingExpenseInput
  ): Promise<MarketingExpenseResult<unknown>> {
    const reportDate = new Date(input.reportDate);
    if (Number.isNaN(reportDate.getTime())) {
      return { success: false, error: "Ngày báo cáo không hợp lệ" };
    }

    const facebookPageId = input.facebookPageId
      ? new mongoose.Types.ObjectId(input.facebookPageId)
      : null;

    const existing = await marketingExpenseRepository.findByDateAndPage(
      reportDate,
      input.marketingEmployeeId,
      input.facebookPageId ?? null
    );

    if (existing) {
      return {
        success: false,
        error: facebookPageId
          ? "Đã tồn tại báo cáo cho ngày và Facebook page này"
          : "Đã tồn tại báo cáo toàn team cho ngày này",
      };
    }

    const requestedBudget = normalizeBudget(input.requestedBudget);
    const spentBudget = normalizeBudget(input.spentBudget);

    const totalRevenue = Math.max(0, input.totalRevenue ?? 0);

    // Auto-sync totalLeads / closedLeads from Lead collection (Source of Truth).
    const { totalLeads, closedLeads } = await syncLeadMetricsFromLeads({
      reportDate,
      marketingEmployeeId: new mongoose.Types.ObjectId(input.marketingEmployeeId),
    });

    const { remainingBudget, conversionRate, roas, cpa } =
      MarketingExpenseCalculator.calculateAll({
        requestedBudget,
        spentBudget,
        totalRevenue,
        totalLeads,
        closedLeads,
      });

    const data: CreateMarketingExpenseReportData = {
      reportDate,
      marketingEmployeeId: new mongoose.Types.ObjectId(
        input.marketingEmployeeId
      ),
      facebookPageId: input.facebookPageId
        ? new mongoose.Types.ObjectId(input.facebookPageId)
        : null,
      requestedBudget,
      spentBudget,
      remainingBudget,
      totalRevenue,
      totalLeads,
      closedLeads,
      conversionRate,
      roas,
      cpa,
      createdBy: new mongoose.Types.ObjectId(input.createdBy),
    };

    const report = await marketingExpenseRepository.create(data);
    return { success: true, data: report };
  }

  /**
   * Update an existing report.
   *
   * Business rules:
   *   - Chỉ sửa được khi status = DRAFT / REOPENED.
   */
  async update(
    id: string,
    input: UpdateMarketingExpenseInput
  ): Promise<MarketingExpenseResult<unknown>> {
    const existing = await marketingExpenseRepository.findById(id);
    if (!existing) {
      return { success: false, error: "Báo cáo không tồn tại" };
    }

    if (!isMarketingExpenseEditable(existing.status)) {
      return {
        success: false,
        error: `Không thể sửa báo cáo ở trạng thái ${existing.status}`,
      };
    }

    const data: UpdateMarketingExpenseReportData = {
      updatedBy: input.updatedBy
        ? new mongoose.Types.ObjectId(input.updatedBy)
        : undefined,
    };

    const budgetChanged =
      input.requestedBudget !== undefined || input.spentBudget !== undefined;

    if (budgetChanged) {
      data.requestedBudget = normalizeBudget(
        input.requestedBudget ?? existing.requestedBudget
      );
      data.spentBudget = normalizeBudget(
        input.spentBudget ?? existing.spentBudget
      );
    }

    if (input.note !== undefined) {
      data.note = (input.note ?? "").toString().slice(0, 2000);
    }

    // Always sync totalLeads / closedLeads from Lead collection (Source of Truth).
    // Manual input values are ignored — the Lead collection is authoritative.
    const { totalLeads, closedLeads } = await syncLeadMetricsFromLeads({
      reportDate: existing.reportDate,
      marketingEmployeeId: existing.marketingEmployeeId,
    });

    // Recalculate derived metrics whenever leads or budget change.
    const metrics = MarketingExpenseCalculator.calculateAll({
      requestedBudget: (budgetChanged ? data.requestedBudget : existing.requestedBudget) as IBudgetAllocation,
      spentBudget: (budgetChanged ? data.spentBudget : existing.spentBudget) as IBudgetAllocation,
      totalRevenue: existing.totalRevenue,
      totalLeads,
      closedLeads,
    });

    data.totalLeads = totalLeads;
    data.closedLeads = closedLeads;
    data.remainingBudget = metrics.remainingBudget;
    data.conversionRate = metrics.conversionRate;
    data.roas = metrics.roas;
    data.cpa = metrics.cpa;

    const updated = await marketingExpenseRepository.update(id, data);
    if (!updated) {
      return { success: false, error: "Không thể cập nhật báo cáo" };
    }
    return { success: true, data: updated };
  }

  /**
   * Soft delete a report.
   *
   * Business rules:
   *   - Chỉ xóa được khi status = DRAFT / REOPENED.
   *   - Set `isActive = false` (giữ document để audit).
   */
  async delete(id: string): Promise<MarketingExpenseResult<boolean>> {
    const existing = await marketingExpenseRepository.findById(id);
    if (!existing) {
      return { success: false, error: "Báo cáo không tồn tại" };
    }

    if (!canMarketingExpenseDelete(existing.status)) {
      return {
        success: false,
        error: `Không thể xóa báo cáo ở trạng thái ${existing.status}`,
      };
    }

    const ok = await marketingExpenseRepository.softDelete(id);
    if (!ok) {
      return { success: false, error: "Không thể xóa báo cáo" };
    }
    return { success: true, data: true };
  }

  async getById(id: string) {
    return marketingExpenseRepository.findByIdWithPopulate(id);
  }

  async getList(filter: MarketingExpenseFilter) {
    return marketingExpenseRepository.findAll(filter);
  }

  // --------------------------------------------------------------------------
  // Workflow (LOCK / REOPEN)
  // --------------------------------------------------------------------------

  /**
   * Lock report (DRAFT / REOPENED → LOCKED).
   * Marketing tự lock khi hoàn thành báo cáo ngày.
   */
  async lock(
    id: string,
    lockerId: string
  ): Promise<MarketingExpenseResult<unknown>> {
    const existing = await marketingExpenseRepository.findById(id);
    if (!existing) {
      return { success: false, error: "Báo cáo không tồn tại" };
    }

    if (!canMarketingExpenseLock(existing.status)) {
      return {
        success: false,
        error: `Không thể khóa báo cáo ở trạng thái ${existing.status}`,
      };
    }

    const updated = await marketingExpenseRepository.update(id, {
      status: MarketingExpenseReportStatus.LOCKED,
      lockedBy: new mongoose.Types.ObjectId(lockerId),
      lockedAt: new Date(),
    });
    if (!updated) {
      return { success: false, error: "Không thể khóa báo cáo" };
    }
    return { success: true, data: updated };
  }

  /**
   * Reopen report (LOCKED → REOPENED).
   * Admin mở lại khi có sai sót để Marketing sửa.
   */
  async reopen(
    id: string,
    employeeId: string
  ): Promise<MarketingExpenseResult<unknown>> {
    const existing = await marketingExpenseRepository.findById(id);
    if (!existing) {
      return { success: false, error: "Báo cáo không tồn tại" };
    }

    if (!canMarketingExpenseReopen(existing.status)) {
      return {
        success: false,
        error: `Không thể mở lại báo cáo ở trạng thái ${existing.status}`,
      };
    }

    const updated = await marketingExpenseRepository.update(id, {
      status: MarketingExpenseReportStatus.REOPENED,
      lockedBy: null,
      lockedAt: null,
      reopenedBy: new mongoose.Types.ObjectId(employeeId),
      reopenedAt: new Date(),
    });
    if (!updated) {
      return { success: false, error: "Không thể mở lại báo cáo" };
    }
    return { success: true, data: updated };
  }

  // --------------------------------------------------------------------------
  // Aggregations / calculations
  // --------------------------------------------------------------------------

  async getDashboardSummary(
    filter: MarketingExpenseFilter
  ): Promise<MarketingExpenseSummary> {
    const rows = await marketingExpenseRepository.aggregateDashboardRows(
      filter
    );
    return MarketingExpenseCalculator.aggregateMetrics(rows);
  }
}

// ============================================================================
// Singleton
// ============================================================================

export const marketingExpenseService = new MarketingExpenseService();

// ============================================================================
// Pure helpers — re-export từ Calculator
// ============================================================================

export const calculateROAS = MarketingExpenseCalculator.calculateROAS;
export const calculateCPA = MarketingExpenseCalculator.calculateCPA;
export const calculateConversionRate =
  MarketingExpenseCalculator.calculateConversionRate;
export const calculateRemainingBudget =
  MarketingExpenseCalculator.calculateRemainingBudget;

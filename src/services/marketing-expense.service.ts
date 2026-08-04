/**
 * ==================================================
 * MARKETING EXPENSE SERVICE
 * ==================================================
 *
 * Sprint 6.5 — Marketing Expense Domain
 *
 * Clean Architecture: Service layer cho MarketingExpenseReport.
 * Chứa business logic - được gọi bởi API Routes.
 *
 * Business rules:
 *   1. Mỗi (reportDate, facebookPageId) chỉ có 1 report duy nhất.
 *      facebookPageId = null → report toàn team.
 *   2. Không thể sửa report LOCKED / SUBMITTED / APPROVED.
 *      Chỉ DRAFT / REOPENED / REJECTED mới edit được.
 *   3. Chỉ SUBMITTED mới có thể APPROVED.
 *   4. Chỉ SUBMITTED mới có thể REJECTED.
 *   5. Chỉ APPROVED mới có thể LOCKED.
 *   6. Chỉ LOCKED mới có thể REOPENED.
 *   7. Tính toán (ROAS/CPA/ConversionRate/remainingBudget) dùng
 *      MarketingExpenseCalculator (pure functions, dùng chung).
 */

import mongoose from "mongoose";
import {
  marketingExpenseRepository,
  type CreateMarketingExpenseReportData,
  type UpdateMarketingExpenseReportData,
} from "@/repositories/marketing-expense.repository";
import { MarketingExpenseReportStatus } from "@/constants/marketing-expense";
import {
  canMarketingExpenseApprove,
  canMarketingExpenseDelete,
  canMarketingExpenseLock,
  canMarketingExpenseReject,
  canMarketingExpenseReopen,
  canMarketingExpenseSubmit,
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

function coerceFacebookPageId(
  value: string | null | undefined
): mongoose.Types.ObjectId | null {
  if (!value) return null;
  return new mongoose.Types.ObjectId(value);
}

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
   *   - Không tạo report trùng (reportDate, facebookPageId).
   */
  async create(
    input: CreateMarketingExpenseInput
  ): Promise<MarketingExpenseResult<unknown>> {
    const reportDate = new Date(input.reportDate);
    if (Number.isNaN(reportDate.getTime())) {
      return { success: false, error: "Ngày báo cáo không hợp lệ" };
    }

    const facebookPageId = coerceFacebookPageId(input.facebookPageId);

    const existing = await marketingExpenseRepository.findByDateAndPage(
      reportDate,
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
    const totalLeads = Math.max(0, input.totalLeads ?? 0);
    const closedLeads = Math.max(0, input.closedLeads ?? 0);

    const remainingBudget =
      MarketingExpenseCalculator.calculateRemainingBudget(
        requestedBudget,
        spentBudget
      );

    const conversionRate = MarketingExpenseCalculator.calculateConversionRate(
      totalLeads,
      closedLeads
    );
    const roas = MarketingExpenseCalculator.calculateROAS(
      totalRevenue,
      spentBudget
    );
    const cpa = MarketingExpenseCalculator.calculateCPA(
      spentBudget,
      closedLeads
    );

    const data: CreateMarketingExpenseReportData = {
      reportDate,
      marketingEmployeeId: new mongoose.Types.ObjectId(
        input.marketingEmployeeId
      ),
      facebookPageId,
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
   *   - Chỉ sửa được khi status = DRAFT / REOPENED / REJECTED.
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

    const data: UpdateMarketingExpenseReportData = {};

    if (input.marketingEmployeeId) {
      data.marketingEmployeeId = new mongoose.Types.ObjectId(
        input.marketingEmployeeId
      );
    }

    if (input.facebookPageId !== undefined) {
      data.facebookPageId = coerceFacebookPageId(input.facebookPageId);
    }

    const budgetChanged =
      input.requestedBudget !== undefined || input.spentBudget !== undefined;
    const metricsChanged =
      input.totalRevenue !== undefined ||
      input.totalLeads !== undefined ||
      input.closedLeads !== undefined;

    if (budgetChanged || metricsChanged) {
      const nextRequested = budgetChanged
        ? normalizeBudget(
            input.requestedBudget ?? existing.requestedBudget
          )
        : (existing.requestedBudget as IBudgetAllocation);

      const nextSpent = budgetChanged
        ? normalizeBudget(input.spentBudget ?? existing.spentBudget)
        : (existing.spentBudget as IBudgetAllocation);

      const nextRevenue =
        input.totalRevenue !== undefined
          ? input.totalRevenue
          : existing.totalRevenue;
      const nextLeads =
        input.totalLeads !== undefined ? input.totalLeads : existing.totalLeads;
      const nextClosed =
        input.closedLeads !== undefined
          ? input.closedLeads
          : existing.closedLeads;

      if (budgetChanged) {
        data.requestedBudget = nextRequested;
        data.spentBudget = nextSpent;
      }

      data.remainingBudget =
        MarketingExpenseCalculator.calculateRemainingBudget(
          nextRequested,
          nextSpent
        );

      data.totalRevenue = nextRevenue;
      data.totalLeads = nextLeads;
      data.closedLeads = nextClosed;
      data.conversionRate = MarketingExpenseCalculator.calculateConversionRate(
        nextLeads,
        nextClosed
      );
      data.roas = MarketingExpenseCalculator.calculateROAS(
        nextRevenue,
        nextSpent
      );
      data.cpa = MarketingExpenseCalculator.calculateCPA(
        nextSpent,
        nextClosed
      );
    }

    const updated = await marketingExpenseRepository.update(id, data);
    if (!updated) {
      return { success: false, error: "Không thể cập nhật báo cáo" };
    }
    return { success: true, data: updated };
  }

  /**
   * Delete a report (hard delete).
   *
   * Business rules:
   *   - Chỉ xóa được khi status = DRAFT / REOPENED / REJECTED.
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

    const ok = await marketingExpenseRepository.delete(id);
    if (!ok) {
      return { success: false, error: "Không thể xóa báo cáo" };
    }
    return { success: true, data: true };
  }

  /**
   * Get report by ID (with populated refs).
   */
  async getById(id: string) {
    return marketingExpenseRepository.findByIdWithPopulate(id);
  }

  /**
   * Get list of reports with pagination & filters.
   */
  async getList(filter: MarketingExpenseFilter) {
    return marketingExpenseRepository.findAll(filter);
  }

  // --------------------------------------------------------------------------
  // Workflow
  // --------------------------------------------------------------------------

  /**
   * Submit report (DRAFT / REOPENED / REJECTED → SUBMITTED).
   *
   * Khi submit lại từ REJECTED → clear rejection metadata.
   */
  async submit(
    id: string,
    _employeeId: string
  ): Promise<MarketingExpenseResult<unknown>> {
    const existing = await marketingExpenseRepository.findById(id);
    if (!existing) {
      return { success: false, error: "Báo cáo không tồn tại" };
    }

    if (!canMarketingExpenseSubmit(existing.status)) {
      return {
        success: false,
        error: `Không thể nộp báo cáo ở trạng thái ${existing.status}`,
      };
    }

    const updated = await marketingExpenseRepository.update(id, {
      status: MarketingExpenseReportStatus.SUBMITTED,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: "",
    });
    if (!updated) {
      return { success: false, error: "Không thể nộp báo cáo" };
    }
    return { success: true, data: updated };
  }

  /**
   * Approve report (SUBMITTED → APPROVED).
   *
   * Business rules:
   *   - Không approve report chưa SUBMITTED.
   */
  async approve(
    id: string,
    approverId: string
  ): Promise<MarketingExpenseResult<unknown>> {
    const existing = await marketingExpenseRepository.findById(id);
    if (!existing) {
      return { success: false, error: "Báo cáo không tồn tại" };
    }

    if (!canMarketingExpenseApprove(existing.status)) {
      return {
        success: false,
        error: "Không thể duyệt báo cáo chưa được nộp",
      };
    }

    const updated = await marketingExpenseRepository.update(id, {
      status: MarketingExpenseReportStatus.APPROVED,
      approvedBy: new mongoose.Types.ObjectId(approverId),
      approvedAt: new Date(),
    });
    if (!updated) {
      return { success: false, error: "Không thể duyệt báo cáo" };
    }
    return { success: true, data: updated };
  }

  /**
   * Reject report (SUBMITTED → REJECTED).
   *
   * Leader từ chối — nhân viên cần sửa và submit lại.
   * `rejectionReason` là bắt buộc.
   */
  async reject(
    id: string,
    rejecterId: string,
    rejectionReason: string
  ): Promise<MarketingExpenseResult<unknown>> {
    const existing = await marketingExpenseRepository.findById(id);
    if (!existing) {
      return { success: false, error: "Báo cáo không tồn tại" };
    }

    if (!canMarketingExpenseReject(existing.status)) {
      return {
        success: false,
        error: `Không thể từ chối báo cáo ở trạng thái ${existing.status}`,
      };
    }

    const trimmedReason = (rejectionReason ?? "").trim();
    if (!trimmedReason) {
      return {
        success: false,
        error: "Lý do từ chối là bắt buộc",
      };
    }

    const updated = await marketingExpenseRepository.update(id, {
      status: MarketingExpenseReportStatus.REJECTED,
      rejectedBy: new mongoose.Types.ObjectId(rejecterId),
      rejectedAt: new Date(),
      rejectionReason: trimmedReason,
    });
    if (!updated) {
      return { success: false, error: "Không thể từ chối báo cáo" };
    }
    return { success: true, data: updated };
  }

  /**
   * Lock report (APPROVED → LOCKED).
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
   */
  async reopen(
    id: string,
    _employeeId: string
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
    });
    if (!updated) {
      return { success: false, error: "Không thể mở lại báo cáo" };
    }
    return { success: true, data: updated };
  }

  // --------------------------------------------------------------------------
  // Aggregations / calculations
  // --------------------------------------------------------------------------

  /**
   * Dashboard summary — orchestration: chỉ lấy, không tính.
   *
   * Flow:
   *   1. Repository chiếu raw rows từ MongoDB → `aggregateDashboardRows(filter)`
   *   2. Calculator nhận rows → `aggregateMetrics(rows)` → `MarketingExpenseSummary`
   *
   * Sau này sẽ có thêm:
   *   - getMonthlySummary()
   *   - getYearSummary()
   *   - getEmployeeSummary()
   *   - getPageSummary()
   *   - getCampaignSummary()
   */
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
// Pure helpers — re-export từ Calculator (cho code ở UI / Report / Export Excel)
// ============================================================================

export const calculateROAS = MarketingExpenseCalculator.calculateROAS;
export const calculateCPA = MarketingExpenseCalculator.calculateCPA;
export const calculateConversionRate =
  MarketingExpenseCalculator.calculateConversionRate;
export const calculateRemainingBudget =
  MarketingExpenseCalculator.calculateRemainingBudget;

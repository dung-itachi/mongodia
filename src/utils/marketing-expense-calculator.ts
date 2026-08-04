/**
 * ==================================================
 * MARKETING EXPENSE CALCULATOR
 * ==================================================
 *
 * Sprint 6.5 — Marketing Expense Domain
 *
 * Pure calculation helpers cho MarketingExpenseReport.
 *
 * Dùng chung cho:
 *   - Dashboard
 *   - Report
 *   - Export Excel
 *   - Service (create/update)
 *
 * KHÔNG phụ thuộc Mongoose / Mongo / Request / Response.
 * Chỉ là pure functions — test được, không side-effect.
 */

import type { IBudgetAllocation } from "@/models/MarketingExpenseReport";
import type { BudgetAllocation, MarketingExpenseSummary } from "@/types/marketing-expense";

// ============================================================================
// Constants
// ============================================================================

export const ZERO_BUDGET: IBudgetAllocation = {
  morning: 0,
  afternoon: 0,
  emergency: 0,
};

// ============================================================================
// Helpers
// ============================================================================

function toBudget(input?: BudgetAllocation | null): IBudgetAllocation {
  if (!input) return { ...ZERO_BUDGET };
  return {
    morning: Math.max(0, input.morning ?? 0),
    afternoon: Math.max(0, input.afternoon ?? 0),
    emergency: Math.max(0, input.emergency ?? 0),
  };
}

// ============================================================================
// Calculator
// ============================================================================

export class MarketingExpenseCalculator {
  // --------------------------------------------------------------------------
  // Budget
  // --------------------------------------------------------------------------

  /**
   * Sum 3 slot của budget.
   */
  static sumBudget(budget: IBudgetAllocation): number {
    return budget.morning + budget.afternoon + budget.emergency;
  }

  /**
   * remainingBudget = requestedBudget - spentBudget (per slot, clamp ≥ 0).
   */
  static calculateRemainingBudget(
    requested: IBudgetAllocation,
    spent: IBudgetAllocation
  ): IBudgetAllocation {
    return {
      morning: Math.max(0, requested.morning - spent.morning),
      afternoon: Math.max(0, requested.afternoon - spent.afternoon),
      emergency: Math.max(0, requested.emergency - spent.emergency),
    };
  }

  // --------------------------------------------------------------------------
  // Performance metrics
  // --------------------------------------------------------------------------

  /**
   * conversionRate = closedLeads / totalLeads (clamp 0..1).
   * Trả về 0 nếu totalLeads = 0.
   */
  static calculateConversionRate(
    totalLeads: number,
    closedLeads: number
  ): number {
    if (totalLeads <= 0) return 0;
    const ratio = closedLeads / totalLeads;
    return Math.max(0, Math.min(1, ratio));
  }

  /**
   * ROAS = totalRevenue / spentBudget.
   * Trả về 0 nếu spent = 0.
   */
  static calculateROAS(
    totalRevenue: number,
    spentBudget: IBudgetAllocation
  ): number {
    const totalSpent = MarketingExpenseCalculator.sumBudget(spentBudget);
    if (totalSpent <= 0) return 0;
    return totalRevenue / totalSpent;
  }

  /**
   * CPA = spentBudget / closedLeads.
   * Trả về 0 nếu closedLeads = 0.
   */
  static calculateCPA(
    spentBudget: IBudgetAllocation,
    closedLeads: number
  ): number {
    if (closedLeads <= 0) return 0;
    return MarketingExpenseCalculator.sumBudget(spentBudget) / closedLeads;
  }

  // --------------------------------------------------------------------------
  // Bundle (apply lên 1 report)
  // --------------------------------------------------------------------------

  /**
   * Tính toàn bộ metric từ raw inputs.
   * Trả về `{ remainingBudget, conversionRate, roas, cpa }`.
   */
  static calculateAll(input: {
    requestedBudget: BudgetAllocation | null | undefined;
    spentBudget: BudgetAllocation | null | undefined;
    totalRevenue: number;
    totalLeads: number;
    closedLeads: number;
  }) {
    const requested = toBudget(input.requestedBudget);
    const spent = toBudget(input.spentBudget);

    return {
      remainingBudget: MarketingExpenseCalculator.calculateRemainingBudget(
        requested,
        spent
      ),
      conversionRate: MarketingExpenseCalculator.calculateConversionRate(
        input.totalLeads,
        input.closedLeads
      ),
      roas: MarketingExpenseCalculator.calculateROAS(
        input.totalRevenue,
        spent
      ),
      cpa: MarketingExpenseCalculator.calculateCPA(spent, input.closedLeads),
    };
  }

  /**
   * Tổng hợp metrics từ 1 list row (dùng cho dashboard, report, export Excel).
   *
   * Calculator không truy cập DB — chỉ nhận `rows[]` đã query sẵn rồi tính.
   * Nếu caller muốn tính trực tiếp từ MongoDB → dùng
   * `repository.aggregateDashboardSummary(filter)` rồi pass kết quả vào đây.
   *
   * Service orchestration: `service.getDashboardSummary(filter)`
   *   → repository.aggregateDashboardSummary(filter)
   *   → calculator.aggregateMetrics(rows)
   */
  static aggregateMetrics(rows: Array<{
    requestedBudget: IBudgetAllocation;
    spentBudget: IBudgetAllocation;
    remainingBudget?: IBudgetAllocation;
    totalRevenue: number;
    totalLeads: number;
    closedLeads: number;
    conversionRate: number;
    roas: number;
    cpa: number;
  }>): MarketingExpenseSummary {
    if (rows.length === 0) {
      return {
        totalReports: 0,
        totalRequestedBudget: 0,
        totalSpentBudget: 0,
        totalRemainingBudget: 0,
        totalRevenue: 0,
        totalLeads: 0,
        totalClosedLeads: 0,
        averageConversionRate: 0,
        averageRoas: 0,
        averageCpa: 0,
      };
    }

    let totalRequestedBudget = 0;
    let totalSpentBudget = 0;
    let totalRemainingBudget = 0;
    let totalRevenue = 0;
    let totalLeads = 0;
    let totalClosedLeads = 0;
    let sumConversionRate = 0;
    let sumRoas = 0;
    let sumCpa = 0;

    for (const row of rows) {
      totalRequestedBudget += MarketingExpenseCalculator.sumBudget(
        row.requestedBudget
      );
      totalSpentBudget += MarketingExpenseCalculator.sumBudget(row.spentBudget);
      const remaining =
        row.remainingBudget ??
        MarketingExpenseCalculator.calculateRemainingBudget(
          row.requestedBudget,
          row.spentBudget
        );
      totalRemainingBudget += MarketingExpenseCalculator.sumBudget(remaining);
      totalRevenue += row.totalRevenue;
      totalLeads += row.totalLeads;
      totalClosedLeads += row.closedLeads;
      sumConversionRate += row.conversionRate;
      sumRoas += row.roas;
      sumCpa += row.cpa;
    }

    const totalReports = rows.length;

    return {
      totalReports,
      totalRequestedBudget,
      totalSpentBudget,
      totalRemainingBudget,
      totalRevenue,
      totalLeads,
      totalClosedLeads,
      averageConversionRate: sumConversionRate / totalReports,
      averageRoas: sumRoas / totalReports,
      averageCpa: sumCpa / totalReports,
    };
  }
}

// ============================================================================
// Singleton export (cho code dùng nhanh)
// ============================================================================

export const marketingExpenseCalculator = new MarketingExpenseCalculator();

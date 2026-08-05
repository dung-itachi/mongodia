/**
 * ==================================================
 * MARKETING EXPENSE CALCULATOR
 * ==================================================
 *
 * Sprint 6.10 — Marketing Expense UI Improvements
 *
 * Helper functions tính toán budget cho MarketingExpenseReport.
 *
 * Dùng chung cho:
 *   - Dashboard
 *   - Export Excel
 *   - Table
 *   - Detail View
 */

import type { BudgetAllocation } from "@/types/marketing-expense";

// ============================================================================
// Budget Allocation Calculator
// ============================================================================

/**
 * Tính tổng budget từ 3 ca (Morning + Afternoon + Emergency).
 */
export function sumBudgetAllocation(
  budget: BudgetAllocation | undefined | null
): number {
  if (!budget) return 0;
  return (
    (budget.morning ?? 0) +
    (budget.afternoon ?? 0) +
    (budget.emergency ?? 0)
  );
}

/**
 * Tính remaining budget = approvedBudget - spentBudget.
 */
export function calculateRemainingBudget(
  approvedBudget: BudgetAllocation | undefined | null,
  spentBudget: BudgetAllocation | undefined | null
): number {
  return sumBudgetAllocation(approvedBudget) - sumBudgetAllocation(spentBudget);
}

// ============================================================================
// Record-level Calculator
// ============================================================================

export interface BudgetSummary {
  requested: number;
  approved: number;
  spent: number;
  remaining: number;
}

/**
 * Tính budget summary từ một record.
 */
export function calculateBudgetSummary(
  record: {
    requestedBudget?: BudgetAllocation | undefined | null;
    approvedBudget?: BudgetAllocation | undefined | null;
    spentBudget?: BudgetAllocation | undefined | null;
  }
): BudgetSummary {
  const requested = sumBudgetAllocation(record.requestedBudget);
  const approved = sumBudgetAllocation(record.approvedBudget) || requested;
  const spent = sumBudgetAllocation(record.spentBudget);
  const remaining = approved - spent;

  return { requested, approved, spent, remaining };
}

// ============================================================================
// List-level Calculator (Dashboard, Export)
// ============================================================================

export interface ListBudgetSummary extends BudgetSummary {
  recordCount: number;
}

/**
 * Tính budget summary cho một danh sách records.
 * Dùng cho Dashboard hoặc Export Excel.
 */
export function calculateListBudgetSummary(
  records: Array<{
    requestedBudget?: BudgetAllocation | undefined | null;
    approvedBudget?: BudgetAllocation | undefined | null;
    spentBudget?: BudgetAllocation | undefined | null;
  }>
): ListBudgetSummary {
  let requested = 0;
  let approved = 0;
  let spent = 0;

  for (const record of records) {
    requested += sumBudgetAllocation(record.requestedBudget);
    approved += sumBudgetAllocation(record.approvedBudget) ||
                sumBudgetAllocation(record.requestedBudget);
    spent += sumBudgetAllocation(record.spentBudget);
  }

  return {
    recordCount: records.length,
    requested,
    approved,
    spent,
    remaining: approved - spent,
  };
}

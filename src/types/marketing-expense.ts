/**
 * ==================================================
 * MARKETING EXPENSE DOMAIN TYPES
 * ==================================================
 *
 * Sprint 6.5 — Marketing Expense Domain
 *
 * Clean Architecture: Domain types cho MarketingExpenseReport.
 *
 * Các type này là view-model dùng cho tầng UI/API.
 * Tất cả ObjectId ở DB được convert sang string khi đưa ra ngoài.
 */

import type { MarketingExpenseReportStatus } from "@/constants/marketing-expense";

// ============================================================================
// Budget allocation (sub-document)
// ============================================================================

export interface BudgetAllocation {
  morning: number;
  afternoon: number;
  emergency: number;
}

// ============================================================================
// MarketingExpense — entity view-model
// ============================================================================

export interface MarketingExpense {
  _id: string;

  reportDate: string;

  marketingEmployeeId: string;
  marketingEmployee?: {
    _id: string;
    employeeCode: string;
    fullName: string;
  };

  facebookPageId?: string | null;
  facebookPage?: {
    _id: string;
    code: string;
    name: string;
  } | null;

  requestedBudget: BudgetAllocation;
  spentBudget: BudgetAllocation;
  remainingBudget: BudgetAllocation;

  totalRevenue: number;
  totalLeads: number;
  closedLeads: number;
  conversionRate: number;
  roas: number;
  cpa: number;

  status: MarketingExpenseReportStatus;
  statusLabel: string;
  statusColor: string;

  createdBy: string;
  approvedBy?: string | null;
  lockedBy?: string | null;
  rejectedBy?: string | null;
  approvedAt?: string | null;
  lockedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// MarketingExpenseSummary — aggregated stats (dashboard, list footer)
// ============================================================================

export interface MarketingExpenseSummary {
  totalReports: number;
  totalRequestedBudget: number;
  totalSpentBudget: number;
  totalRemainingBudget: number;
  totalRevenue: number;
  totalLeads: number;
  totalClosedLeads: number;
  averageConversionRate: number;
  averageRoas: number;
  averageCpa: number;
}

// ============================================================================
// MarketingExpenseFilter — search / list params
// ============================================================================

export interface MarketingExpenseFilter {
  keyword?: string;
  status?: MarketingExpenseReportStatus;
  marketingEmployeeId?: string;
  facebookPageId?: string;
  /** Lọc theo reportDate trong khoảng [dateFrom, dateTo]. */
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

// ============================================================================
// List response
// ============================================================================

export interface MarketingExpenseListResponse {
  items: MarketingExpense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// Create input
// ============================================================================

export interface CreateMarketingExpenseInput {
  reportDate: string;
  marketingEmployeeId: string;
  facebookPageId?: string | null;
  requestedBudget: BudgetAllocation;
  spentBudget?: BudgetAllocation;
  totalRevenue?: number;
  totalLeads?: number;
  closedLeads?: number;
  createdBy: string;
}

// ============================================================================
// Update input
// ============================================================================

export interface UpdateMarketingExpenseInput {
  marketingEmployeeId?: string;
  facebookPageId?: string | null;
  requestedBudget?: BudgetAllocation;
  spentBudget?: BudgetAllocation;
  totalRevenue?: number;
  totalLeads?: number;
  closedLeads?: number;
}

// ============================================================================
// Workflow transition inputs
// ============================================================================

export interface SubmitMarketingExpenseInput {
  reportId: string;
  employeeId: string;
  note?: string;
}

export interface ApproveMarketingExpenseInput {
  reportId: string;
  approverId: string;
  note?: string;
}

export interface LockMarketingExpenseInput {
  reportId: string;
  lockerId: string;
  note?: string;
}

export interface ReopenMarketingExpenseInput {
  reportId: string;
  employeeId: string;
  note?: string;
}

export interface RejectMarketingExpenseInput {
  reportId: string;
  rejecterId: string;
  rejectionReason: string;
}

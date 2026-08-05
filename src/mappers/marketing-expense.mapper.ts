/**
 * ==================================================
 * MARKETING EXPENSE MAPPER
 * ==================================================
 *
 * Workflow Simplification Refactor (Aug 2026)
 *
 * Map raw Mongoose document (lean + populated) → API response shape.
 */

import type { IMarketingExpenseReport } from "@/models/MarketingExpenseReport";
import {
  MarketingExpenseReportStatus,
  MARKETING_EXPENSE_STATUS_LABELS,
  MARKETING_EXPENSE_STATUS_COLORS,
} from "@/constants/marketing-expense";
import type {
  BudgetAllocation,
  MarketingExpense,
} from "@/types/marketing-expense";

// ============================================================================
// Response types
// ============================================================================

export interface EmployeeRef {
  _id: string;
  employeeCode: string;
  fullName: string;
}

export interface FacebookPageRef {
  _id: string;
  code: string;
  name: string;
}

export interface MarketingExpenseResponse {
  _id: string;
  reportDate: string;

  marketingEmployeeId: string;
  marketingEmployee?: EmployeeRef;

  facebookPageId?: string | null;
  facebookPage?: FacebookPageRef | null;

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
  createdByEmployee?: EmployeeRef;
  lockedBy?: string | null;
  lockedByEmployee?: EmployeeRef | null;
  lockedAt?: string | null;
  reopenedBy?: string | null;
  reopenedByEmployee?: EmployeeRef | null;
  reopenedAt?: string | null;

  note: string;
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Helpers
// ============================================================================

function mapEmployeeRef(raw: unknown): EmployeeRef | undefined {
  if (!raw) return undefined;
  const r = raw as { _id?: unknown; employeeCode?: unknown; fullName?: unknown };
  if (!r._id) return undefined;
  return {
    _id: r._id.toString(),
    employeeCode: (r.employeeCode ?? "").toString(),
    fullName: (r.fullName ?? "").toString(),
  };
}

function mapFacebookPageRef(raw: unknown): FacebookPageRef | null {
  if (!raw) return null;
  const r = raw as { _id?: unknown; code?: unknown; name?: unknown };
  if (!r._id) return null;
  return {
    _id: r._id.toString(),
    code: (r.code ?? "").toString(),
    name: (r.name ?? "").toString(),
  };
}

// ============================================================================
// Mappers
// ============================================================================

export function mapMarketingExpense(
  doc: IMarketingExpenseReport
): MarketingExpenseResponse {
  const status = (doc.status ?? "DRAFT") as MarketingExpenseReportStatus;

  return {
    _id: doc._id.toString(),
    reportDate: doc.reportDate.toISOString(),

    marketingEmployeeId: doc.marketingEmployeeId.toString(),
    marketingEmployee: mapEmployeeRef(
      (doc as unknown as { marketingEmployeeId?: unknown }).marketingEmployeeId
    ),

    facebookPageId: doc.facebookPageId
      ? doc.facebookPageId.toString()
      : null,
    facebookPage: mapFacebookPageRef(
      (doc as unknown as { facebookPageId?: unknown }).facebookPageId
    ),

    requestedBudget: doc.requestedBudget,
    spentBudget: doc.spentBudget,
    remainingBudget: doc.remainingBudget,

    totalRevenue: doc.totalRevenue,
    totalLeads: doc.totalLeads,
    closedLeads: doc.closedLeads,
    conversionRate: doc.conversionRate,
    roas: doc.roas,
    cpa: doc.cpa,

    status,
    statusLabel:
      MARKETING_EXPENSE_STATUS_LABELS[status] ?? doc.status,
    statusColor:
      MARKETING_EXPENSE_STATUS_COLORS[status] ?? "default",

    createdBy: doc.createdBy.toString(),
    createdByEmployee: mapEmployeeRef(
      (doc as unknown as { createdBy?: unknown }).createdBy
    ),
    lockedBy: doc.lockedBy ? doc.lockedBy.toString() : null,
    lockedByEmployee: mapEmployeeRef(
      (doc as unknown as { lockedBy?: unknown }).lockedBy
    ),
    lockedAt: doc.lockedAt ? doc.lockedAt.toISOString() : null,
    reopenedBy: doc.reopenedBy ? doc.reopenedBy.toString() : null,
    reopenedByEmployee: mapEmployeeRef(
      (doc as unknown as { reopenedBy?: unknown }).reopenedBy
    ),
    reopenedAt: doc.reopenedAt ? doc.reopenedAt.toISOString() : null,

    note: doc.note ?? "",
    isActive: doc.isActive ?? true,

    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function mapMarketingExpenseList(
  docs: IMarketingExpenseReport[]
): MarketingExpenseResponse[] {
  return docs.map(mapMarketingExpense);
}

export function mapMarketingExpenseFromDto(
  dto: MarketingExpense
): MarketingExpenseResponse {
  const status = (dto.status ?? "DRAFT") as MarketingExpenseReportStatus;

  return {
    _id: dto._id,
    reportDate: dto.reportDate,

    marketingEmployeeId: dto.marketingEmployeeId,
    marketingEmployee: dto.marketingEmployee
      ? {
          _id: dto.marketingEmployee._id,
          employeeCode: dto.marketingEmployee.employeeCode,
          fullName: dto.marketingEmployee.fullName,
        }
      : undefined,

    facebookPageId: dto.facebookPageId ?? null,
    facebookPage: dto.facebookPage
      ? {
          _id: dto.facebookPage._id,
          code: dto.facebookPage.code,
          name: dto.facebookPage.name,
        }
      : null,

    requestedBudget: dto.requestedBudget,
    spentBudget: dto.spentBudget,
    remainingBudget: dto.remainingBudget,

    totalRevenue: dto.totalRevenue,
    totalLeads: dto.totalLeads,
    closedLeads: dto.closedLeads,
    conversionRate: dto.conversionRate,
    roas: dto.roas,
    cpa: dto.cpa,

    status,
    statusLabel: MARKETING_EXPENSE_STATUS_LABELS[status] ?? dto.status,
    statusColor: MARKETING_EXPENSE_STATUS_COLORS[status] ?? "default",

    createdBy: dto.createdBy,
    lockedBy: dto.lockedBy ?? null,
    lockedAt: dto.lockedAt ?? null,
    reopenedBy: dto.reopenedBy ?? null,
    reopenedAt: dto.reopenedAt ?? null,

    note: dto.note ?? "",
    isActive: dto.isActive ?? true,

    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/**
 * ==================================================
 * MARKETING EXPENSE MAPPER
 * ==================================================
 *
 * Sprint 6.7 — Marketing Expense CRUD (Backend)
 *
 * Map raw Mongoose document (lean + populated) → API response shape.
 *
 * Conventions:
 *   - `mapMarketingExpense()`      : single → response
 *   - `mapMarketingExpenseList()`  : array  → response[]
 *   - All ObjectIds converted sang string.
 *   - Populated nested objects được gom lại thành `{ _id, employeeCode, fullName }`
 *     / `{ _id, code, name }`.
 *   - Status có thêm `statusLabel` / `statusColor` để FE đỡ phải lookup lại.
 *
 * KHÔNG truy cập DB. Chỉ transform data.
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

/**
 * Audit fields của report — phục vụ cho UI "Ai duyệt / khóa / từ chối".
 */
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
  approvedBy?: string | null;
  approvedByEmployee?: EmployeeRef | null;
  lockedBy?: string | null;
  lockedByEmployee?: EmployeeRef | null;
  rejectedBy?: string | null;
  rejectedByEmployee?: EmployeeRef | null;
  approvedAt?: string | null;
  lockedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;

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

/**
 * Map raw lean document → response DTO.
 *
 * Accept cả populated lẫn không-populated document — các field populate
 * sẽ tự skip nếu không có.
 */
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
    approvedBy: doc.approvedBy ? doc.approvedBy.toString() : null,
    approvedByEmployee: mapEmployeeRef(
      (doc as unknown as { approvedBy?: unknown }).approvedBy
    ),
    lockedBy: doc.lockedBy ? doc.lockedBy.toString() : null,
    lockedByEmployee: mapEmployeeRef(
      (doc as unknown as { lockedBy?: unknown }).lockedBy
    ),
    rejectedBy: doc.rejectedBy ? doc.rejectedBy.toString() : null,
    rejectedByEmployee: mapEmployeeRef(
      (doc as unknown as { rejectedBy?: unknown }).rejectedBy
    ),
    approvedAt: doc.approvedAt ? doc.approvedAt.toISOString() : null,
    lockedAt: doc.lockedAt ? doc.lockedAt.toISOString() : null,
    rejectedAt: doc.rejectedAt ? doc.rejectedAt.toISOString() : null,
    rejectionReason: doc.rejectionReason ?? "",

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

/**
 * Adapter: convert từ `MarketingExpense` (Service-level DTO) → response.
 *
 * Service trả về DTO đã-stringified (xem `marketing-expense.repository.ts#mapToReport`).
 * Mapper này chỉ enrich thêm `statusLabel` / `statusColor`.
 */
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
    approvedBy: dto.approvedBy ?? null,
    lockedBy: dto.lockedBy ?? null,
    rejectedBy: dto.rejectedBy ?? null,
    approvedAt: dto.approvedAt ?? null,
    lockedAt: dto.lockedAt ?? null,
    rejectedAt: dto.rejectedAt ?? null,
    rejectionReason: dto.rejectionReason ?? "",

    note: dto.note ?? "",
    isActive: dto.isActive ?? true,

    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
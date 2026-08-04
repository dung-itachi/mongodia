/**
 * ==================================================
 * MARKETING EXPENSE REPORT CONFIG
 * ==================================================
 *
 * Sprint 6.5 — Marketing Expense Domain
 *
 * Centralised config cho MarketingExpenseReport:
 * - Status labels, colors, icons
 * - Editability rules (workflow)
 * - Helper functions
 *
 * Workflow:
 *
 *   DRAFT  ──►  SUBMITTED  ──►  APPROVED  ──►  LOCKED
 *     ▲            │
 *     │            ▼
 *     │         REJECTED  ──►  DRAFT  (sửa + nộp lại)
 *     │
 *  REOPENED  ◄──  LOCKED  (mở lại để audit/điều chỉnh)
 */

import {
  MarketingExpenseReportStatus,
  MARKETING_EXPENSE_STATUS_LABELS,
  MARKETING_EXPENSE_STATUS_COLORS,
  MARKETING_EXPENSE_STATUS_ICONS,
} from "@/constants/marketing-expense";

// ============================================================================
// Status labels / colors / icons re-export
// ============================================================================

export {
  MARKETING_EXPENSE_STATUS_LABELS,
  MARKETING_EXPENSE_STATUS_COLORS,
  MARKETING_EXPENSE_STATUS_ICONS,
};

// ============================================================================
// Helper: Get label by status
// ============================================================================

export function getMarketingExpenseStatusLabel(
  status: MarketingExpenseReportStatus | string
): string {
  return (
    MARKETING_EXPENSE_STATUS_LABELS[
      status as MarketingExpenseReportStatus
    ] ?? status
  );
}

// ============================================================================
// Helper: Get color by status
// ============================================================================

export function getMarketingExpenseStatusColor(
  status: MarketingExpenseReportStatus | string
): string {
  return (
    MARKETING_EXPENSE_STATUS_COLORS[
      status as MarketingExpenseReportStatus
    ] ?? "default"
  );
}

// ============================================================================
// Helper: Get icon by status
// ============================================================================

export function getMarketingExpenseStatusIcon(
  status: MarketingExpenseReportStatus | string
): string {
  return (
    MARKETING_EXPENSE_STATUS_ICONS[
      status as MarketingExpenseReportStatus
    ] ?? "FileTextOutlined"
  );
}

// ============================================================================
// Workflow rules
// ============================================================================

/**
 * Status có thể edit được không.
 *   DRAFT  → được sửa
 *   REOPENED → được sửa (mở lại từ LOCKED)
 *   REJECTED → được sửa (leader từ chối → nhân viên sửa rồi submit lại)
 *   SUBMITTED / APPROVED / LOCKED → KHÔNG được sửa trực tiếp
 */
export function isMarketingExpenseEditable(
  status: MarketingExpenseReportStatus | string
): boolean {
  return (
    status === MarketingExpenseReportStatus.DRAFT ||
    status === MarketingExpenseReportStatus.REOPENED ||
    status === MarketingExpenseReportStatus.REJECTED
  );
}

/**
 * Có thể SUBMIT (nộp) báo cáo không.
 *   DRAFT / REOPENED / REJECTED → có thể submit.
 */
export function canMarketingExpenseSubmit(
  status: MarketingExpenseReportStatus | string
): boolean {
  return (
    status === MarketingExpenseReportStatus.DRAFT ||
    status === MarketingExpenseReportStatus.REOPENED ||
    status === MarketingExpenseReportStatus.REJECTED
  );
}

/**
 * Có thể APPROVE (duyệt) báo cáo không.
 *   Chỉ SUBMITTED mới có thể approve.
 */
export function canMarketingExpenseApprove(
  status: MarketingExpenseReportStatus | string
): boolean {
  return status === MarketingExpenseReportStatus.SUBMITTED;
}

/**
 * Có thể REJECT (từ chối) báo cáo không.
 *   Chỉ SUBMITTED mới có thể bị reject.
 *   Sau khi reject, status → REJECTED. Nhân viên sửa và submit lại.
 */
export function canMarketingExpenseReject(
  status: MarketingExpenseReportStatus | string
): boolean {
  return status === MarketingExpenseReportStatus.SUBMITTED;
}

/**
 * Có thể LOCK (khóa) báo cáo không.
 *   Chỉ APPROVED mới có thể LOCK.
 */
export function canMarketingExpenseLock(
  status: MarketingExpenseReportStatus | string
): boolean {
  return status === MarketingExpenseReportStatus.APPROVED;
}

/**
 * Có thể REOPEN (mở lại) báo cáo không.
 *   Chỉ LOCKED mới có thể REOPEN.
 *   Sau khi REOPEN, status chuyển về REOPENED để có thể sửa.
 */
export function canMarketingExpenseReopen(
  status: MarketingExpenseReportStatus | string
): boolean {
  return status === MarketingExpenseReportStatus.LOCKED;
}

/**
 * Có thể DELETE báo cáo không.
 *   Chỉ DRAFT / REOPENED / REJECTED mới được xóa.
 *   SUBMITTED / APPROVED / LOCKED → KHÔNG được xóa.
 */
export function canMarketingExpenseDelete(
  status: MarketingExpenseReportStatus | string
): boolean {
  return (
    status === MarketingExpenseReportStatus.DRAFT ||
    status === MarketingExpenseReportStatus.REOPENED ||
    status === MarketingExpenseReportStatus.REJECTED
  );
}

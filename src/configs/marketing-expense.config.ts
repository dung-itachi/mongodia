/**
 * ==================================================
 * MARKETING EXPENSE REPORT CONFIG
 * ==================================================
 *
 * Workflow Simplification Refactor (Aug 2026)
 *
 * Centralised config cho MarketingExpenseReport:
 * - Status labels, colors, icons
 * - Editability rules (workflow)
 * - Helper functions
 *
 * Workflow mới:
 *
 *   DRAFT  ──►  LOCKED
 *     ▲          │
 *     │          ▼
 *  REOPENED ◄───┘  (Admin mở lại để sửa)
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
 *   LOCKED → KHÔNG được sửa
 */
export function isMarketingExpenseEditable(
  status: MarketingExpenseReportStatus | string
): boolean {
  return (
    status === MarketingExpenseReportStatus.DRAFT ||
    status === MarketingExpenseReportStatus.REOPENED
  );
}

/**
 * Có thể LOCK (khóa) báo cáo không.
 *   DRAFT / REOPENED → có thể lock.
 */
export function canMarketingExpenseLock(
  status: MarketingExpenseReportStatus | string
): boolean {
  return (
    status === MarketingExpenseReportStatus.DRAFT ||
    status === MarketingExpenseReportStatus.REOPENED
  );
}

/**
 * Có thể REOPEN (mở lại) báo cáo không.
 *   Chỉ LOCKED mới có thể REOPEN.
 */
export function canMarketingExpenseReopen(
  status: MarketingExpenseReportStatus | string
): boolean {
  return status === MarketingExpenseReportStatus.LOCKED;
}

/**
 * Có thể DELETE báo cáo không.
 *   Chỉ DRAFT / REOPENED mới được xóa.
 *   LOCKED → KHÔNG được xóa.
 */
export function canMarketingExpenseDelete(
  status: MarketingExpenseReportStatus | string
): boolean {
  return (
    status === MarketingExpenseReportStatus.DRAFT ||
    status === MarketingExpenseReportStatus.REOPENED
  );
}

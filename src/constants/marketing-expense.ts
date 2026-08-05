/**
 * ==================================================
 * MARKETING EXPENSE REPORT STATUS CONSTANTS
 * ==================================================
 *
 * Workflow Simplification Refactor (Aug 2026)
 *
 * Status values dùng cho MarketingExpenseReport.
 *
 * Workflow mới:
 *   DRAFT → LOCKED → REOPENED → LOCKED
 *
 * Business Rules:
 *   - Marketing tự lock khi hoàn thành báo cáo ngày.
 *   - Marketing không cần Approval.
 *   - Nếu có sai sót → Admin mở lại (REOPENED) → Marketing sửa → LOCK lại.
 */

export enum MarketingExpenseReportStatus {
  /** Báo cáo đang được nhân viên marketing soạn. */
  DRAFT = "DRAFT",
  /** Đã khóa - không thể sửa. */
  LOCKED = "LOCKED",
  /** Đã được mở lại (từ LOCKED) để chỉnh sửa. */
  REOPENED = "REOPENED",
}

export const MARKETING_EXPENSE_STATUS_LABELS: Record<MarketingExpenseReportStatus, string> = {
  [MarketingExpenseReportStatus.DRAFT]: "Nháp",
  [MarketingExpenseReportStatus.LOCKED]: "Đã khóa",
  [MarketingExpenseReportStatus.REOPENED]: "Đã mở lại",
};

/**
 * Status colors for UI display (Ant Design Tag colors)
 */
export const MARKETING_EXPENSE_STATUS_COLORS: Record<MarketingExpenseReportStatus, string> = {
  [MarketingExpenseReportStatus.DRAFT]: "default",
  [MarketingExpenseReportStatus.LOCKED]: "error",
  [MarketingExpenseReportStatus.REOPENED]: "warning",
};

/**
 * Status icons for Timeline, Dashboard (Ant Design icon names)
 */
export const MARKETING_EXPENSE_STATUS_ICONS: Record<MarketingExpenseReportStatus, string> = {
  [MarketingExpenseReportStatus.DRAFT]: "EditOutlined",
  [MarketingExpenseReportStatus.LOCKED]: "LockOutlined",
  [MarketingExpenseReportStatus.REOPENED]: "UnlockOutlined",
};

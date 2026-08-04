/**
 * ==================================================
 * MARKETING EXPENSE REPORT STATUS CONSTANTS
 * ==================================================
 *
 * Sprint 6.5 — Marketing Expense Domain
 *
 * Status values dùng cho MarketingExpenseReport.
 *
 * Workflow:
 *   DRAFT → SUBMITTED → APPROVED → LOCKED
 *     ↑          ↓
 *     │       REJECTED → DRAFT (sửa và nộp lại)
 *     │
 *  REOPENED (từ LOCKED) → có thể tiếp tục chỉnh sửa
 */

export enum MarketingExpenseReportStatus {
  /** Báo cáo đang được nhân viên marketing soạn. */
  DRAFT = "DRAFT",
  /** Đã nộp, chờ leader/manager duyệt. */
  SUBMITTED = "SUBMITTED",
  /** Đã được duyệt. */
  APPROVED = "APPROVED",
  /** Đã khóa - không thể sửa. */
  LOCKED = "LOCKED",
  /** Đã được mở lại (từ LOCKED) để chỉnh sửa. */
  REOPENED = "REOPENED",
  /** Bị leader từ chối — nhân viên cần sửa và nộp lại. */
  REJECTED = "REJECTED",
}

export const MARKETING_EXPENSE_STATUS_LABELS: Record<MarketingExpenseReportStatus, string> = {
  [MarketingExpenseReportStatus.DRAFT]: "Nháp",
  [MarketingExpenseReportStatus.SUBMITTED]: "Đã nộp",
  [MarketingExpenseReportStatus.APPROVED]: "Đã duyệt",
  [MarketingExpenseReportStatus.LOCKED]: "Đã khóa",
  [MarketingExpenseReportStatus.REOPENED]: "Đã mở lại",
  [MarketingExpenseReportStatus.REJECTED]: "Bị từ chối",
};

/**
 * Status colors for UI display (Ant Design Tag colors)
 */
export const MARKETING_EXPENSE_STATUS_COLORS: Record<MarketingExpenseReportStatus, string> = {
  [MarketingExpenseReportStatus.DRAFT]: "default",
  [MarketingExpenseReportStatus.SUBMITTED]: "processing",
  [MarketingExpenseReportStatus.APPROVED]: "success",
  [MarketingExpenseReportStatus.LOCKED]: "error",
  [MarketingExpenseReportStatus.REOPENED]: "warning",
  [MarketingExpenseReportStatus.REJECTED]: "error",
};

/**
 * Status icons for Timeline, Dashboard (Ant Design icon names)
 */
export const MARKETING_EXPENSE_STATUS_ICONS: Record<MarketingExpenseReportStatus, string> = {
  [MarketingExpenseReportStatus.DRAFT]: "EditOutlined",
  [MarketingExpenseReportStatus.SUBMITTED]: "UploadOutlined",
  [MarketingExpenseReportStatus.APPROVED]: "CheckCircleOutlined",
  [MarketingExpenseReportStatus.LOCKED]: "LockOutlined",
  [MarketingExpenseReportStatus.REOPENED]: "UnlockOutlined",
  [MarketingExpenseReportStatus.REJECTED]: "CloseCircleOutlined",
};

/**
 * ==================================================
 * MARKETING EXPENSE HISTORY ACTIONS
 * ==================================================
 *
 * Workflow Simplification Refactor (Aug 2026)
 *
 * Actions cho MarketingExpenseHistory timeline.
 *
 * Actions còn lại:
 *   CREATED, UPDATED, LOCKED, REOPENED, DELETED
 *
 * Actions đã xóa:
 *   SUBMITTED, APPROVED, REJECTED
 */

export enum MarketingExpenseAction {
  CREATED = "CREATED",
  UPDATED = "UPDATED",
  LOCKED = "LOCKED",
  REOPENED = "REOPENED",
  DELETED = "DELETED",
}

/**
 * ==================================================
 * MARKETING EXPENSE STATUS CONFIG
 * ==================================================
 *
 * Workflow Simplification Refactor (Aug 2026)
 *
 * Status configuration cho StatusBadge component.
 * Dùng chung cho tất cả UI hiển thị status của MarketingExpense.
 */

import {
  MarketingExpenseReportStatus,
  MARKETING_EXPENSE_STATUS_LABELS,
} from "@/constants/marketing-expense";

import type { StatusConfig } from "@/components/common/display/StatusBadge";

export const marketingExpenseStatusConfig: Record<
  MarketingExpenseReportStatus,
  StatusConfig
> = {
  [MarketingExpenseReportStatus.DRAFT]: {
    color: "#8c8c8c",
    backgroundColor: "#fafafa",
    label: MARKETING_EXPENSE_STATUS_LABELS[MarketingExpenseReportStatus.DRAFT],
  },
  [MarketingExpenseReportStatus.LOCKED]: {
    color: "#ff4d4f",
    backgroundColor: "#fff1f0",
    label: MARKETING_EXPENSE_STATUS_LABELS[MarketingExpenseReportStatus.LOCKED],
  },
  [MarketingExpenseReportStatus.REOPENED]: {
    color: "#fa8c16",
    backgroundColor: "#fff7e6",
    label: MARKETING_EXPENSE_STATUS_LABELS[MarketingExpenseReportStatus.REOPENED],
  },
};

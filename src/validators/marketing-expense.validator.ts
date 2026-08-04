/**
 * ==================================================
 * MARKETING EXPENSE VALIDATOR
 * ==================================================
 *
 * Sprint 6.5 — Marketing Expense Domain
 *
 * Zod schemas cho MarketingExpenseReport form (UI layer).
 *
 * Lưu ý:
 *  - Validator chỉ kiểm tra shape dữ liệu form.
 *  - Business rules (status transition, duplicate ngày, ...) thuộc Service.
 */

import { z } from "zod";

// ============================================================================
// Helpers
// ============================================================================

const nonNegativeNumber = z.number().min(0, "Không được âm");

const dateString = z
  .string()
  .trim()
  .min(1, "Ngày báo cáo là bắt buộc")
  .refine((val) => !Number.isNaN(Date.parse(val)), {
    message: "Ngày báo cáo không hợp lệ",
  });

// ============================================================================
// Budget allocation schema
// ============================================================================

const budgetAllocationSchema = z.object({
  morning: nonNegativeNumber,
  afternoon: nonNegativeNumber,
  emergency: nonNegativeNumber,
});

// ============================================================================
// Main form schema
// ============================================================================

export const marketingExpenseFormSchema = z.object({
  reportDate: dateString,

  marketingEmployeeId: z
    .string()
    .trim()
    .min(1, "Nhân viên marketing là bắt buộc"),

  /**
   * `facebookPageId` = null / undefined → báo cáo toàn team.
   */
  facebookPageId: z
    .string()
    .trim()
    .min(1, "Facebook page không hợp lệ")
    .nullable()
    .optional()
    .or(z.literal("")),

  requestedBudget: budgetAllocationSchema,
  spentBudget: budgetAllocationSchema,

  totalRevenue: nonNegativeNumber.default(0),
  totalLeads: nonNegativeNumber.default(0),
  closedLeads: nonNegativeNumber.default(0),
});

export type MarketingExpenseForm = z.infer<typeof marketingExpenseFormSchema>;

// ============================================================================
// Default form (cho UI init)
// ============================================================================

export const defaultMarketingExpenseForm: MarketingExpenseForm = {
  reportDate: new Date().toISOString().slice(0, 10),
  marketingEmployeeId: "",
  facebookPageId: null,
  requestedBudget: { morning: 0, afternoon: 0, emergency: 0 },
  spentBudget: { morning: 0, afternoon: 0, emergency: 0 },
  totalRevenue: 0,
  totalLeads: 0,
  closedLeads: 0,
};

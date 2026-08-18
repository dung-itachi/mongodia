/**
 * ==================================================
 * MARKETING EXPENSE FORM VALIDATOR (CLIENT-SAFE)
 * ==================================================
 *
 * Sprint 6.5 — Marketing Expense Domain
 *
 * Client-safe Zod schemas cho MarketingExpenseReport UI form.
 * File này KHÔNG import mongoose, vì vậy có thể được sử dụng trong
 * cả Server Components lẫn Client Components (Drawer / Form / Table).
 *
 * Server-only API schemas (dùng mongoose.Types.ObjectId) được tách
 * sang `@/validators/marketing-expense.validator`.
 *
 * Lưu ý:
 *  - Validator chỉ kiểm tra shape dữ liệu form.
 *  - Business rules (status transition, duplicate ngày, ...) thuộc Service.
 */

import { z } from "zod";

// ============================================================================
// Budget allocation schema
// ============================================================================

const nonNegativeNumber = z.number().min(0, "Không được âm");

const budgetAllocationSchema = z.object({
  morning: nonNegativeNumber,
  afternoon: nonNegativeNumber,
  emergency: nonNegativeNumber,
});

// ============================================================================
// Main form schema
// ============================================================================

export const marketingExpenseFormSchema = z.object({
  reportDate: z.string().min(1, "Ngày báo cáo là bắt buộc"),

  marketingEmployeeId: z
    .string()
    .trim()
    .min(1, "Nhân viên marketing là bắt buộc"),

  /**
   * `facebookPageId` = null / undefined / "" → báo cáo toàn team.
   */
  facebookPageId: z.string().nullable().default(null),

  requestedBudget: z.object({
    morning: z.number().min(0).default(0),
    afternoon: z.number().min(0).default(0),
    emergency: z.number().min(0).default(0),
  }),

  spentBudget: z.object({
    morning: z.number().min(0).default(0),
    afternoon: z.number().min(0).default(0),
    emergency: z.number().min(0).default(0),
  }),

  totalRevenue: z.number().min(0).default(0),
  totalLeads: z.number().min(0).default(0),
  closedLeads: z.number().min(0).default(0),

  note: z.string().trim().max(2000).default(""),
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
  note: "",
};
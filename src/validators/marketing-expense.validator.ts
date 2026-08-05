/**
 * ==================================================
 * MARKETING EXPENSE VALIDATOR
 * ==================================================
 *
 * Sprint 6.5 — Marketing Expense Domain
 * Sprint 6.7 — Marketing Expense CRUD (Backend)
 *
 * Zod schemas cho MarketingExpenseReport:
 *   - `marketingExpenseFormSchema`   → UI form (Sprint 6.5)
 *   - `createMarketingExpenseSchema` → POST /api/marketing/expenses (Sprint 6.7)
 *   - `updateMarketingExpenseSchema` → PATCH /api/marketing/expenses/:id
 *   - `listMarketingExpenseSchema`   → GET /api/marketing/expenses query params
 *
 * Lưu ý:
 *  - Validator chỉ kiểm tra shape dữ liệu form.
 *  - Business rules (status transition, duplicate ngày, ...) thuộc Service.
 */

import { z } from "zod";
import mongoose from "mongoose";

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

// ============================================================================
// API schemas (Sprint 6.7)
// ============================================================================

const objectIdString = z
  .string()
  .trim()
  .min(1, "ID không được rỗng")
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "ID không hợp lệ",
  });

const nullableObjectIdString = z
  .string()
  .trim()
  .refine((val) => val === "" || mongoose.Types.ObjectId.isValid(val), {
    message: "ID không hợp lệ",
  });

/**
 * Body cho POST /api/marketing/expenses.
 *
 * `createdBy` lấy từ current user ở route handler — KHÔNG nhận từ body
 * (chống spoof). Nếu client gửi sẽ bị loại bỏ.
 */
export const createMarketingExpenseSchema = z.object({
  reportDate: dateString,
  marketingEmployeeId: objectIdString,
  /**
   * `null` / undefined / "" → report toàn team.
   */
  facebookPageId: nullableObjectIdString.nullable().optional(),
  requestedBudget: budgetAllocationSchema,
  spentBudget: budgetAllocationSchema.default({
    morning: 0,
    afternoon: 0,
    emergency: 0,
  }),
  totalRevenue: nonNegativeNumber.default(0),
  totalLeads: nonNegativeNumber.default(0),
  closedLeads: nonNegativeNumber.default(0),
  note: z.string().trim().max(2000).optional(),
});

export type CreateMarketingExpensePayload = z.infer<
  typeof createMarketingExpenseSchema
>;

/**
 * Body cho PATCH /api/marketing/expenses/:id.
 *
 * Mọi field đều optional (partial update). Status KHÔNG cho phép thay đổi
 * qua API thường — chỉ thay đổi qua workflow endpoints (lock / reopen).
 */
export const updateMarketingExpenseSchema = z
  .object({
    marketingEmployeeId: objectIdString.optional(),
    facebookPageId: nullableObjectIdString.nullable().optional(),
    requestedBudget: budgetAllocationSchema.optional(),
    spentBudget: budgetAllocationSchema.optional(),
    totalRevenue: nonNegativeNumber.optional(),
    totalLeads: nonNegativeNumber.optional(),
    closedLeads: nonNegativeNumber.optional(),
    note: z.string().trim().max(2000).optional(),
    updatedBy: objectIdString.optional(),
  })
  .strict();

export type UpdateMarketingExpensePayload = z.infer<
  typeof updateMarketingExpenseSchema
>;

/**
 * Query params cho GET /api/marketing/expenses.
 *
 * Tất cả field đều optional; route handler sẽ ép về `MarketingExpenseFilter`.
 *
 * `dateFrom` / `dateTo` chấp nhận ISO date string (`YYYY-MM-DD` hoặc
 * `YYYY-MM-DDTHH:mm:ssZ`). Nếu invalid → 400 ngay từ validator, không
 * để MongoDB ném lỗi runtime.
 */
const dateRangeString = z
  .string()
  .trim()
  .refine((val) => !Number.isNaN(Date.parse(val)), {
    message: "Ngày không hợp lệ",
  });

export const listMarketingExpenseSchema = z.object({
  keyword: z.string().trim().max(200).optional(),
  status: z.string().trim().optional(),
  marketingEmployeeId: z.string().trim().optional(),
  facebookPageId: z.string().trim().optional(),
  dateFrom: dateRangeString.optional(),
  dateTo: dateRangeString.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortField: z.string().trim().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type ListMarketingExpenseQuery = z.infer<
  typeof listMarketingExpenseSchema
>;

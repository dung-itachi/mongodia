/**
 * ==================================================
 * CUSTOMER ACTIVITY VALIDATORS
 * ==================================================
 *
 * Sprint 8.1 — Customer Timeline & CRM Activities
 *
 * Zod schemas for Customer Activity API validation.
 */

import { z } from "zod";
import { ActivityType, ActivityResult } from "@/models/CustomerActivity";

// ============================================================================
// Create Activity Schema
// ============================================================================

export const createCustomerActivitySchema = z.object({
  customerId: z.string().min(1, "customerId là bắt buộc"),
  activityType: z.nativeEnum(ActivityType),
  title: z.string().trim().min(1, "Tiêu đề là bắt buộc").max(500),
  content: z.string().trim().max(5000).optional(),
  nextFollowUpAt: z.string().datetime().optional().or(z.literal("")),
  result: z.nativeEnum(ActivityResult).optional(),
  employeeId: z.string().min(1, "employeeId là bắt buộc"),
});

export type CreateCustomerActivityInput = z.infer<typeof createCustomerActivitySchema>;

// ============================================================================
// Update Activity Schema
// ============================================================================

export const updateCustomerActivitySchema = z.object({
  activityType: z.nativeEnum(ActivityType).optional(),
  title: z.string().trim().min(1).max(500).optional(),
  content: z.string().trim().max(5000).optional(),
  nextFollowUpAt: z.string().datetime().optional().or(z.literal("")).nullable(),
  result: z.nativeEnum(ActivityResult).optional(),
});

export type UpdateCustomerActivityInput = z.infer<typeof updateCustomerActivitySchema>;

// ============================================================================
// List Activities Schema
// ============================================================================

export const listCustomerActivitySchema = z.object({
  customerId: z.string().optional(),
  employeeId: z.string().optional(),
  activityType: z.nativeEnum(ActivityType).optional(),
  keyword: z.string().optional(),
  result: z.nativeEnum(ActivityResult).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  sortField: z.enum(["createdAt", "updatedAt", "nextFollowUpAt", "title"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type ListCustomerActivityInput = z.infer<typeof listCustomerActivitySchema>;

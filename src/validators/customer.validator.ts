/**
 * ==================================================
 * CUSTOMER VALIDATORS
 * ==================================================
 *
 * Sprint 8.0 — Customer Module Foundation
 *
 * Zod schemas for Customer API validation.
 */

import { z } from "zod";
import { CustomerStatus } from "@/models/Customer";

// ============================================================================
// Address Schema
// ============================================================================

const addressSchema = z.object({
  street: z.string().max(500).optional(),
  province: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  ward: z.string().max(100).optional(),
}).optional();

export type AddressInput = z.infer<typeof addressSchema>;

// ============================================================================
// Create Customer Schema
// ============================================================================

export const createCustomerSchema = z.object({
  fullName: z.string().trim().min(1, "Họ tên là bắt buộc").max(200),
  phone: z
    .string()
    .trim()
    .min(1, "Số điện thoại là bắt buộc")
    .regex(/^[0-9+\s().-]{8,20}$/, "Số điện thoại không hợp lệ"),
  email: z
    .string()
    .trim()
    .email("Email không hợp lệ")
    .optional()
    .or(z.literal("")),
  gender: z.enum(["male", "female", "other"]).optional(),
  birthday: z.string().datetime().optional().or(z.literal("")),
  address: addressSchema,
  facebook: z.string().trim().max(200).optional().or(z.literal("")),
  zalo: z.string().trim().max(100).optional().or(z.literal("")),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
  marketingEmployeeId: z.string().optional(),
  saleEmployeeId: z.string().optional(),
  facebookPageId: z.string().optional(),
  campaignId: z.string().optional(),
  leadId: z.string().optional(),
  createdBy: z.string().min(1, "createdBy là bắt buộc"),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

// ============================================================================
// Update Customer Schema
// ============================================================================

export const updateCustomerSchema = z.object({
  fullName: z.string().trim().min(1).max(200).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s().-]{8,20}$/, "Số điện thoại không hợp lệ")
    .optional(),
  email: z
    .string()
    .trim()
    .email("Email không hợp lệ")
    .optional()
    .or(z.literal("")),
  gender: z.enum(["male", "female", "other"]).optional(),
  birthday: z.string().datetime().optional().or(z.literal("")),
  address: addressSchema,
  facebook: z.string().trim().max(200).optional().or(z.literal("")),
  zalo: z.string().trim().max(100).optional().or(z.literal("")),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
  saleEmployeeId: z.string().optional().nullable(),
  status: z.nativeEnum(CustomerStatus).optional(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

// ============================================================================
// List Customers Schema
// ============================================================================

export const listCustomerSchema = z.object({
  keyword: z.string().optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  saleEmployeeId: z.string().optional(),
  marketingEmployeeId: z.string().optional(),
  facebookPageId: z.string().optional(),
  campaignId: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  sortField: z.enum(["customerCode", "fullName", "phone", "createdAt", "updatedAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type ListCustomerInput = z.infer<typeof listCustomerSchema>;

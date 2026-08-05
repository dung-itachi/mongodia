/**
 * ==================================================
 * SALES TARGET VALIDATOR
 * ==================================================
 *
 * Sprint 8.3 — Sales KPI & Target
 */

import { z } from "zod";

export const createSalesTargetSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  targetRevenue: z.number().min(0),
  targetOrders: z.number().int().min(0),
  targetCustomers: z.number().int().min(0),
  targetClosedLead: z.number().int().min(0).optional(),
  note: z.string().max(1000).optional(),
});

export const updateSalesTargetSchema = z.object({
  targetRevenue: z.number().min(0).optional(),
  targetOrders: z.number().int().min(0).optional(),
  targetCustomers: z.number().int().min(0).optional(),
  targetClosedLead: z.number().int().min(0).optional(),
  note: z.string().max(1000).optional(),
});

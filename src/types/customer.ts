/**
 * ==================================================
 * CUSTOMER DOMAIN TYPES
 * ==================================================
 *
 * Sprint 8.0 — Customer Module Foundation
 */

import type { CustomerStatus } from "@/models/Customer";

// ============================================================================
// Address
// ============================================================================

export interface Address {
  street?: string;
  province?: string;
  district?: string;
  ward?: string;
}

// ============================================================================
// Customer Entity
// ============================================================================

export interface Customer {
  _id: string;
  customerCode: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: "male" | "female" | "other";
  birthday?: string;
  address?: Address;

  facebook?: string;
  zalo?: string;
  note?: string;

  marketingEmployeeId?: string;
  saleEmployeeId?: string;
  facebookPageId?: string;
  campaignId?: string;
  leadId?: string;

  status: CustomerStatus;

  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// ============================================================================
// Customer with populated refs
// ============================================================================

export interface CustomerResponse {
  _id: string;
  customerCode: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: "male" | "female" | "other";
  birthday?: string;
  address?: Address;

  facebook?: string;
  zalo?: string;
  note?: string;

  marketingEmployee?: {
    _id: string;
    employeeCode: string;
    fullName: string;
  };
  saleEmployee?: {
    _id: string;
    employeeCode: string;
    fullName: string;
  };
  facebookPage?: {
    _id: string;
    code: string;
    name: string;
  };
  campaign?: {
    _id: string;
    code: string;
    name: string;
  };
  lead?: {
    _id: string;
    code: string;
    fullName: string;
  };

  status: CustomerStatus;
  statusLabel: string;

  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// ============================================================================
// Customer Statistics
// ============================================================================

export interface CustomerStatistics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  lastOrderDate?: string;
  firstOrderDate?: string;
}

// ============================================================================
// Filter
// ============================================================================

export interface CustomerFilter {
  keyword?: string;
  status?: CustomerStatus;
  saleEmployeeId?: string;
  marketingEmployeeId?: string;
  facebookPageId?: string;
  campaignId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  isActive?: boolean;
}

// ============================================================================
// List Response
// ============================================================================

export interface CustomerListResponse {
  items: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Create Input
// ============================================================================

export interface CreateCustomerInput {
  fullName: string;
  phone: string;
  email?: string;
  gender?: "male" | "female" | "other";
  birthday?: string;
  address?: Address;
  facebook?: string;
  zalo?: string;
  note?: string;
  marketingEmployeeId?: string;
  saleEmployeeId?: string;
  facebookPageId?: string;
  campaignId?: string;
  leadId?: string;
  createdBy: string;
}

// ============================================================================
// Update Input
// ============================================================================

export interface UpdateCustomerInput {
  fullName?: string;
  phone?: string;
  email?: string;
  gender?: "male" | "female" | "other";
  birthday?: string;
  address?: Address;
  facebook?: string;
  zalo?: string;
  note?: string;
  saleEmployeeId?: string;
  status?: CustomerStatus;
}

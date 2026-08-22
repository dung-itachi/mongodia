/**
 * Lead Domain Types (Sprint 5.2 — Lead Domain Foundation)
 *
 * Clean Architecture: Domain types cho Lead entity.
 * Sử dụng chung cho Marketing, Sale và Dashboard.
 */

import type { LeadStatus } from "@/constants/leadStatus";
import type { SourceType } from "@/models/Lead";

/**
 * Lead entity - Domain model
 */
export interface Lead {
  _id: string;
  leadCode: string;
  customerId?: string;
  customerName: string;
  customerNewName?: string;
  facebookLink?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  address?: string;
  sourceType: SourceType;
  facebookPageId?: string;
  facebookPageAssignmentId?: string;
  marketingEmployeeId?: string;
  marketingEmployee?: {
    _id: string;
    employeeCode: string;
    name: string;
  };
  saleEmployeeId?: string;
  saleEmployee?: {
    _id: string;
    employeeCode: string;
    name: string;
  };
  /** Populated FacebookPage reference (Sprint 8.6). */
  facebookPage?: {
    _id: string;
    code: string;
    name: string;
  };
  combo?: {
    _id: string;
    code: string;
    name: string;
    /** Giá bán combo (MNT) — Sprint 8.x+. Có khi populate comboId với sellingPrice. */
    sellingPrice?: number;
  };
  product?: {
    _id: string;
    code: string;
    name: string;
  };
  assignmentType?: "AUTO" | "MANUAL";
  assignedAt?: Date;
  categoryId?: string;
  productId?: string;
  comboId?: string;
  quantity?: number;
  unitPriceMNT?: number;
  unitPriceVND?: number;
  exchangeRate?: number;
  estimatedWeight?: number;
  status: LeadStatus;
  latestRemark?: string;
  note?: string;
  isDuplicate: boolean;
  isActive: boolean;
  // Sprint 5.7, 8.4 — Lead Convert (8.4: renamed orderId to convertedOrderId)
  isConverted: boolean;
  convertedOrderId?: string;
  convertedAt?: Date;
  /** Ngày giờ từ Landing page (Sprint 8.x) */
  leadDate?: Date;
  /** Thời gian đơn hàng (Sprint 8.x) - thời gian khách đặt. */
  orderDate?: Date;
  /** Thời gian nhận đơn (Sprint 8.x) - thời gian Marketing nhận được. */
  receivedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lead search/filter params
 */
export interface LeadSearchParams {
  keyword?: string;
  status?: LeadStatus;
  marketingEmployeeId?: string;
  marketingEmployee?: {
    _id: string;
    employeeCode: string;
    name: string;
  };
  saleEmployeeId?: string;
  saleEmployee?: {
    _id: string;
    employeeCode: string;
    name: string;
  };
  facebookPageId?: string;
  sourceType?: SourceType;
  isDuplicate?: boolean;
  isActive?: boolean;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  /** Filter by team code (Sprint 8.x — Marketing Orders Team/MKT Filter) */
  teamId?: string;
  /** Filter by area code (Sprint 8.x) */
  areaId?: string;
}

/**
 * Paginated lead list response
 */
export interface LeadListResponse {
  items: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Create lead input
 */
export interface CreateLeadInput {
  customerId?: string;
  customerName: string;
  customerNewName?: string;
  facebookLink?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  address?: string;
  sourceType: SourceType;
  facebookPageId?: string;
  facebookPageAssignmentId?: string;
  marketingEmployeeId?: string;
  marketingEmployee?: {
    _id: string;
    employeeCode: string;
    name: string;
  };
  saleEmployeeId?: string;
  saleEmployee?: {
    _id: string;
    employeeCode: string;
    name: string;
  };
  categoryId?: string;
  productId?: string;
  comboId?: string;
  quantity?: number;
  unitPriceMNT?: number;
  unitPriceVND?: number;
  exchangeRate?: number;
  estimatedWeight?: number;
  status?: LeadStatus;
  note?: string;
  isDuplicate?: boolean;
  /** Ngày giờ từ Landing page (Sprint 8.x) */
  leadDate?: Date;
  /** Thời gian đơn hàng (Sprint 8.x) */
  orderDate?: Date;
  /** Thời gian nhận đơn (Sprint 8.x) */
  receivedDate?: Date;
  /**
   * Sprint 8.7: Variant details snapshot để /leads prefill khi Sale chốt đơn.
   * Mỗi dòng tương ứng 1 biến thể trong đơn.
   */
  variantDetails?: Array<{
    quantity: number;
    attributes: Array<{
      optionId: string;
      valueId: string;
      optionName?: string;
      valueName?: string;
    }>;
    variantId?: string;
  }>;
  /** Sprint 8.7: Chế độ quà tặng (RANDOM | CUSTOMER_SELECTED). */
  giftMode?: "RANDOM" | "CUSTOMER_SELECTED";
  /** Sprint 8.7: Yêu cầu quà của khách (dùng khi CUSTOMER_SELECTED). */
  giftSelections?: Array<{
    giftProductId: string;
    giftProductName?: string;
    quantity: number;
  }>;
}

/**
 * Update lead input
 */
export interface UpdateLeadInput {
  customerId?: string;
  customerName?: string;
  customerNewName?: string;
  facebookLink?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  address?: string;
  sourceType?: SourceType;
  facebookPageId?: string;
  facebookPageAssignmentId?: string;
  marketingEmployeeId?: string;
  marketingEmployee?: {
    _id: string;
    employeeCode: string;
    name: string;
  };
  saleEmployeeId?: string;
  saleEmployee?: {
    _id: string;
    employeeCode: string;
    name: string;
  };
  assignmentType?: "AUTO" | "MANUAL";
  assignedAt?: Date;
  categoryId?: string;
  productId?: string;
  comboId?: string;
  quantity?: number;
  unitPriceMNT?: number;
  unitPriceVND?: number;
  exchangeRate?: number;
  estimatedWeight?: number;
  status?: LeadStatus;
  latestRemark?: string;
  note?: string;
  isDuplicate?: boolean;
  isActive?: boolean;
  /** Thời gian đơn hàng (Sprint 8.x) */
  orderDate?: Date;
  /** Thời gian nhận đơn (Sprint 8.x) */
  receivedDate?: Date;
  /**
   * Sprint 8.7: Variant details snapshot để /leads prefill khi Sale chốt đơn.
   * Mỗi dòng tương ứng 1 biến thể trong đơn.
   */
  variantDetails?: Array<{
    quantity: number;
    attributes: Array<{
      optionId: string;
      valueId: string;
      optionName?: string;
      valueName?: string;
    }>;
    variantId?: string;
  }>;
  /** Sprint 8.7: Chế độ quà tặng (RANDOM | CUSTOMER_SELECTED). */
  giftMode?: "RANDOM" | "CUSTOMER_SELECTED";
  /** Sprint 8.7: Yêu cầu quà của khách (dùng khi CUSTOMER_SELECTED). */
  giftSelections?: Array<{
    giftProductId: string;
    giftProductName?: string;
    quantity: number;
  }>;
}

/**
 * Lead assignment input
 */
export interface AssignLeadInput {
  saleEmployeeId: string;
  assignmentType: "AUTO" | "MANUAL";
}

/**
 * Marketing Lead Types (Sprint 5.2 — Marketing Input)
 *
 * Types cho Marketing Lead Management UI.
 * Sử dụng trong Marketing Input page.
 */

import { LeadStatus } from "@/constants/leadStatus";
import { LeadSource } from "@/constants/leadSource";

/**
 * Marketing Lead - simplified view cho marketing team
 */
export interface MarketingLead {
  _id: string;
  leadCode: string;
  customerName: string;
  customerId?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  facebookLink?: string;
  address?: string;
  source: LeadSource;
  sourceLabel: string;
  status: LeadStatus;
  statusLabel: string;
  marketingEmployee?: {
    _id: string;
    employeeCode: string;
    name: string;
  };
  saleEmployee?: {
    _id: string;
    employeeCode: string;
    name: string;
  };
  combo?: {
    _id: string;
    code: string;
    name: string;
  };
  /** Sản phẩm (Product) đính kèm Lead. */
  product?: {
    _id: string;
    code: string;
    name: string;
  };
  /** Facebook Page (Sprint 8.6). */
  facebookPage?: {
    _id: string;
    code: string;
    name: string;
  };
  note?: string;
  isDuplicate: boolean;
  /** Lead đã được convert thành Order (Sprint 5.7). */
  isConverted: boolean;
  /** Order ID nếu đã convert (Sprint 5.7). */
  orderId?: string;
  /** Thời điểm convert (Sprint 5.7). */
  convertedAt?: string;
  /** Ngày giờ từ Landing page (Sprint 8.x). */
  leadDate?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Lead list response for marketing
 */
export interface MarketingLeadListResponse {
  items: MarketingLead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Create lead request for marketing
 */
export interface CreateMarketingLeadRequest {
  customerName: string;
  phone?: string;
  email?: string;
  source: LeadSource;
  note?: string;
  /** Facebook Page ID (Sprint 8.6). */
  facebookPageId?: string;
}

/**
 * Marketing lead status options
 * Simplified status set cho marketing input
 */
export type MarketingLeadStatus =
  | LeadStatus.NEW
  | LeadStatus.CONTACTED
  | LeadStatus.ASSIGNED
  | LeadStatus.CLOSED
  | LeadStatus.CANCELLED;

/**
 * Status options cho filter
 */
export const MARKETING_LEAD_STATUS_OPTIONS: { value: MarketingLeadStatus; label: string }[] = [
  { value: LeadStatus.NEW, label: "Mới" },
  { value: LeadStatus.CONTACTED, label: "Đã liên hệ" },
  { value: LeadStatus.ASSIGNED, label: "Đã phân công" },
  { value: LeadStatus.CLOSED, label: "Đã chốt" },
  { value: LeadStatus.CANCELLED, label: "Hủy" },
];

/**
 * Get simplified status label
 */
export function getMarketingLeadStatusLabel(status: MarketingLeadStatus): string {
  const option = MARKETING_LEAD_STATUS_OPTIONS.find((opt) => opt.value === status);
  return option?.label ?? status;
}

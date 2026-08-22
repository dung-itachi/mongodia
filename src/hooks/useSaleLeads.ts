/**
 * Sale Leads Hooks (Sprint 8.5 — Marketing → Sale Workflow)
 *
 * React Query hooks for Sale team.
 * - useSaleLeads: Lấy danh sách leads cần gọi
 * - useSaleLeadCounts: Lấy số liệu thống kê
 * - useUpdateLeadStatus: Cập nhật trạng thái lead (gọi khách)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { LeadStatus } from "@/constants/leadStatus";
import { useAuthStore } from "@/store/auth.store";

// ============================================================================
// Types
// ============================================================================

export interface SaleLead {
  _id: string;
  leadCode: string;
  customerName: string;
  phone?: string;
  phone2?: string;
  email?: string;
  facebookLink?: string;
  address?: string;
  sourceType: string;
  status: LeadStatus;
  product?: {
    _id: string;
    code: string;
    name: string;
  };
  combo?: {
    _id: string;
    code: string;
    name: string;
    /** Giá bán combo (MNT). Có khi API populate comboId với sellingPrice. */
    sellingPrice?: number;
  };
  quantity?: number;
  unitPriceMNT?: number;
  exchangeRate?: number;
  marketingEmployeeId?: {
    _id: string;
    employeeCode: string;
    name: string;
  };
  saleEmployeeId?: {
    _id: string;
    employeeCode: string;
    name: string;
  };
  /** Sprint 8.6: Facebook Page reference (read-only on /leads). */
  facebookPage?: {
    _id: string;
    code: string;
    name: string;
  };
  /** Ghi chú đơn hàng (Sprint 8.x). */
  note?: string;
  assignedAt: string;
  isConverted: boolean;
  /** Lead có bị trùng lặp không. */
  isDuplicate?: boolean;
  /** Sprint X: Số lần chuyển sang trạng thái "Không nghe máy" (NO_ANSWER). */
  noAnswerCount?: number;
  /** Sprint 8.x: Ngày giờ từ Landing page (ngày giờ thực tế khách đăng ký). */
  leadDate?: string;
  /** Sprint 8.x: Thời gian đơn hàng (khách đặt). */
  orderDate?: string;
  /** Sprint 8.x: Thời gian nhận đơn (Marketing nhận được). */
  receivedDate?: string;
  /** Order ID nếu đã convert. */
  convertedOrderId?: string;
  /** Thời điểm convert thành Order. */
  convertedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleLeadListResponse {
  items: SaleLead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SaleLeadCounts {
  total: number;
  new: number;
  contacted: number;
  noAnswer: number;
  potential: number;
  closed: number;
}

export interface SaleLeadFilters {
  status?: LeadStatus[];
  keyword?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchSaleLeads(
  filters: SaleLeadFilters = {},
  viewAll: boolean = false
): Promise<SaleLeadListResponse> {
  const params = new URLSearchParams();

  if (filters.status && filters.status.length > 0) {
    params.set("status", filters.status.join(","));
  }
  if (filters.keyword) {
    params.set("keyword", filters.keyword);
  }
  if (filters.page) {
    params.set("page", String(filters.page));
  }
  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }
  if (viewAll) {
    params.set("viewAll", "true");
  }

  const queryString = params.toString();
  const url = `/api/sale/leads${queryString ? `?${queryString}` : ""}`;

  const response = await api.get(url);
  return response.data.data;
}

async function fetchSaleLeadCounts(viewAll: boolean = false): Promise<SaleLeadCounts> {
  const url = viewAll ? "/api/sale/leads/counts?viewAll=true" : "/api/sale/leads/counts";
  const response = await api.get(url);
  return response.data.data;
}

async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  note?: string
): Promise<{ leadId: string; oldStatus: string; newStatus: string }> {
  const response = await api.patch(`/api/sale/leads/${leadId}/status`, {
    status,
    note,
  });
  return response.data.data;
}

async function updateLead(
  leadId: string,
  payload: {
    customerName?: string;
    phone?: string;
    address?: string;
    productId?: string;
    comboId?: string;
    comboQuantity?: number;
    unitPriceMNT?: number;
    exchangeRate?: number;
    variantDetails?: Array<{
      quantity: number;
      attributes: Array<{ optionId: string; valueId: string }>;
      variantId?: string;
    }>;
    giftMode?: string;
    giftSelections?: Array<{
      giftProductId: string;
      giftProductName?: string;
      quantity: number;
    }>;
    status?: LeadStatus;
  }
): Promise<SaleLead> {
  const response = await api.patch(`/api/sale/leads/${leadId}`, payload);
  return response.data.data;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch paginated list of sale leads
 */
export function useSaleLeads(filters: SaleLeadFilters = {}) {
  // Get current user role from auth store
  const user = useAuthStore((state) => state.user);
  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";
  const viewAll = isAdminOrManager;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<SaleLeadListResponse, Error>({
    queryKey: ["sale-leads", filters, viewAll],
    queryFn: () => fetchSaleLeads(filters, viewAll),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return {
    data: data ?? null,
    leads: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    totalPages: data?.totalPages ?? 1,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

/**
 * Hook to fetch sale lead counts
 */
export function useSaleLeadCounts() {
  // Get current user role from auth store
  const user = useAuthStore((state) => state.user);
  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";
  const viewAll = isAdminOrManager;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<SaleLeadCounts, Error>({
    queryKey: ["sale-lead-counts", viewAll],
    queryFn: () => fetchSaleLeadCounts(viewAll),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return {
    data: data ?? null,
    counts: data ?? {
      total: 0,
      new: 0,
      contacted: 0,
      noAnswer: 0,
      potential: 0,
      closed: 0,
    },
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

/**
 * Hook to update lead status (from Sale calling)
 */
export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      status,
      note,
    }: {
      leadId: string;
      status: LeadStatus;
      note?: string;
    }) => updateLeadStatus(leadId, status, note),
    onSuccess: (_result, variables) => {
      // Invalidate sale leads to refetch
      void queryClient.invalidateQueries({ queryKey: ["sale-leads"] });
      void queryClient.invalidateQueries({ queryKey: ["sale-lead-counts"] });
      void queryClient.invalidateQueries({ queryKey: ["sale-lead-stats"] });
      // Invalidate marketing tracking (they see the same leads)
      void queryClient.invalidateQueries({ queryKey: ["marketing-lead-tracking"] });
    },
  });
}

/**
 * Hook to update lead details (Sale editing)
 */
export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      payload,
    }: {
      leadId: string;
      payload: {
        customerName?: string;
        phone?: string;
        address?: string;
        productId?: string;
        comboId?: string;
        comboQuantity?: number;
        unitPriceMNT?: number;
        exchangeRate?: number;
        variantDetails?: Array<{
          quantity: number;
          attributes: Array<{ optionId: string; valueId: string }>;
          variantId?: string;
        }>;
        giftMode?: string;
        giftSelections?: Array<{
          giftProductId: string;
          giftProductName?: string;
          quantity: number;
        }>;
        status?: LeadStatus;
      };
    }) => updateLead(leadId, payload),
    onSuccess: () => {
      // Invalidate sale leads to refetch
      void queryClient.invalidateQueries({ queryKey: ["sale-leads"] });
      void queryClient.invalidateQueries({ queryKey: ["sale-lead-counts"] });
      void queryClient.invalidateQueries({ queryKey: ["sale-lead-stats"] });
      // Invalidate marketing tracking
      void queryClient.invalidateQueries({ queryKey: ["marketing-lead-tracking"] });
    },
  });
}

// ============================================================================
// Sale Lead Stats (Sprint 8.x+) — aggregated stats for /leads page
// ============================================================================

export interface SaleLeadStatusCountItem {
  status: string;
  label: string;
  count: number;
}

export interface SaleLeadStats {
  statusCounts: SaleLeadStatusCountItem[];
  totalCount: number;
  closedCount: number;
  closedRevenueMNT: number;
  shippingFeeMNT: number;
}

async function fetchSaleLeadStats(
  viewAll: boolean = false
): Promise<SaleLeadStats> {
  const url = viewAll
    ? "/api/sale/leads/stats?viewAll=true"
    : "/api/sale/leads/stats";
  const response = await api.get(url);
  return response.data.data;
}

/**
 * Hook to fetch aggregated stats for the /leads page:
 * - statusCounts:     breakdown of lead counts per LeadStatus
 * - totalCount:       grand total
 * - closedCount:      number of leads with status = CLOSED
 * - closedRevenueMNT: total revenue from CLOSED leads (= sum of
 *                     combo.sellingPrice - shippingFee)
 * - shippingFeeMNT:   shipping fee currently in effect
 *
 * Admin/Manager see stats for all leads; Sale users see their own scope.
 */
export function useSaleLeadStats() {
  const user = useAuthStore((state) => state.user);
  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";
  const viewAll = isAdminOrManager;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<SaleLeadStats, Error>({
    queryKey: ["sale-lead-stats", viewAll],
    queryFn: () => fetchSaleLeadStats(viewAll),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return {
    stats: data ?? {
      statusCounts: [],
      totalCount: 0,
      closedCount: 0,
      closedRevenueMNT: 0,
      shippingFeeMNT: 0,
    },
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

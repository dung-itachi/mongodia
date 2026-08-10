/**
 * Marketing Lead Tracking Hooks (Sprint 8.5 — Marketing → Sale Workflow)
 *
 * React Query hooks for Marketing team to track leads.
 * - useMarketingLeadTracking: Lấy danh sách leads để theo dõi
 * - useMarketingLeadTrackingCounts: Lấy số liệu thống kê
 *
 * Lưu ý: Marketing CHỈ ĐƯỢC XEM, không được cập nhật trạng thái.
 */

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { LeadStatus } from "@/constants/leadStatus";

// ============================================================================
// Types
// ============================================================================

export interface MarketingLeadTracking {
  _id: string;
  leadCode: string;
  customerName: string;
  phone?: string;
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
  };
  quantity?: number;
  unitPriceMNT?: number;
  exchangeRate?: number;
  saleEmployeeId?: {
    _id: string;
    employeeCode: string;
    name: string;
  };
  isConverted: boolean;
  convertedOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingLeadTrackingListResponse {
  items: MarketingLeadTracking[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MarketingLeadTrackingCounts {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  potential: number;
  closed: number;
  converted: number;
}

export interface MarketingLeadTrackingFilters {
  status?: LeadStatus[];
  keyword?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchMarketingLeadTracking(
  filters: MarketingLeadTrackingFilters = {}
): Promise<MarketingLeadTrackingListResponse> {
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

  const queryString = params.toString();
  const url = `/api/marketing/leads/tracking${queryString ? `?${queryString}` : ""}`;

  const response = await api.get(url);
  return response.data.data;
}

async function fetchMarketingLeadTrackingCounts(): Promise<MarketingLeadTrackingCounts> {
  const response = await api.get("/api/marketing/leads/tracking/counts");
  return response.data.data;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch paginated list of marketing leads for tracking
 */
export function useMarketingLeadTracking(filters: MarketingLeadTrackingFilters = {}) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<MarketingLeadTrackingListResponse, Error>({
    queryKey: ["marketing-lead-tracking", filters],
    queryFn: () => fetchMarketingLeadTracking(filters),
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
 * Hook to fetch marketing lead tracking counts
 */
export function useMarketingLeadTrackingCounts() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<MarketingLeadTrackingCounts, Error>({
    queryKey: ["marketing-lead-tracking-counts"],
    queryFn: fetchMarketingLeadTrackingCounts,
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
      qualified: 0,
      potential: 0,
      closed: 0,
      converted: 0,
    },
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

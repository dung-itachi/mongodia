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

// ============================================================================
// Types
// ============================================================================

export interface SaleLead {
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
  unitPriceVND?: number;
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
  assignedAt: string;
  isConverted: boolean;
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
  filters: SaleLeadFilters = {}
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

  const queryString = params.toString();
  const url = `/api/sale/leads${queryString ? `?${queryString}` : ""}`;

  const response = await api.get(url);
  return response.data.data;
}

async function fetchSaleLeadCounts(): Promise<SaleLeadCounts> {
  const response = await api.get("/api/sale/leads/counts");
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

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch paginated list of sale leads
 */
export function useSaleLeads(filters: SaleLeadFilters = {}) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<SaleLeadListResponse, Error>({
    queryKey: ["sale-leads", filters],
    queryFn: () => fetchSaleLeads(filters),
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
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<SaleLeadCounts, Error>({
    queryKey: ["sale-lead-counts"],
    queryFn: fetchSaleLeadCounts,
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
      // Invalidate marketing tracking (they see the same leads)
      void queryClient.invalidateQueries({ queryKey: ["marketing-lead-tracking"] });
    },
  });
}

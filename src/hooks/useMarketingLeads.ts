/**
 * Marketing Leads Hooks (Sprint 5.2 — Marketing Input)
 *
 * React Query hooks for marketing lead management.
 * Includes: useMarketingLeads, useMarketingLead, useCreateLead, useUpdateLead, useDeleteLead
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { MarketingLead, MarketingLeadListResponse } from "@/types/marketing-lead";
import type { LeadSource } from "@/constants/leadSource";

// ============================================================================
// Types
// ============================================================================

export interface LeadTimelineItem {
  id: string;
  leadId: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
  employee: {
    id: string;
    name: string;
    employeeCode: string;
  } | null;
  createdAt: string;
}

export type MarketingLeadFilters = {
  keyword?: string;
  status?: string;
  source?: LeadSource;
  page?: number;
  limit?: number;
  /** Filter by marketing employee (MKT) ID */
  marketingEmployeeId?: string;
  /** Filter by team code */
  teamId?: string;
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchMarketingLeads(
  filters: MarketingLeadFilters
): Promise<MarketingLeadListResponse> {
  const params = new URLSearchParams();

  if (filters.keyword) {
    params.set("keyword", filters.keyword);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.source) {
    params.set("source", filters.source);
  }
  if (filters.page) {
    params.set("page", String(filters.page));
  }
  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }
  if (filters.teamId) {
    params.set("team", filters.teamId);
  }
  if (filters.marketingEmployeeId) {
    params.set("marketingEmployeeId", filters.marketingEmployeeId);
  }

  const queryString = params.toString();
  const url = `/api/marketing/leads${queryString ? `?${queryString}` : ""}`;

  const response = await api.get(url);
  return response.data.data;
}

async function fetchMarketingLead(id: string): Promise<MarketingLead> {
  const response = await api.get(`/api/marketing/leads/${id}`);
  return response.data.data;
}

async function createMarketingLead(
  data: Record<string, unknown>
): Promise<MarketingLead> {
  const response = await api.post("/api/marketing/leads", data);
  return response.data.data;
}

async function updateMarketingLead(
  id: string,
  data: Record<string, unknown>
): Promise<MarketingLead> {
  const response = await api.patch(`/api/marketing/leads/${id}`, data);
  return response.data.data;
}

async function deleteMarketingLead(id: string): Promise<MarketingLead> {
  const response = await api.delete(`/api/marketing/leads/${id}`);
  return response.data.data;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch paginated list of leads
 */
export function useMarketingLeads(filters: MarketingLeadFilters = {}) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<MarketingLeadListResponse, Error>({
    queryKey: ["marketing-leads", filters],
    queryFn: () => fetchMarketingLeads(filters),
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
 * Hook to fetch a single lead by ID
 */
export function useMarketingLead(id: string | null) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<MarketingLead, Error>({
    queryKey: ["marketing-lead", id],
    queryFn: () => fetchMarketingLead(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

/**
 * Hook to create a new lead
 */
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createMarketingLead(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["marketing-leads"] });
    },
  });
}

/**
 * Hook to update an existing lead
 */
export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateMarketingLead(id, data),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["marketing-leads"] });
      void queryClient.invalidateQueries({
        queryKey: ["marketing-lead", variables.id],
      });
    },
  });
}

/**
 * Hook to delete a lead
 */
export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMarketingLead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["marketing-leads"] });
    },
  });
}

// ============================================================================
// Timeline
// ============================================================================

async function fetchLeadTimeline(leadId: string): Promise<LeadTimelineItem[]> {
  const response = await api.get(`/api/marketing/leads/${leadId}/timeline`);
  return response.data.data ?? [];
}

/**
 * Hook to fetch timeline for a lead (Sprint 5.6)
 */
export function useLeadTimeline(leadId: string | null) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<LeadTimelineItem[], Error>({
    queryKey: ["lead-timeline", leadId],
    queryFn: () => fetchLeadTimeline(leadId!),
    enabled: !!leadId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    data: data ?? [],
    items: data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

// ============================================================================
// Convert
// ============================================================================

async function convertLead(leadId: string): Promise<{ orderId: string }> {
  const response = await api.post(`/api/marketing/leads/${leadId}/convert`);
  return response.data.data;
}

/**
 * Hook to convert a lead to order (Sprint 5.7)
 */
export function useConvertLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leadId: string) => convertLead(leadId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["marketing-leads"] });
      void queryClient.invalidateQueries({ queryKey: ["marketing-lead"] });
      void queryClient.invalidateQueries({ queryKey: ["marketing-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

// ============================================================================
// Pushed Count (Sprint 8.X)
// ============================================================================

async function fetchPushedLeadsCount(): Promise<{ pushedCount: number }> {
  const response = await api.get("/api/marketing/leads/pushed-count");
  return response.data.data;
}

/**
 * Hook to fetch count of leads that have been pushed to Sale
 */
export function usePushedLeadsCount() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<{ pushedCount: number }, Error>({
    queryKey: ["pushed-leads-count"],
    queryFn: fetchPushedLeadsCount,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    pushedCount: data?.pushedCount ?? 0,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

// ============================================================================
// Orders Count (Sprint 8.X)
// ============================================================================

async function fetchOrdersCount(): Promise<{ orderCount: number }> {
  const response = await api.get("/api/marketing/orders/count");
  return response.data.data;
}

/**
 * Hook to fetch count of orders for the marketing employee
 */
export function useOrdersCount() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<{ orderCount: number }, Error>({
    queryKey: ["marketing-orders-count"],
    queryFn: fetchOrdersCount,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    orderCount: data?.orderCount ?? 0,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

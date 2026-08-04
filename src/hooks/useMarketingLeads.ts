/**
 * Marketing Leads Hooks (Sprint 5.2 — Marketing Input)
 *
 * React Query hooks for marketing lead management.
 * Includes: useMarketingLeads, useMarketingLead, useCreateLead, useUpdateLead, useDeleteLead
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

  const queryString = params.toString();
  const url = `/api/marketing/leads${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch leads");
  }

  return result.data;
}

async function fetchMarketingLead(id: string): Promise<MarketingLead> {
  const response = await fetch(`/api/marketing/leads/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch lead");
  }

  return result.data;
}

async function createMarketingLead(
  data: Record<string, unknown>
): Promise<MarketingLead> {
  const response = await fetch("/api/marketing/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to create lead");
  }

  return result.data;
}

async function updateMarketingLead(
  id: string,
  data: Record<string, unknown>
): Promise<MarketingLead> {
  const response = await fetch(`/api/marketing/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to update lead");
  }

  return result.data;
}

async function deleteMarketingLead(id: string): Promise<MarketingLead> {
  const response = await fetch(`/api/marketing/leads/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to delete lead");
  }

  return result.data;
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
  const response = await fetch(`/api/marketing/leads/${leadId}/timeline`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Failed to fetch timeline");
  }

  return result.data ?? [];
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
  const response = await fetch(`/api/marketing/leads/${leadId}/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "Failed to convert lead");
  }

  return result.data;
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

/**
 * ==================================================
 * CAMPAIGN HOOKS
 * ==================================================
 *
 * Sprint 7.4 — Facebook Page & Campaign Management
 *
 * React Query hooks for Campaigns CRUD.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

export interface Campaign {
  _id: string;
  code: string;
  name: string;
  facebookPageId: string | { _id: string; code: string; name: string };
  objective: string;
  startDate: string;
  endDate: string | null;
  dailyBudget: number;
  lifetimeBudget: number;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  marketingEmployeeId: string | null | { _id: string; employeeCode?: string; fullName: string };
  note: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCampaignInput {
  code: string;
  name: string;
  facebookPageId: string;
  objective?: string;
  startDate: string;
  endDate?: string | null;
  dailyBudget?: number;
  lifetimeBudget?: number;
  status?: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  marketingEmployeeId?: string | null;
  note?: string;
}

export interface UpdateCampaignInput extends Partial<CreateCampaignInput> {
  isActive?: boolean;
}

export interface CampaignListResponse {
  items: Campaign[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const campaignKeys = {
  all: ["campaigns"] as const,
  lists: () => [...campaignKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...campaignKeys.lists(), filters] as const,
  details: () => [...campaignKeys.all, "detail"] as const,
  detail: (id: string) => [...campaignKeys.details(), id] as const,
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchCampaigns(filters?: Record<string, unknown>): Promise<CampaignListResponse> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });
  }

  const response = await fetch(`/api/campaigns?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch Campaigns");
  }

  return result.data;
}

async function fetchCampaign(id: string): Promise<Campaign> {
  const response = await fetch(`/api/campaigns/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch Campaign");
  }

  return result.data;
}

async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const response = await fetch("/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to create Campaign");
  }

  return result.data;
}

async function updateCampaign(id: string, input: UpdateCampaignInput): Promise<Campaign> {
  const response = await fetch(`/api/campaigns/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to update Campaign");
  }

  return result.data;
}

async function deleteCampaign(id: string): Promise<void> {
  const response = await fetch(`/api/campaigns/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }
}

// ============================================================================
// Hooks
// ============================================================================

export function useCampaigns(filters?: Record<string, unknown>) {
  return useQuery<CampaignListResponse, Error>({
    queryKey: campaignKeys.list(filters ?? {}),
    queryFn: () => fetchCampaigns(filters),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCampaign(id: string | null) {
  return useQuery<Campaign, Error>({
    queryKey: campaignKeys.detail(id ?? ""),
    queryFn: () => {
      if (!id) throw new Error("No ID provided");
      return fetchCampaign(id);
    },
    enabled: Boolean(id),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation<Campaign, Error, CreateCampaignInput>({
    mutationFn: createCampaign,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation<Campaign, Error, { id: string; data: UpdateCampaignInput }>({
    mutationFn: ({ id, data }) => updateCampaign(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: campaignKeys.detail(variables.id) });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

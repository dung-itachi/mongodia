/**
 * ==================================================
 * FACEBOOK PAGE HOOKS
 * ==================================================
 *
 * Sprint 7.4 — Facebook Page & Campaign Management
 *
 * React Query hooks for Facebook Pages CRUD.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

export interface FacebookPage {
  _id: string;
  code: string;
  name: string;
  pageUrl: string;
  facebookPageId: string;
  description: string;
  businessManager: string;
  currency: string;
  timezone: string;
  status: "ACTIVE" | "INACTIVE";
  note: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  currentAssignment?: {
    _id: string;
    marketingEmployeeId: string | null;
    marketingEmployee: {
      _id: string;
      employeeCode: string;
      fullName: string;
    } | null;
    startDate: string;
    endDate: string | null;
  } | null;
}

export interface CreateFacebookPageInput {
  code: string;
  name: string;
  pageUrl?: string;
  facebookPageId?: string;
  description?: string;
  businessManager?: string;
  currency?: string;
  timezone?: string;
  status?: "ACTIVE" | "INACTIVE";
  note?: string;
}

export interface UpdateFacebookPageInput extends Partial<CreateFacebookPageInput> {
  isActive?: boolean;
}

export interface FacebookPageListResponse {
  items: FacebookPage[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const facebookPageKeys = {
  all: ["facebook-pages"] as const,
  lists: () => [...facebookPageKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...facebookPageKeys.lists(), filters] as const,
  details: () => [...facebookPageKeys.all, "detail"] as const,
  detail: (id: string) => [...facebookPageKeys.details(), id] as const,
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchFacebookPages(filters?: Record<string, unknown>): Promise<FacebookPageListResponse> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });
  }

  const response = await fetch(`/api/facebook-pages?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch Facebook Pages");
  }

  return result.data;
}

async function fetchFacebookPage(id: string): Promise<FacebookPage> {
  const response = await fetch(`/api/facebook-pages/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch Facebook Page");
  }

  return result.data;
}

async function createFacebookPage(input: CreateFacebookPageInput): Promise<FacebookPage> {
  const response = await fetch("/api/facebook-pages", {
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
    throw new Error(result.message || "Failed to create Facebook Page");
  }

  return result.data;
}

async function updateFacebookPage(id: string, input: UpdateFacebookPageInput): Promise<FacebookPage> {
  const response = await fetch(`/api/facebook-pages/${id}`, {
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
    throw new Error(result.message || "Failed to update Facebook Page");
  }

  return result.data;
}

async function deleteFacebookPage(id: string): Promise<void> {
  const response = await fetch(`/api/facebook-pages/${id}`, {
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

export function useFacebookPages(filters?: Record<string, unknown>) {
  return useQuery<FacebookPageListResponse, Error>({
    queryKey: facebookPageKeys.list(filters ?? {}),
    queryFn: () => fetchFacebookPages(filters),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Sprint 8.6 — Active Facebook Pages only.
 *
 * Returns all ACTIVE Facebook pages, sorted newest first.
 * Use this when you need a "select page" dropdown (LeadDrawer, MarketingInputSection).
 *
 * NOTE: Backend `/api/facebook-pages` does not sort by createdAt desc yet,
 * so we re-sort on the client to honor "mới nhất" requirement.
 */
export function useActiveFacebookPages() {
  const { data, isLoading, error } = useFacebookPages({
    status: "ACTIVE",
    isActive: "true",
    pageSize: 100,
  });

  const sortedItems = [...(data?.items ?? [])].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  return {
    pages: sortedItems,
    loading: isLoading,
    error: error?.message ?? null,
  };
}

export function useFacebookPage(id: string | null) {
  return useQuery<FacebookPage, Error>({
    queryKey: facebookPageKeys.detail(id ?? ""),
    queryFn: () => {
      if (!id) throw new Error("No ID provided");
      return fetchFacebookPage(id);
    },
    enabled: Boolean(id),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateFacebookPage() {
  const queryClient = useQueryClient();

  return useMutation<FacebookPage, Error, CreateFacebookPageInput>({
    mutationFn: createFacebookPage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: facebookPageKeys.lists() });
    },
  });
}

export function useUpdateFacebookPage() {
  const queryClient = useQueryClient();

  return useMutation<FacebookPage, Error, { id: string; data: UpdateFacebookPageInput }>({
    mutationFn: ({ id, data }) => updateFacebookPage(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: facebookPageKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: facebookPageKeys.detail(variables.id) });
    },
  });
}

export function useDeleteFacebookPage() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteFacebookPage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: facebookPageKeys.lists() });
    },
  });
}

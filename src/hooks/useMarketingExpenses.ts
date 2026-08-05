/**
 * ==================================================
 * MARKETING EXPENSE HOOKS
 * ==================================================
 *
 * Workflow Simplification Refactor (Aug 2026)
 *
 * Layer:    React Component  →  Hook  →  API Route
 *
 * Hooks:
 *   Query:
 *     - useMarketingExpenses(filters)   — list (paginated, filterable, sortable)
 *     - useMarketingExpense(id)          — detail (with populated refs)
 *
 *   Mutation:
 *     - useCreateMarketingExpense       — POST   /api/marketing/expenses
 *     - useUpdateMarketingExpense       — PATCH  /api/marketing/expenses/:id
 *     - useDeleteMarketingExpense       — DELETE /api/marketing/expenses/:id
 *
 *   Workflow (LOCK / REOPEN):
 *     - useLockMarketingExpense         — POST /api/marketing/expenses/:id/lock
 *     - useReopenMarketingExpense       — POST /api/marketing/expenses/:id/reopen
 *
 * Query keys:
 *   ["marketing-expenses"]                   — base prefix
 *   ["marketing-expenses", filters]          — list
 *   ["marketing-expense", id]                — detail
 *
 * Invalidate:
 *   CREATE / DELETE              → marketing-expenses + marketing-dashboard
 *   UPDATE / LOCK / REOPEN      → marketing-expenses + marketing-expense + marketing-dashboard
 *
 * Options:
 *   staleTime: 60s | gcTime: 5min | retry: 2 | refetchOnWindowFocus: false
 *
 * Toasts:
 *   - Mỗi mutation success → toast.success(message) lấy từ response backend.
 *   - Mỗi mutation error  → toast.error(message)   lấy từ response backend.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

import type {
  MarketingExpense,
  MarketingExpenseFilter,
  MarketingExpenseSummary,
} from "@/types/marketing-expense";
import type { MarketingExpenseResponse } from "@/mappers/marketing-expense.mapper";
import type { MarketingExpenseHistoryItem } from "@/repositories/marketing-expense-history.repository";

import { toast } from "@/components/common/feedback/Toast";
import { request } from "@/lib/request";
import { marketingDashboardKeys } from "@/hooks/marketingDashboardKeys";

// ============================================================================
// Query keys
// ============================================================================

export const marketingExpenseKeys = {
  all: ["marketing-expenses"] as const,
  lists: () => [...marketingExpenseKeys.all, "list"] as const,
  list: (filters: MarketingExpenseFilter) =>
    [...marketingExpenseKeys.lists(), filters] as const,
  details: () => [...marketingExpenseKeys.all, "detail"] as const,
  detail: (id: string) => [...marketingExpenseKeys.details(), id] as const,
  timelines: () => [...marketingExpenseKeys.all, "timeline"] as const,
  timeline: (id: string) => [...marketingExpenseKeys.timelines(), id] as const,
};

// ============================================================================
// Response shape
// ============================================================================

export interface MarketingExpenseListPayload {
  items: MarketingExpenseResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// API functions
// ============================================================================

async function fetchMarketingExpenses(
  filters: MarketingExpenseFilter
): Promise<MarketingExpenseListPayload> {
  const params = new URLSearchParams();

  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.status) params.set("status", filters.status);
  if (filters.marketingEmployeeId) {
    params.set("marketingEmployeeId", filters.marketingEmployeeId);
  }
  if (filters.facebookPageId) {
    params.set("facebookPageId", filters.facebookPageId);
  }
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.pageSize !== undefined) {
    params.set("pageSize", String(filters.pageSize));
  }
  if (filters.sortField) params.set("sortField", filters.sortField);
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);

  const queryString = params.toString();
  const url = `/api/marketing/expenses${queryString ? `?${queryString}` : ""}`;

  return request<MarketingExpenseListPayload>(url, { method: "GET" });
}

async function fetchMarketingExpense(
  id: string
): Promise<MarketingExpenseResponse> {
  return request<MarketingExpenseResponse>(
    `/api/marketing/expenses/${id}`,
    { method: "GET" }
  );
}

async function fetchMarketingExpenseTimeline(
  id: string
): Promise<MarketingExpenseHistoryItem[]> {
  return request<MarketingExpenseHistoryItem[]>(
    `/api/marketing/expenses/${id}/timeline`,
    { method: "GET" }
  );
}

async function createMarketingExpenseApi(
  data: Partial<MarketingExpense>
): Promise<MarketingExpenseResponse> {
  return request<MarketingExpenseResponse>("/api/marketing/expenses", {
    method: "POST",
    body: data,
  });
}

async function updateMarketingExpenseApi(
  id: string,
  data: Partial<MarketingExpense>
): Promise<MarketingExpenseResponse> {
  return request<MarketingExpenseResponse>(
    `/api/marketing/expenses/${id}`,
    { method: "PATCH", body: data }
  );
}

async function deleteMarketingExpenseApi(id: string): Promise<null> {
  return request<null>(`/api/marketing/expenses/${id}`, {
    method: "DELETE",
  });
}

// --------------------------------------------------------------------------
// Workflow API (LOCK / REOPEN)
// --------------------------------------------------------------------------

async function lockMarketingExpenseApi(id: string): Promise<MarketingExpenseResponse> {
  return request<MarketingExpenseResponse>(
    `/api/marketing/expenses/${id}/lock`,
    { method: "POST" }
  );
}

async function reopenMarketingExpenseApi(id: string): Promise<MarketingExpenseResponse> {
  return request<MarketingExpenseResponse>(
    `/api/marketing/expenses/${id}/reopen`,
    { method: "POST" }
  );
}

// ============================================================================
// Shared query options
// ============================================================================

const SHARED_QUERY_OPTIONS = {
  staleTime: 60 * 1000,
  gcTime: 5 * 60 * 1000,
  retry: 2,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 8000),
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

// ============================================================================
// Invalidate helpers
// ============================================================================

function invalidateAllAfterMutation(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string
) {
  void queryClient.invalidateQueries({
    queryKey: marketingExpenseKeys.all,
  });
  if (id) {
    void queryClient.invalidateQueries({
      queryKey: marketingExpenseKeys.detail(id),
    });
    void queryClient.invalidateQueries({
      queryKey: marketingExpenseKeys.timeline(id),
    });
  }

  void queryClient.invalidateQueries({
    queryKey: marketingDashboardKeys.all,
  });
}

// ============================================================================
// Query hooks
// ============================================================================

export function useMarketingExpenses(
  filters: MarketingExpenseFilter = {},
  options?: Omit<
    UseQueryOptions<MarketingExpenseListPayload, Error>,
    "queryKey" | "queryFn"
  >
) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<MarketingExpenseListPayload, Error>({
    queryKey: marketingExpenseKeys.list(filters),
    queryFn: () => fetchMarketingExpenses(filters),
    ...SHARED_QUERY_OPTIONS,
    ...options,
  });

  return {
    data: data ?? null,
    expenses: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pageSize: data?.pageSize ?? 20,
    totalPages: data?.totalPages ?? 1,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

export function useMarketingExpense(id: string | null) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<MarketingExpenseResponse, Error>({
    queryKey: marketingExpenseKeys.detail(id ?? ""),
    queryFn: () => fetchMarketingExpense(id as string),
    enabled: !!id,
    ...SHARED_QUERY_OPTIONS,
  });

  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

export function useMarketingExpenseTimeline(id: string | null) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<MarketingExpenseHistoryItem[], Error>({
    queryKey: marketingExpenseKeys.timeline(id ?? ""),
    queryFn: () => fetchMarketingExpenseTimeline(id as string),
    enabled: !!id,
    ...SHARED_QUERY_OPTIONS,
  });

  return {
    data: data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

// ============================================================================
// CRUD mutation hooks
// ============================================================================

export function useCreateMarketingExpense() {
  const queryClient = useQueryClient();

  return useMutation<
    MarketingExpenseResponse,
    Error,
    Partial<MarketingExpense>
  >({
    mutationFn: (data) => createMarketingExpenseApi(data),
    onSuccess: (data) => {
      toast.success(
        (data as unknown as { message?: string })?.message ??
          "Tạo báo cáo thành công"
      );
      invalidateAllAfterMutation(queryClient);
    },
    onError: (error) => {
      toast.error(error.message || "Tạo báo cáo thất bại");
    },
  });
}

export function useUpdateMarketingExpense() {
  const queryClient = useQueryClient();

  return useMutation<
    MarketingExpenseResponse,
    Error,
    { id: string; data: Partial<MarketingExpense> }
  >({
    mutationFn: ({ id, data }) => updateMarketingExpenseApi(id, data),
    onSuccess: (data, variables) => {
      toast.success(
        (data as unknown as { message?: string })?.message ??
          "Cập nhật báo cáo thành công"
      );
      invalidateAllAfterMutation(queryClient, variables.id);
    },
    onError: (error) => {
      toast.error(error.message || "Cập nhật báo cáo thất bại");
    },
  });
}

export function useDeleteMarketingExpense() {
  const queryClient = useQueryClient();

  return useMutation<null, Error, string>({
    mutationFn: (id) => deleteMarketingExpenseApi(id),
    onSuccess: (data) => {
      toast.success(
        (data as unknown as { message?: string })?.message ??
          "Xóa báo cáo thành công"
      );
      invalidateAllAfterMutation(queryClient);
    },
    onError: (error) => {
      toast.error(error.message || "Xóa báo cáo thất bại");
    },
  });
}

// ============================================================================
// Workflow mutation hooks (LOCK / REOPEN)
// ============================================================================

export function useLockMarketingExpense() {
  const queryClient = useQueryClient();

  return useMutation<MarketingExpenseResponse, Error, string>({
    mutationFn: (id) => lockMarketingExpenseApi(id),
    onSuccess: (data, id) => {
      toast.success(
        (data as unknown as { message?: string })?.message ??
          "Khóa báo cáo thành công"
      );
      invalidateAllAfterMutation(queryClient, id);
    },
    onError: (error) => {
      toast.error(error.message || "Khóa báo cáo thất bại");
    },
  });
}

export function useReopenMarketingExpense() {
  const queryClient = useQueryClient();

  return useMutation<MarketingExpenseResponse, Error, string>({
    mutationFn: (id) => reopenMarketingExpenseApi(id),
    onSuccess: (data, id) => {
      toast.success(
        (data as unknown as { message?: string })?.message ??
          "Mở lại báo cáo thành công"
      );
      invalidateAllAfterMutation(queryClient, id);
    },
    onError: (error) => {
      toast.error(error.message || "Mở lại báo cáo thất bại");
    },
  });
}

// ============================================================================
// Re-export types
// ============================================================================

export type {
  MarketingExpense,
  MarketingExpenseFilter,
  MarketingExpenseSummary,
  MarketingExpenseResponse,
};

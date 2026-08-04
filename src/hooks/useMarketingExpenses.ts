/**
 * ==================================================
 * MARKETING EXPENSE HOOKS
 * ==================================================
 *
 * Sprint 6.8 — Marketing Expense React Query Hooks.
 *
 * Layer:    React Component  →  Hook  →  API Route
 *
 * Hooks:
 *   Query:
 *     - useMarketingExpenses(filters)   — list (paginated, filterable, sortable)
 *     - useMarketingExpense(id)         — detail (with populated refs)
 *
 *   Mutation:
 *     - useCreateMarketingExpense       — POST   /api/marketing/expenses
 *     - useUpdateMarketingExpense       — PATCH  /api/marketing/expenses/:id
 *     - useDeleteMarketingExpense       — DELETE /api/marketing/expenses/:id
 *
 *   Workflow (transition status — endpoint chưa build ở Sprint 6.7, để Sprint sau):
 *     - useSubmitMarketingExpense       — POST /api/marketing/expenses/:id/submit
 *     - useApproveMarketingExpense      — POST /api/marketing/expenses/:id/approve
 *     - useRejectMarketingExpense       — POST /api/marketing/expenses/:id/reject
 *     - useLockMarketingExpense         — POST /api/marketing/expenses/:id/lock
 *     - useReopenMarketingExpense       — POST /api/marketing/expenses/:id/reopen
 *
 * Query keys (chuẩn hoá):
 *   ["marketing-expenses"]                   — base prefix
 *   ["marketing-expenses", filters]          — list (keyed theo filter)
 *   ["marketing-expense", id]                — detail
 *
 * Invalidate (khi mutation thành công):
 *   CREATE / DELETE              → marketing-expenses + marketing-dashboard
 *   UPDATE                       → marketing-expenses + marketing-expense + marketing-dashboard
 *   SUBMIT / APPROVE / REJECT / LOCK / REOPEN
 *                                  → marketing-expenses + marketing-expense + marketing-dashboard
 *
 * Options:
 *   staleTime: 60s | gcTime: 5min | retry: 2 | refetchOnWindowFocus: false
 *
 * Toasts:
 *   - Mỗi mutation success → `toast.success(message)` lấy từ response backend.
 *   - Mỗi mutation error   → `toast.error(message)`   lấy từ response backend.
 *   - KHÔNG hardcode message (dùng response.message).
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

import { toast } from "@/components/common/feedback/Toast";
import { request } from "@/lib/request";
import { marketingDashboardKeys } from "@/hooks/marketingDashboardKeys";

// ============================================================================
// Query keys (chuẩn hoá cho toàn bộ project)
// ============================================================================

export const marketingExpenseKeys = {
  all: ["marketing-expenses"] as const,
  lists: () => [...marketingExpenseKeys.all, "list"] as const,
  list: (filters: MarketingExpenseFilter) =>
    [...marketingExpenseKeys.lists(), filters] as const,
  details: () => [...marketingExpenseKeys.all, "detail"] as const,
  detail: (id: string) => [...marketingExpenseKeys.details(), id] as const,
};

// ============================================================================
// Response shape từ API (list)
// ============================================================================

/**
 * Response của GET /api/marketing/expenses.
 *
 * Route trả `{ items, total, page, pageSize, totalPages }` — đó là shape
 * thực tế. Interface `MarketingExpenseListResponse` trong `@/types/marketing-expense`
 * dùng `limit` cho tương thích ngược, nên hook định nghĩa shape riêng cho
 * rõ ràng.
 */
export interface MarketingExpenseListPayload {
  items: MarketingExpenseResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Helpers — request wrapper (imported từ @/lib/request — shared toàn project)
// ============================================================================
//
// `request<T>()` đặt tại `src/lib/request.ts` (Sprint 6.8):
//   - Tự gắn `Content-Type: application/json`.
//   - Parse JSON, check `{ success, message, data }` shape.
//   - Throw `Error(message)` nếu fail (message lấy từ backend).
//
// Mọi hook (cũ + mới) nên dùng chung `request<T>()` để:
//   - Tránh duplicate wrapper ở mỗi hook.
//   - Chuẩn hoá cách parse error message từ backend (toast UX đồng nhất).

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
// Workflow API (transition status)
// --------------------------------------------------------------------------

async function postWorkflowAction<TBody = Record<string, unknown>>(
  id: string,
  action: "submit" | "approve" | "reject" | "lock" | "reopen",
  body?: TBody
): Promise<MarketingExpenseResponse> {
  return request<MarketingExpenseResponse>(
    `/api/marketing/expenses/${id}/${action}`,
    {
      method: "POST",
      body,
    }
  );
}

const submitMarketingExpenseApi = (id: string) =>
  postWorkflowAction(id, "submit");

const approveMarketingExpenseApi = (id: string) =>
  postWorkflowAction(id, "approve");

const rejectMarketingExpenseApi = (id: string, rejectionReason: string) =>
  postWorkflowAction(id, "reject", { rejectionReason });

const lockMarketingExpenseApi = (id: string) =>
  postWorkflowAction(id, "lock");

const reopenMarketingExpenseApi = (id: string) =>
  postWorkflowAction(id, "reopen");

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
  // List / detail (project-wide convention).
  void queryClient.invalidateQueries({
    queryKey: marketingExpenseKeys.all,
  });
  if (id) {
    void queryClient.invalidateQueries({
      queryKey: marketingExpenseKeys.detail(id),
    });
  }

  // Marketing dashboard — dùng canonical key từ `marketingDashboardKeys`
  // (Sprint 6.8). Đây là 1 source of truth duy nhất, sẽ được migrate bởi
  // Sprint 7.1 (sửa `useMarketingDashboard.ts` cũ đang dùng
  // `["marketing", "dashboard"]`).
  void queryClient.invalidateQueries({
    queryKey: marketingDashboardKeys.all,
  });
}

// ============================================================================
// Query hooks
// ============================================================================

/**
 * List marketing expense reports.
 *
 * Trả về `{ data, expenses, total, page, pageSize, totalPages, loading,
 * error, refetch }`.
 *
 * Dùng cho table + filter bar trên UI list page.
 */
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

/**
 * Detail của 1 report.
 *
 * `id = null` → query không chạy (`enabled: false`).
 */
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

// ============================================================================
// CRUD mutation hooks
// ============================================================================

/**
 * Tạo mới report (status = DRAFT).
 *
 * Invalidate: `marketing-expenses` (list) + `marketing-dashboard`.
 * Toast: success/error message lấy từ response backend.
 */
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

/**
 * Cập nhật report (chỉ DRAFT / REOPENED / REJECTED).
 *
 * Invalidate: `marketing-expenses` + `marketing-expense` + `marketing-dashboard`.
 */
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

/**
 * Soft-delete report (chỉ DRAFT / REOPENED / REJECTED).
 *
 * Invalidate: `marketing-expenses` + `marketing-dashboard`.
 */
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
// Workflow mutation hooks
// ============================================================================

/**
 * Submit report (DRAFT / REOPENED / REJECTED → SUBMITTED).
 */
export function useSubmitMarketingExpense() {
  const queryClient = useQueryClient();

  return useMutation<MarketingExpenseResponse, Error, string>({
    mutationFn: (id) => submitMarketingExpenseApi(id),
    onSuccess: (data, id) => {
      toast.success(
        (data as unknown as { message?: string })?.message ??
          "Nộp báo cáo thành công"
      );
      invalidateAllAfterMutation(queryClient, id);
    },
    onError: (error) => {
      toast.error(error.message || "Nộp báo cáo thất bại");
    },
  });
}

/**
 * Approve report (SUBMITTED → APPROVED).
 */
export function useApproveMarketingExpense() {
  const queryClient = useQueryClient();

  return useMutation<MarketingExpenseResponse, Error, string>({
    mutationFn: (id) => approveMarketingExpenseApi(id),
    onSuccess: (data, id) => {
      toast.success(
        (data as unknown as { message?: string })?.message ??
          "Duyệt báo cáo thành công"
      );
      invalidateAllAfterMutation(queryClient, id);
    },
    onError: (error) => {
      toast.error(error.message || "Duyệt báo cáo thất bại");
    },
  });
}

/**
 * Reject report (SUBMITTED → REJECTED) — cần `rejectionReason`.
 */
export function useRejectMarketingExpense() {
  const queryClient = useQueryClient();

  return useMutation<
    MarketingExpenseResponse,
    Error,
    { id: string; rejectionReason: string }
  >({
    mutationFn: ({ id, rejectionReason }) =>
      rejectMarketingExpenseApi(id, rejectionReason),
    onSuccess: (data, variables) => {
      toast.success(
        (data as unknown as { message?: string })?.message ??
          "Từ chối báo cáo thành công"
      );
      invalidateAllAfterMutation(queryClient, variables.id);
    },
    onError: (error) => {
      toast.error(error.message || "Từ chối báo cáo thất bại");
    },
  });
}

/**
 * Lock report (APPROVED → LOCKED).
 */
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

/**
 * Reopen report (LOCKED → REOPENED) — mở lại để chỉnh sửa.
 */
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
// Re-export types (cho UI/page sử dụng chung)
// ============================================================================

export type {
  MarketingExpense,
  MarketingExpenseFilter,
  MarketingExpenseSummary,
  MarketingExpenseResponse,
};
/**
 * ==================================================
 * CUSTOMER HOOKS
 * ==================================================
 *
 * Sprint 8.0 — Customer Module Foundation
 *
 * React Query hooks for Customer module.
 */

import { useMemo } from "react";
import { useQueries, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type {
  CustomerFilter,
  CustomerListResponse,
  CustomerResponse,
  CustomerStatistics,
  CreateCustomerInput,
  UpdateCustomerInput,
} from "@/types/customer";
import type { OrderListItem } from "@/types/order";

// ============================================================================
// Customer Lookup (Reusable)
// ============================================================================

export interface CustomerLookupResult {
  customer: CustomerResponse | null;
  orders: {
    items: OrderListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  statistics: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    lastOrderDate: string | null;
    firstOrderDate: string | null;
  };
}

export interface CustomerLookupParams {
  phone?: string;
  keyword?: string;
  page?: number;
  limit?: number;
}

async function fetchCustomerLookup(
  params: CustomerLookupParams
): Promise<CustomerLookupResult> {
  const searchParams = new URLSearchParams();
  if (params.phone) searchParams.set("phone", params.phone);
  if (params.keyword) searchParams.set("keyword", params.keyword);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const response = await api.get(
    `/api/customers/lookup${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
  );
  return response.data.data;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchCustomerList(params: CustomerFilter): Promise<CustomerListResponse> {
  const searchParams = new URLSearchParams();

  if (params.keyword) searchParams.set("keyword", params.keyword);
  if (params.status) searchParams.set("status", params.status);
  if (params.saleEmployeeId) searchParams.set("saleEmployeeId", params.saleEmployeeId);
  if (params.marketingEmployeeId) searchParams.set("marketingEmployeeId", params.marketingEmployeeId);
  if (params.facebookPageId) searchParams.set("facebookPageId", params.facebookPageId);
  if (params.campaignId) searchParams.set("campaignId", params.campaignId);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.sortField) searchParams.set("sortField", params.sortField);
  if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

  const url = `/api/customers${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const response = await api.get(url);
  return response.data.data;
}

async function fetchCustomer(id: string): Promise<CustomerResponse> {
  const response = await api.get(`/api/customers/${id}`);
  return response.data.data;
}

async function fetchCustomerStatistics(id: string): Promise<CustomerStatistics> {
  const response = await api.get(`/api/customers/${id}/statistics`);
  return response.data.data;
}

async function createCustomer(input: CreateCustomerInput): Promise<CustomerResponse> {
  const response = await api.post("/api/customers", input);
  return response.data.data;
}

async function updateCustomer(
  id: string,
  input: UpdateCustomerInput
): Promise<CustomerResponse> {
  const response = await api.patch(`/api/customers/${id}`, input);
  return response.data.data;
}

async function deleteCustomer(id: string): Promise<void> {
  await api.delete(`/api/customers/${id}`);
}

// ============================================================================
// Hooks
// ============================================================================

export function useCustomers(params: CustomerFilter = {}) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: () => fetchCustomerList(params),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch a single customer by ID
 */
export function useCustomer(id: string | null) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<CustomerResponse, Error>({
    queryKey: ["customer", id],
    queryFn: () => fetchCustomer(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    data,
    customer: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

/**
 * Hook to fetch customer statistics
 */
export function useCustomerStatistics(id: string | null) {
  const {
    data,
    isLoading,
    error,
  } = useQuery<CustomerStatistics, Error>({
    queryKey: ["customer", id, "statistics"],
    queryFn: () => fetchCustomerStatistics(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  return {
    data,
    statistics: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
  };
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCustomerInput }) =>
      updateCustomer(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", variables.id] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

/**
 * Reusable hook: Look up a customer + their order history.
 *
 * Pass `phone` for exact-match lookup (preferred), or `keyword`
 * for fuzzy fallback. Used by Marketing Input's "Check customer"
 * feature and any other entry-point that needs to see if a phone
 * already exists in the system.
 */
export function useCustomerLookup(
  params: CustomerLookupParams,
  options: { enabled?: boolean } = {}
) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<CustomerLookupResult, Error>({
    queryKey: ["customer-lookup", params],
    queryFn: () => fetchCustomerLookup(params),
    enabled:
      options.enabled !== false && Boolean(params.phone || params.keyword),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    data: data ?? null,
    result: data ?? null,
    loading: isLoading,
    fetching: isFetching,
    error: error?.message ?? null,
    refetch,
  };
}

// ============================================================================
// Batch Customer Lookup (MarketingInput — check all staged leads)
// ============================================================================

export interface BatchLookupItemResult {
  /** Index trong mảng phones gốc (để map lại kết quả). */
  index: number;
  /** Số điện thoại đã lookup (input). */
  phone: string;
  /** Có trong hệ thống không. */
  found: boolean;
  /** Kết quả lookup (null nếu không tìm thấy). */
  result: CustomerLookupResult | null;
  loading: boolean;
  error: string | null;
}

export interface UseBatchCustomerLookupResult {
  items: BatchLookupItemResult[];
  loading: boolean;
  /** True khi tất cả các query đã settle (kể cả failed). */
  settled: boolean;
  /** Tổng kết nhanh. */
  summary: {
    total: number;
    found: number;
    notFound: number;
    withOrders: number;
    failed: number;
  };
}

/**
 * Tra cứu nhiều SĐT song song bằng cách dùng `useQueries` từ React Query
 * (cùng queryKey như hook đơn → tận dụng cache + dedupe).
 *
 * Best-effort: nếu 1 SĐT fail, các SĐT khác vẫn trả về bình thường.
 */
export function useBatchCustomerLookup(
  phones: string[],
  options: { enabled?: boolean; limit?: number } = {}
): UseBatchCustomerLookupResult {
  const { enabled = true, limit = 5 } = options;

  // Dedupe + giữ thứ tự ổn định
  const uniquePhones = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const raw of phones) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = trimmed.replace(/[\s.-]/g, "");
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(trimmed);
      }
    }
    return ordered;
  }, [phones]);

  const results = useQueries({
    queries: uniquePhones.map((phone) => ({
      queryKey: [
        "customer-lookup",
        { phone, limit },
      ] as const,
      queryFn: () => fetchCustomerLookup({ phone, limit }),
      enabled: enabled && Boolean(phone),
      staleTime: 30 * 1000,
      gcTime: 2 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    })),
  });

  return useMemo(() => {
    const items: BatchLookupItemResult[] = uniquePhones.map((phone, index) => {
      const r = results[index];
      return {
        index,
        phone,
        found: Boolean(r.data?.customer),
        result: r.data ?? null,
        loading: Boolean(r.isLoading) || Boolean(r.isFetching),
        error: r.error ? (r.error as Error).message : null,
      };
    });

    const loading = results.some((r) => r.isLoading || r.isFetching);
    const settled =
      !loading && results.every((r) => r.data !== undefined || r.error !== null);

    const found = items.filter((i) => i.found).length;
    const notFound = items.length - found;
    const withOrders = items.filter(
      (i) => i.result && (i.result.statistics?.totalOrders ?? 0) > 0
    ).length;
    const failed = items.filter((i) => i.error).length;

    return {
      items,
      loading,
      settled,
      summary: { total: items.length, found, notFound, withOrders, failed },
    };
  }, [uniquePhones, results]);
}

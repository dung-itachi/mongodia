/**
 * ==================================================
 * CUSTOMER HOOKS
 * ==================================================
 *
 * Sprint 8.0 — Customer Module Foundation
 *
 * React Query hooks for Customer module.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type {
  CustomerFilter,
  CustomerListResponse,
  CustomerResponse,
  CustomerStatistics,
  CreateCustomerInput,
  UpdateCustomerInput,
} from "@/types/customer";

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

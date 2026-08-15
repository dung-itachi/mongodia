/**
 * Order Hooks (Sprint 6.0 — Order Module Foundation)
 * Sprint 6.2 — Order Workflow
 *
 * React Query hooks for Order management.
 * Includes: useOrders, useOrder, useCreateOrder, useUpdateOrder, useDeleteOrder, useChangeOrderStatus
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type {
  OrderListItem,
  OrderDetail,
  OrderListResponse,
  OrderFilter,
  CreateOrderInput,
  UpdateOrderInput,
} from "@/types/order";

// ============================================================================
// API Functions
// ============================================================================

async function fetchOrders(filters: OrderFilter): Promise<OrderListResponse> {
  const params = new URLSearchParams();

  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.status) params.set("status", filters.status);
  if (filters.orderType) params.set("orderType", filters.orderType);
  if (filters.orderSource) params.set("orderSource", filters.orderSource);
  if (filters.saleEmployeeId) params.set("saleEmployeeId", filters.saleEmployeeId);
  if (filters.marketingEmployeeId) params.set("marketingEmployeeId", filters.marketingEmployeeId);
  if (filters.customerId) params.set("customerId", filters.customerId);
  if (filters.warehouseId) params.set("warehouseId", filters.warehouseId);
  if (filters.revenueLocked !== undefined) params.set("revenueLocked", String(filters.revenueLocked));
  if (filters.dateFrom) params.set("createdFrom", filters.dateFrom);
  if (filters.dateTo) params.set("createdTo", filters.dateTo);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.order) params.set("order", filters.order);

  const queryString = params.toString();
  const url = `/api/orders${queryString ? `?${queryString}` : ""}`;

  const response = await api.get(url);
  return response.data.data;
}

async function fetchOrder(id: string): Promise<OrderDetail> {
  const response = await api.get(`/api/orders/${id}`);
  return response.data.data;
}

async function createOrder(data: CreateOrderInput): Promise<OrderListItem> {
  const response = await api.post("/api/orders", data);
  return response.data.data;
}

async function updateOrder(
  id: string,
  data: UpdateOrderInput
): Promise<OrderListItem> {
  const response = await api.patch(`/api/orders/${id}`, data);
  return response.data.data;
}

async function deleteOrder(id: string): Promise<void> {
  const response = await api.delete(`/api/orders/${id}`);
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to delete order");
  }
}

interface ChangeStatusInput {
  status: string;
  note?: string;
}

async function changeOrderStatus(
  id: string,
  data: ChangeStatusInput
): Promise<OrderListItem> {
  const response = await api.patch(`/api/orders/${id}/status`, data);
  return response.data.data;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch paginated list of orders
 */
export function useOrders(filters: OrderFilter = {}) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<OrderListResponse, Error>({
    queryKey: ["orders", filters],
    queryFn: () => fetchOrders(filters),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return {
    data: data ?? null,
    orders: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    totalPages: data?.totalPages ?? 1,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

/**
 * Hook to fetch a single order by ID
 */
export function useOrder(id: string | null) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<OrderDetail, Error>({
    queryKey: ["order", id],
    queryFn: () => fetchOrder(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return {
    data: data ?? null,
    order: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

/**
 * Hook to create a new order
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrderInput) => createOrder(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

/**
 * Hook to update an existing order
 */
export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderInput }) =>
      updateOrder(id, data),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({
        queryKey: ["order", variables.id],
      });
    },
  });
}

/**
 * Hook to delete an order
 */
export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteOrder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

/**
 * Hook to change order status
 * Sprint 6.2: Order Workflow
 */
export function useChangeOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChangeStatusInput }) =>
      changeOrderStatus(id, data),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({
        queryKey: ["order", variables.id],
      });
    },
  });
}

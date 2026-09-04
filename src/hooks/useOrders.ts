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
  OrderStatisticsResponse,
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
  if (filters.isReconciled !== undefined) params.set("isReconciled", String(filters.isReconciled));

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

/**
 * Toggle cờ "đã gọi xác nhận" của Order (Sprint — Confirm-call gate).
 *
 * PATCH /api/orders/:id/confirm-call
 * Body (optional): { value: boolean }. Nếu bỏ trống → server toggle.
 */
interface ToggleConfirmCallInput {
  id: string;
  value?: boolean;
}

async function toggleOrderConfirmCall(
  id: string,
  data: { value?: boolean } = {}
): Promise<OrderListItem> {
  const response = await api.patch(`/api/orders/${id}/confirm-call`, data);
  return response.data.data;
}

export function useToggleOrderConfirmCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, value }: ToggleConfirmCallInput) =>
      toggleOrderConfirmCall(id, value === undefined ? {} : { value }),
    // Optimistic update để UI phản hồi tức thì trước khi server trả về.
    onMutate: async ({ id, value }) => {
      await queryClient.cancelQueries({ queryKey: ["orders"] });
      const snapshots = queryClient.getQueriesData<OrderListResponse>({
        queryKey: ["orders"],
      });
      queryClient.setQueriesData<OrderListResponse>(
        { queryKey: ["orders"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item._id === id
                ? {
                    ...item,
                    isCalledForConfirmation:
                      typeof value === "boolean"
                        ? value
                        : !(item.isCalledForConfirmation ?? false),
                  }
                : item
            ),
          };
        }
      );
      return { snapshots };
    },
    onError: (_err, _variables, context) => {
      // Rollback nếu server lỗi.
      if (context?.snapshots) {
        for (const [key, snap] of context.snapshots) {
          queryClient.setQueryData(key, snap);
        }
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({
        queryKey: ["order", variables.id],
      });
    },
  });
}

// ============================================================================
// Order Statistics (Sprint — popup "Thống kê đơn hàng")
// ============================================================================

/**
 * Filter input cho GET /api/orders/statistics.
 * Tất cả field đều optional — caller có thể gửi filter rỗng
 * để lấy thống kê toàn bộ đơn.
 */
export type OrderStatisticsFilter = Partial<
  Pick<
    OrderFilter,
    | "keyword"
    | "status"
    | "orderType"
    | "orderSource"
    | "warehouseId"
    | "saleEmployeeId"
    | "marketingEmployeeId"
    | "dateFrom"
    | "dateTo"
  >
>;

/**
 * Gọi API thống kê đơn hàng. Khác với useOrders ở chỗ:
 * - KHÔNG auto-fetch (chỉ fetch khi user click nút "Thống kê").
 * - Trả về số liệu aggregate, không trả danh sách.
 *
 * @example
 *   const stats = useOrderStatistics();
 *   const handleOpenStats = async () => {
 *     const data = await stats.mutateAsync({
 *       keyword, status, dateFrom, dateTo,
 *     });
 *     setStatsData(data);
 *     setOpenStatsModal(true);
 *   };
 */
async function fetchOrderStatistics(
  filter: OrderStatisticsFilter = {}
): Promise<OrderStatisticsResponse> {
  const params = new URLSearchParams();

  if (filter.keyword) params.set("keyword", filter.keyword);
  if (filter.status) params.set("status", filter.status);
  if (filter.orderType) params.set("orderType", filter.orderType);
  if (filter.orderSource) params.set("orderSource", filter.orderSource);
  if (filter.warehouseId) params.set("warehouseId", filter.warehouseId);
  if (filter.saleEmployeeId) params.set("saleEmployeeId", filter.saleEmployeeId);
  if (filter.marketingEmployeeId)
    params.set("marketingEmployeeId", filter.marketingEmployeeId);
  if (filter.dateFrom) params.set("createdFrom", filter.dateFrom);
  if (filter.dateTo) params.set("createdTo", filter.dateTo);

  const queryString = params.toString();
  const url = `/api/orders/statistics${queryString ? `?${queryString}` : ""}`;

  const response = await api.get(url);
  return response.data.data as OrderStatisticsResponse;
}

/**
 * Hook dạng mutation để fetch thống kê đơn hàng theo filter hiện tại.
 *
 * Lưu ý quan trọng: vì dùng useMutation nên KHÔNG tự gọi API khi mount.
 * Phù hợp với UX "click nút mới gọi API".
 */
export function useOrderStatistics() {
  return useMutation<OrderStatisticsResponse, Error, OrderStatisticsFilter>({
    mutationFn: (filter) => fetchOrderStatistics(filter),
  });
}

export interface AdjustOrderRevenueInput {
  id: string;
  marketingRevenue: number;
  saleRevenue: number;
  note?: string;
}

async function adjustOrderRevenue({ id, marketingRevenue, saleRevenue, note }: AdjustOrderRevenueInput): Promise<OrderListItem> {
  const response = await api.patch(`/api/orders/${id}/revenue`, { marketingRevenue, saleRevenue, note });
  return response.data.data;
}

export function useAdjustOrderRevenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AdjustOrderRevenueInput) => adjustOrderRevenue(data),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["order", variables.id] });
      void queryClient.invalidateQueries({ queryKey: ["marketing-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["sales-kpi"] });
    },
  });
}


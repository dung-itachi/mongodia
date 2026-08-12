/**
 * Warehouse Shipments Hook (Sprint Warehouse UI)
 *
 * Hook for fetching orders assigned to warehouses for shipment processing.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { OrderListItem, OrderDetail } from "@/types/order";

export type ShipmentItem = {
  itemType: "PRODUCT" | "GIFT";
  productId?: string;
  variantId?: string;
  giftId?: string;
  quantity: number;
};

export type ShipmentPayload = {
  items?: ShipmentItem[];
  note?: string;
};

export type ReturnPayload = {
  items: ShipmentItem[];
  note?: string;
};

interface WarehouseOrdersResponse {
  items: OrderListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function fetchWarehouseOrders(warehouseId?: string, keyword?: string): Promise<WarehouseOrdersResponse> {
  const params = new URLSearchParams();
  if (warehouseId) params.set("warehouseId", warehouseId);
  if (keyword) params.set("keyword", keyword);
  params.set("limit", "100");

  const response = await api.get(`/api/warehouse/orders?${params.toString()}`);
  return response.data.data;
}

async function fetchOrderDetail(orderId: string): Promise<OrderDetail> {
  const response = await api.get(`/api/orders/${orderId}`);
  return response.data.data;
}

async function shipOrder(orderId: string, payload: ShipmentPayload): Promise<unknown> {
  const response = await api.post(`/api/warehouse/orders/${orderId}/ship`, payload);
  return response.data.data;
}

async function returnOrder(orderId: string, payload: ReturnPayload): Promise<unknown> {
  const response = await api.post(`/api/warehouse/orders/${orderId}/return`, payload);
  return response.data.data;
}

export function useWarehouseOrders(warehouseId?: string, keyword?: string) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["warehouse-orders", warehouseId, keyword],
    queryFn: () => fetchWarehouseOrders(warehouseId, keyword),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: false,
  });

  return {
    orders: data?.items ?? [],
    total: data?.total ?? 0,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

export function useOrderDetail(orderId: string | null) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<OrderDetail | null>({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrderDetail(orderId!),
    enabled: !!orderId,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: false,
  });

  return {
    order: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

export function useShipOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: ShipmentPayload }) =>
      shipOrder(orderId, payload),
    onSuccess: (_result, variables) => {
      void qc.invalidateQueries({ queryKey: ["warehouse-orders"] });
      void qc.invalidateQueries({ queryKey: ["order", variables.orderId] });
      void qc.invalidateQueries({ queryKey: ["orders"] });
      void qc.invalidateQueries({ queryKey: ["warehouse-inventory"] });
      void qc.invalidateQueries({ queryKey: ["warehouse-movements"] });
    },
  });
}

export function useReturnOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: ReturnPayload }) =>
      returnOrder(orderId, payload),
    onSuccess: (_result, variables) => {
      void qc.invalidateQueries({ queryKey: ["warehouse-orders"] });
      void qc.invalidateQueries({ queryKey: ["order", variables.orderId] });
      void qc.invalidateQueries({ queryKey: ["orders"] });
      void qc.invalidateQueries({ queryKey: ["warehouse-inventory"] });
      void qc.invalidateQueries({ queryKey: ["warehouse-movements"] });
    },
  });
}

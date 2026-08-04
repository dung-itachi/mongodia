/**
 * ==================================================
 * INVENTORY HOOKS
 * ==================================================
 *
 * Sprint 6.4 — Inventory Movement
 *
 * React Query hooks for Inventory Movements.
 */

import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

export interface InventoryMovementItem {
  _id: string;
  warehouseId: string;
  orderId: string;
  warehouseTaskId: string;
  productVariantId: string | null;
  sku: string;
  productName: string;
  quantity: number;
  type: string;
  employeeId: string;
  note: string | null;
  createdAt: string;
}

export interface InventoryMovementListResponse {
  movements: InventoryMovementItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InventoryMovementFilters {
  page?: number;
  limit?: number;
  warehouseId?: string;
  orderId?: string;
  warehouseTaskId?: string;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchInventoryMovements(
  filters: InventoryMovementFilters
): Promise<InventoryMovementListResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.warehouseId) params.set("warehouseId", filters.warehouseId);
  if (filters.orderId) params.set("orderId", filters.orderId);
  if (filters.warehouseTaskId) params.set("warehouseTaskId", filters.warehouseTaskId);

  const queryString = params.toString();
  const url = `/api/inventory/movements${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch inventory movements");
  }

  return result.data;
}

async function fetchTaskInventoryMovements(taskId: string): Promise<{ movements: InventoryMovementItem[]; total: number }> {
  const response = await fetch(`/api/warehouse/tasks/${taskId}/inventory`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch task inventory movements");
  }

  return result.data;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch paginated list of inventory movements
 */
export function useInventoryMovements(filters: InventoryMovementFilters = {}) {
  const { data, isLoading, error, refetch } = useQuery<
    InventoryMovementListResponse,
    Error
  >({
    queryKey: ["inventory-movements", filters],
    queryFn: () => fetchInventoryMovements(filters),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return {
    data: data ?? null,
    movements: data?.movements ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    totalPages: data?.totalPages ?? 1,
    loading: isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch inventory movements for a warehouse task
 */
export function useTaskInventoryMovements(taskId: string | null) {
  const { data, isLoading, error, refetch } = useQuery<
    { movements: InventoryMovementItem[]; total: number },
    Error
  >({
    queryKey: ["warehouse-task-inventory", taskId],
    queryFn: () => fetchTaskInventoryMovements(taskId!),
    enabled: !!taskId,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return {
    movements: data?.movements ?? [],
    total: data?.total ?? 0,
    loading: isLoading,
    error,
    refetch,
  };
}
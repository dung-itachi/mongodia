/**
 * ==================================================
 * WAREHOUSE HOOKS
 * ==================================================
 *
 * Sprint 6.3 — Warehouse Integration
 *
 * React Query hooks for Warehouse Task management.
 */

// ============================================================================
// Types
// ============================================================================

export interface WarehouseTaskListItem {
  _id: string;
  orderId: string;
  warehouseStatus: string;
  assignedEmployeeId: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseTaskDetail extends WarehouseTaskListItem {
  order?: unknown;
}

export interface WarehouseHistoryItem {
  _id: string;
  warehouseTaskId: string;
  employeeId: string;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
  createdAt: string;
}

export interface WarehouseTaskListResponse {
  tasks: WarehouseTaskListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface WarehouseTaskDetailResponse {
  task: WarehouseTaskDetail;
  histories: WarehouseHistoryItem[];
}

export interface WarehouseTaskFilters {
  page?: number;
  limit?: number;
  status?: string;
  assignedEmployeeId?: string;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchWarehouseTasks(
  filters: WarehouseTaskFilters
): Promise<WarehouseTaskListResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.status) params.set("status", filters.status);
  if (filters.assignedEmployeeId) params.set("assignedEmployeeId", filters.assignedEmployeeId);

  const queryString = params.toString();
  const url = `/api/warehouse/tasks${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch warehouse tasks");
  }

  return result.data;
}

async function fetchWarehouseTask(id: string): Promise<WarehouseTaskDetailResponse> {
  const response = await fetch(`/api/warehouse/tasks/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch warehouse task");
  }

  return result.data;
}

interface ChangeStatusInput {
  status: string;
  note?: string;
}

async function changeWarehouseStatus(
  id: string,
  data: ChangeStatusInput
): Promise<WarehouseTaskListItem> {
  const response = await fetch(`/api/warehouse/tasks/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to change warehouse status");
  }

  return result.data;
}

interface AssignInput {
  employeeId: string;
  note?: string;
}

async function assignWarehouseTask(
  id: string,
  data: AssignInput
): Promise<WarehouseTaskListItem> {
  const response = await fetch(`/api/warehouse/tasks/${id}/assign`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to assign warehouse task");
  }

  return result.data;
}

// ============================================================================
// Hooks
// ============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook to fetch paginated list of warehouse tasks
 */
export function useWarehouseTasks(filters: WarehouseTaskFilters = {}) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<WarehouseTaskListResponse, Error>({
    queryKey: ["warehouse-tasks", filters],
    queryFn: () => fetchWarehouseTasks(filters),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return {
    data: data ?? null,
    tasks: data?.tasks ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    totalPages: data?.totalPages ?? 1,
    loading: isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch single warehouse task with details
 */
export function useWarehouseTask(id: string | null) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<WarehouseTaskDetailResponse, Error>({
    queryKey: ["warehouse-task", id],
    queryFn: () => fetchWarehouseTask(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return {
    data: data ?? null,
    task: data?.task ?? null,
    histories: data?.histories ?? [],
    loading: isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to change warehouse task status
 */
export function useChangeWarehouseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChangeStatusInput }) =>
      changeWarehouseStatus(id, data),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["warehouse-tasks"] });
      void queryClient.invalidateQueries({
        queryKey: ["warehouse-task", variables.id],
      });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
      void queryClient.invalidateQueries({
        queryKey: ["warehouse-task-inventory", variables.id],
      });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

/**
 * Hook to assign employee to warehouse task
 */
export function useAssignWarehouseTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignInput }) =>
      assignWarehouseTask(id, data),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["warehouse-tasks"] });
      void queryClient.invalidateQueries({
        queryKey: ["warehouse-task", variables.id],
      });
    },
  });
}

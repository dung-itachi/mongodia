/**
 * ==================================================
 * CUSTOMER ACTIVITY HOOKS
 * ==================================================
 *
 * Sprint 8.1 — Customer Timeline & CRM Activities
 *
 * React Query hooks for Customer Activity module.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CustomerActivityFilter,
  CustomerActivityListResponse,
  CustomerActivityResponse,
  CreateCustomerActivityInput,
  UpdateCustomerActivityInput,
  FollowUpStats,
} from "@/types/customer-activity";

// ============================================================================
// API Functions
// ============================================================================

async function fetchCustomerActivities(
  customerId: string,
  params: CustomerActivityFilter
): Promise<CustomerActivityListResponse> {
  const searchParams = new URLSearchParams();

  if (params.keyword) searchParams.set("keyword", params.keyword);
  if (params.activityType) searchParams.set("activityType", params.activityType);
  if (params.result) searchParams.set("result", params.result);
  if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.sortField) searchParams.set("sortField", params.sortField);
  if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

  const url = `/api/customers/${customerId}/activities${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Không thể lấy danh sách hoạt động");
  }

  return data.data;
}

async function fetchActivity(id: string): Promise<CustomerActivityResponse> {
  const response = await fetch(`/api/customer-activities/${id}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Không thể lấy hoạt động");
  }

  return data.data;
}

async function fetchFollowUpStats(): Promise<FollowUpStats> {
  const response = await fetch("/api/customer-activities/stats");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Không thể lấy thống kê");
  }

  return data.data;
}

async function createActivity(
  customerId: string,
  input: CreateCustomerActivityInput
): Promise<CustomerActivityResponse> {
  const response = await fetch(`/api/customers/${customerId}/activities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Không thể tạo hoạt động");
  }

  return data.data;
}

async function updateActivity(
  id: string,
  input: UpdateCustomerActivityInput
): Promise<CustomerActivityResponse> {
  const response = await fetch(`/api/customer-activities/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Không thể cập nhật hoạt động");
  }

  return data.data;
}

async function deleteActivity(id: string): Promise<void> {
  const response = await fetch(`/api/customer-activities/${id}`, {
    method: "DELETE",
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Không thể xóa hoạt động");
  }
}

// ============================================================================
// Hooks
// ============================================================================

export function useCustomerActivities(
  customerId: string,
  params: CustomerActivityFilter = {}
) {
  return useQuery({
    queryKey: ["customer-activities", customerId, params],
    queryFn: () => fetchCustomerActivities(customerId, params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCustomerActivity(id: string | null) {
  return useQuery({
    queryKey: ["customer-activity", id],
    queryFn: () => fetchActivity(id!),
    enabled: !!id,
  });
}

export function useFollowUpStats() {
  return useQuery({
    queryKey: ["follow-up-stats"],
    queryFn: fetchFollowUpStats,
    staleTime: 60 * 1000,
  });
}

export function useCreateCustomerActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, input }: { customerId: string; input: CreateCustomerActivityInput }) =>
      createActivity(customerId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customer-activities", variables.customerId] });
    },
  });
}

export function useUpdateCustomerActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCustomerActivityInput }) =>
      updateActivity(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customer-activity", variables.id] });
    },
  });
}

export function useDeleteCustomerActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-activities"] });
    },
  });
}

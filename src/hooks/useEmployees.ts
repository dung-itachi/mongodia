"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

export type EmployeeListItem = {
  _id: string;
  employeeCode: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  avatar?: string;
  isActive?: boolean;
  role?: { code: string; name: string };
  team?: { code: string; name: string };
};

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };
async function fetchEnvelope<T>(response: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const { data } = await response;
  if (!data.success) throw new Error(data.message ?? "Yêu cầu thất bại");
  return data.data;
}

type ListResponse<T> = { items: T[]; total: number };

export function useEmployees(filters: { search?: string; role?: string; isActive?: boolean; pageSize?: number } = {}) {
  const query = new URLSearchParams();
  if (filters.search) query.set("keyword", filters.search);
  if (filters.role) query.set("role", filters.role);
  if (filters.isActive !== undefined) query.set("isActive", String(filters.isActive));
  if (filters.pageSize) query.set("pageSize", String(filters.pageSize));
  return useQuery<EmployeeListItem[]>({
    queryKey: ["employees", filters],
    queryFn: async () => {
      const data = await fetchEnvelope<ListResponse<EmployeeListItem>>(
        api.get<ApiEnvelope<ListResponse<EmployeeListItem>>>(`/api/employees?${query.toString()}`)
      );
      return data.items;
    },
    staleTime: 30_000,
    retry: false,
  });
}
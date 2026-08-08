"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

export type Department = {
  _id: string;
  code: string;
  name: string;
  isActive?: boolean;
};

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };
async function fetchEnvelope<T>(response: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const { data } = await response;
  if (!data.success) throw new Error(data.message ?? "Yêu cầu thất bại");
  return data.data;
}

type ListResponse<T> = { items: T[]; total: number };

export function useDepartments() {
  return useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: async () => {
      const data = await fetchEnvelope<ListResponse<Department>>(
        api.get<ApiEnvelope<ListResponse<Department>>>(`/api/departments`)
      );
      return data.items;
    },
    staleTime: 60_000,
  });
}
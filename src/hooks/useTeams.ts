"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

export type Team = {
  _id: string;
  code: string;
  name: string;
  departmentId?: { _id?: string; code?: string; name?: string } | null;
  leaderId?: { _id?: string; fullName?: string } | null;
  managerId?: { _id?: string; fullName?: string } | null;
  isActive?: boolean;
};

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };
async function fetchEnvelope<T>(response: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const { data } = await response;
  if (!data.success) throw new Error(data.message ?? "Yêu cầu thất bại");
  return data.data;
}

type ListResponse<T> = { items: T[]; total: number };

export function useTeams() {
  return useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: async () => {
      const data = await fetchEnvelope<ListResponse<Team>>(
        api.get<ApiEnvelope<ListResponse<Team>>>(`/api/teams?pageSize=100`)
      );
      return data.items;
    },
    staleTime: 60_000,
  });
}
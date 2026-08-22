"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

export type LoginHistoryItem = {
  _id: string;
  employeeId: string;
  employeeCode: string;
  fullName: string;
  username: string;
  avatar: string;
  role: { code: string; name: string } | null;
  team: { _id: string; code: string; name: string } | null;
  area: { _id: string; code: string; name: string } | null;
  ip: string;
  userAgent: string;
  success: boolean;
  loginAt: string;
  createdAt: string;
  updatedAt: string;
  isTrusted: boolean;
  isUnusualIp: boolean;
  isUnusualDevice: boolean;
  isUnusualLocation: boolean;
  anomalyReason: string;
};

export type LoginHistoryList = {
  items: LoginHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type LoginHistoryFilters = {
  employeeId?: string;
  search?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  areaId?: string;
  teamId?: string;
  page?: number;
  pageSize?: number;
};

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

async function fetchEnvelope<T>(response: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const { data } = await response;
  if (!data.success) throw new Error(data.message ?? "Yêu cầu thất bại");
  return data.data;
}

function buildQuery(filters: LoginHistoryFilters): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      if (typeof value === "boolean") {
        params.set(key, value ? "true" : "false");
      } else {
        params.set(key, String(value));
      }
    }
  });
  return params;
}

export function useLoginHistory(filters: LoginHistoryFilters = {}) {
  return useQuery<LoginHistoryList>({
    queryKey: ["login-history", filters],
    queryFn: () =>
      fetchEnvelope<LoginHistoryList>(
        api.get<ApiEnvelope<LoginHistoryList>>(
          `/api/login-history?${buildQuery(filters)}`
        )
      ),
    staleTime: 30_000,
    retry: false,
  });
}

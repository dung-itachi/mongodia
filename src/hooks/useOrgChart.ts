/**
 * useOrgChart Hook
 *
 * Fetches the organization chart payload from the server.
 * Used by the /employees page to render a horizontal org chart.
 *
 * The data is derived on the backend from existing relationships
 * (manager → leader → employee). This hook does NOT mutate anything.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

export type OrgNode = {
  id: string;
  role: string;
  roleLabel: string;
  employeeCode: string;
  fullName: string;
  avatar?: string;
  teamName?: string | null;
  isActive: boolean;
  children: OrgNode[];
  meta: {
    directReports: number;
    totalReports: number;
  };
};

export type OrgChartPayload = {
  root: OrgNode;
  flat: Array<{
    id: string;
    employeeCode: string;
    fullName: string;
    role: string;
    ancestorIds: string[];
  }>;
};

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

async function fetchOrgChart(): Promise<OrgChartPayload> {
  const response = await api.get<ApiEnvelope<OrgChartPayload>>(
    "/api/employees/org-chart"
  );
  if (!response.data.success) {
    throw new Error(response.data.message ?? "Không thể tải sơ đồ tổ chức");
  }
  return response.data.data;
}

export function useOrgChart() {
  return useQuery<OrgChartPayload>({
    queryKey: ["employees", "org-chart"],
    queryFn: fetchOrgChart,
    staleTime: 60_000,
  });
}

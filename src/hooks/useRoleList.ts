"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

/**
 * Phase 9 — React Query hook for the role list.
 *
 * Endpoint:
 *   - GET /api/roles
 *
 * Returns the list of active roles for the Permission Tree sidebar.
 * Note: the existing /api/roles endpoint requires `role.view`; the
 * Permission Tree page additionally gates on `role.permission.manage`.
 * Since ADMIN's wildcard covers both, this is consistent in practice.
 */

export type RoleSummary = {
  _id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  /**
   * Nav groups this role is allowed to see on the sidebar.
   * Empty array means "resolve dynamically" (currently only LEADER
   * uses dynamic resolution based on `Employee.teamId.code`).
   */
  visibleGroups?: string[];
};

export type RoleList = {
  items: RoleSummary[];
  total: number;
};

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

async function fetchEnvelope<T>(
  p: Promise<{ data: ApiEnvelope<T> }>,
): Promise<T> {
  const { data } = await p;
  if (!data.success) throw new Error(data.message ?? "Yêu cầu thất bại");
  return data.data;
}

export function useRoleList() {
  return useQuery<RoleList>({
    queryKey: ["roles"],
    queryFn: () =>
      fetchEnvelope(
        api.get<ApiEnvelope<RoleList>>("/api/roles"),
      ),
    retry: false,
    staleTime: 60_000,
  });
}

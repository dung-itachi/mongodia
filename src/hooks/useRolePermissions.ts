"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import api from "@/lib/axios";

/**
 * Phase 9 — React Query hooks for the Role & Permission Tree API.
 *
 * Endpoints:
 *   - GET  /api/roles/[id]/permissions
 *   - PUT  /api/roles/[id]/permissions
 */

export type RolePermissions = {
  role: {
    _id: string;
    code: string;
    name: string;
    isActive: boolean;
    /**
     * Nav groups this role is allowed to see on the sidebar.
     * Empty array means "resolve dynamically" (Leader only).
     */
    visibleGroups?: string[];
  };
  /**
   * True when the role is granted FULL ACCESS:
   *   - role.code === "ADMIN" (seed-time invariant), OR
   *   - the persisted RolePermission rows include "*" explicitly.
   */
  isWildcard: boolean;
  /** True iff role.code === "ADMIN". Convenience flag for the UI. */
  isAdmin: boolean;
  /**
   * Concrete granted permission codes. Always empty when isWildcard
   * is true — ADMIN is never enumerated.
   */
  grantedCodes: string[];
  /** Convenience counter; -1 when isWildcard is true. */
  totalGranted: number;
};

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

async function fetchEnvelope<T>(p: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const { data } = await p;
  if (!data.success) throw new Error(data.message ?? "Yêu cầu thất bại");
  return data.data;
}

export function useRolePermissions(
  roleId: string | null,
  options?: Omit<UseQueryOptions<RolePermissions>, "queryKey" | "queryFn" | "enabled">,
) {
  return useQuery<RolePermissions>({
    queryKey: ["role-permissions", roleId],
    queryFn: () =>
      fetchEnvelope(
        api.get<ApiEnvelope<RolePermissions>>(
          `/api/roles/${roleId}/permissions`,
        ),
      ),
    enabled: Boolean(roleId),
    retry: false,
    staleTime: 30_000,
    ...options,
  });
}

export type UpdateRolePermissionsInput = {
  roleId: string;
  codes: string[];
  wildcard?: boolean;
};

export function useUpdateRolePermissions() {
  const client = useQueryClient();
  return useMutation<RolePermissions, Error, UpdateRolePermissionsInput>({
    mutationFn: ({ roleId, codes, wildcard }) =>
      fetchEnvelope(
        api.put<ApiEnvelope<RolePermissions>>(
          `/api/roles/${roleId}/permissions`,
          { codes, wildcard },
        ),
      ),
    onSuccess: (data) => {
      void client.invalidateQueries({
        queryKey: ["role-permissions", data.role._id],
      });
      // Roles listing also needs a refresh since the granted count
      // may shift visible ordering.
      void client.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

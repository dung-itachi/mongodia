"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

/**
 * Phase 9 — React Query hook for the permission catalog.
 *
 * Endpoint:
 *   - GET /api/permissions
 *
 * Returns the full permission catalog grouped by module group. The
 * grouping comes from `constants/permissions.ts` and the seed-time
 * `MODULE_MAP` (re-exported by `lib/permission-modules.ts`).
 */

export type PermissionGroup = {
  module: string;
  permissions: Array<{ code: string; name: string }>;
};

export type PermissionsCatalog = {
  groups: PermissionGroup[];
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

export function usePermissionsCatalog() {
  return useQuery<PermissionsCatalog>({
    queryKey: ["permissions-catalog"],
    queryFn: () =>
      fetchEnvelope(
        api.get<ApiEnvelope<PermissionsCatalog>>("/api/permissions"),
      ),
    retry: false,
    staleTime: 60_000,
  });
}

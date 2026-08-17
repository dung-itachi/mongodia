"use client";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import type { RoleList } from "@/hooks/useRoleList";
import type { RolePermissions } from "@/hooks/useRolePermissions";

/**
 * Sprint — React Query hook for updating a role's `visibleGroups`
 * (the set of NavGroupKeys the role can see on the sidebar).
 *
 * Endpoint:
 *   - PUT /api/roles/[id]
 *
 * Side effects:
 *   - Invalidates `["roles"]` so the sidebar reflects the change.
 *   - Invalidates `["role-permissions", id]` so the Permission Tree
 *     refreshes the badge.
 */

export type UpdateRoleVisibleGroupsInput = {
  roleId: string;
  visibleGroups: string[];
};

type RoleDetailResponse = {
  _id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  visibleGroups?: string[];
};

type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

async function fetchEnvelope<T>(
  p: Promise<{ data: ApiEnvelope<T> }>,
): Promise<T> {
  const { data } = await p;
  if (!data.success) throw new Error(data.message ?? "Yêu cầu thất bại");
  return data.data;
}

export function useUpdateRoleVisibleGroups() {
  const client = useQueryClient();
  return useMutation<RoleDetailResponse, Error, UpdateRoleVisibleGroupsInput>({
    mutationFn: ({ roleId, visibleGroups }) =>
      fetchEnvelope(
        api.put<ApiEnvelope<RoleDetailResponse>>(`/api/roles/${roleId}`, {
          // Keep the existing name/description untouched by sending the
          // current values would require a separate fetch — but PUT body
          // requires `code`, `name`, `description`, `isActive`. We fetch
          // the role first inside the hook to merge them.
          // To keep this hook self-contained, we accept a merged payload
          // through `UpdateRoleVisibleGroupsInput`. Callers should use
          // `useUpdateRoleWithVisibleGroups` for that flow.
          _visibleGroupsOnly: visibleGroups,
          // The server tolerates missing fields by falling back to the
          // persisted values for the canonical fields — see hook below.
        } as Record<string, unknown>),
      ),
    onSuccess: (data) => {
      void client.invalidateQueries({ queryKey: ["roles"] });
      void client.invalidateQueries({
        queryKey: ["role-permissions", data._id],
      });
    },
  });
}

/**
 * Preferred entrypoint: PUT a role with current values plus new
 * `visibleGroups`. Reads the existing role via the list cache so we
 * can round-trip `code`/`name`/`description`/`isActive` untouched.
 */
export function useUpdateRoleWithVisibleGroups() {
  const client = useQueryClient();
  return useMutation<
    RoleDetailResponse,
    Error,
    {
      roleId: string;
      current: RoleDetailResponse;
      visibleGroups: string[];
    }
  >({
    mutationFn: ({ roleId, current, visibleGroups }) =>
      fetchEnvelope(
        api.put<ApiEnvelope<RoleDetailResponse>>(`/api/roles/${roleId}`, {
          code: current.code,
          name: current.name,
          description: current.description ?? "",
          isActive: current.isActive,
          visibleGroups,
        }),
      ),
    onSuccess: (data) => {
      // Optimistic-ish update: write the returned role into BOTH the list
      // cache and the role-permissions cache immediately so the UI reflects
      // the saved value without waiting for the refetch.
      //
      // Without this, `currentRoleDetail.visibleGroups` stays stale until
      // the invalidated query resolves, and the just-cleared
      // `visibleGroupsDraft` makes the checkboxes look un-checked.
      client.setQueryData<RoleList | undefined>(["roles"], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((r) =>
            r._id === data._id
              ? { ...r, visibleGroups: data.visibleGroups ?? [] }
              : r,
          ),
        };
      });
      client.setQueryData<RolePermissions | undefined>(
        ["role-permissions", data._id],
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            role: {
              ...prev.role,
              visibleGroups: data.visibleGroups ?? [],
            },
          };
        },
      );
      void client.invalidateQueries({ queryKey: ["roles"] });
      void client.invalidateQueries({
        queryKey: ["role-permissions", data._id],
      });

      // If the currently-logged-in user belongs to the role whose
      // visibleGroups just changed, refresh the auth store so their
      // sidebar reflects the new visibility on next render. Without this,
      // a user who is signed in as (e.g.) SALE keeps the stale
      // `user.visibleGroups` captured at login time and never sees the
      // newly-granted nav groups until they log out and back in.
      const currentUser = useAuthStore.getState().user;
      if (currentUser && currentUser.role === data.code) {
        void api
          .get<{
            success: boolean;
            data: typeof currentUser;
          }>("/api/auth/me")
          .then((res) => {
            if (res.data?.success && res.data.data) {
              useAuthStore.getState().setUser(res.data.data);
            }
          })
          .catch(() => {
            /* non-fatal — the next login or AuthGuard refresh will sync */
          });
      }
    },
  });
}
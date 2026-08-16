/**
 * Notification admin hooks (React Query).
 *
 * Used by the management page (/settings/notifications).
 *
 * Cache strategy:
 *   - `['notifications-admin', 'list', filters, page]` — paginated list.
 *   - Mutations invalidate the entire admin cache so all open tabs/drawers
 *     stay consistent.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import api from "@/lib/axios";
import type {
  CreateNotificationInput,
  NotificationAdminItem,
  NotificationAdminListQuery,
  NotificationAdminPage,
  UpdateNotificationInput,
} from "@/types/notification";

export const notificationAdminKeys = {
  all: ["notifications-admin"] as const,
  list: (q: NotificationAdminListQuery) =>
    ["notifications-admin", "list", q] as const,
};

async function fetchAdminList(
  q: NotificationAdminListQuery
): Promise<NotificationAdminPage> {
  const params = new URLSearchParams();
  params.set("admin", "true");
  if (q.search) params.set("search", q.search);
  if (q.category) params.set("category", q.category);
  if (q.type) params.set("type", q.type);
  if (typeof q.isPinned === "boolean") {
    params.set("isPinned", q.isPinned ? "true" : "false");
  }
  if (q.page) params.set("page", String(q.page));
  if (q.pageSize) params.set("pageSize", String(q.pageSize));

  const res = await api.get(`/api/notifications?${params.toString()}`);
  if (!res.data?.success) {
    throw new Error(res.data?.message ?? "Không thể tải danh sách");
  }
  return res.data.data as NotificationAdminPage;
}

export function useAdminNotificationList(q: NotificationAdminListQuery) {
  return useQuery<NotificationAdminPage, Error>({
    queryKey: notificationAdminKeys.list(q),
    queryFn: () => fetchAdminList(q),
    staleTime: 30_000,
  });
}

export function useCreateNotification() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, Error, CreateNotificationInput>({
    mutationFn: async (input) => {
      const res = await api.post("/api/notifications", input);
      if (!res.data?.success) {
        throw new Error(res.data?.message ?? "Tạo thông báo thất bại");
      }
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationAdminKeys.all });
    },
  });
}

export function useUpdateNotification() {
  const qc = useQueryClient();
  return useMutation<
    { id: string },
    Error,
    { id: string; input: UpdateNotificationInput }
  >({
    mutationFn: async ({ id, input }) => {
      const res = await api.patch(`/api/notifications/${id}`, input);
      if (!res.data?.success) {
        throw new Error(res.data?.message ?? "Cập nhật thất bại");
      }
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationAdminKeys.all });
    },
  });
}

export function useTogglePin() {
  const qc = useQueryClient();
  return useMutation<
    { id: string; isPinned: boolean },
    Error,
    { id: string; isPinned: boolean }
  >({
    mutationFn: async ({ id, isPinned }) => {
      const res = await api.patch(`/api/notifications/${id}`, { isPinned });
      if (!res.data?.success) {
        throw new Error(res.data?.message ?? "Toggle pin thất bại");
      }
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationAdminKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, Error, string>({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/notifications/${id}`);
      if (!res.data?.success) {
        throw new Error(res.data?.message ?? "Xóa thất bại");
      }
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationAdminKeys.all });
    },
  });
}

export type { NotificationAdminItem };

/**
 * Notification hooks (React Query).
 *
 * Cache strategy:
 *   - `['notifications', 'list', filters]` — infinite scroll pages.
 *   - `['notifications', 'unread-count']`   — single number; SSE-pushed.
 *   - `['notifications', 'meta']`           — total count (optional).
 *
 * When an SSE event comes in we *invalidate* the queries so the UI re-fetches
 * the fresh data. The unread-count is updated directly on the store to
 * avoid a round-trip when SSE already provided the number.
 */

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

import api from "@/lib/axios";
import type {
  NotificationItem,
  NotificationListQuery,
  NotificationPage,
  UnreadCount,
} from "@/types/notification";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (filters: NotificationListQuery) =>
    ["notifications", "list", filters] as const,
  unreadCount: () => ["notifications", "unread-count"] as const,
};

async function fetchNotificationsPage(
  filters: NotificationListQuery
): Promise<NotificationPage> {
  const params = new URLSearchParams();
  if (filters.cursor) params.set("cursor", filters.cursor);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.onlyUnread) params.set("onlyUnread", "true");
  if (filters.isActive !== undefined) params.set("isActive", String(filters.isActive));

  const url = params.toString()
    ? `/api/notifications?${params.toString()}`
    : "/api/notifications";
  const res = await api.get(url);
  if (!res.data?.success) {
    throw new Error(res.data?.message ?? "Không thể tải thông báo");
  }
  return res.data.data as NotificationPage;
}

export function useInfiniteNotifications(options: {
  onlyUnread?: boolean;
  limit?: number;
  isActive?: boolean;
} = {}) {
  const filters: NotificationListQuery = {
    onlyUnread: options.onlyUnread ?? false,
    limit: options.limit ?? 20,
    isActive: options.isActive,
  };
  return useInfiniteQuery<
    NotificationPage,
    Error,
    InfiniteData<NotificationPage, string | null>,
    ReturnType<typeof notificationKeys.list>,
    string | null
  >({
    queryKey: notificationKeys.list(filters),
    queryFn: ({ pageParam }) =>
      fetchNotificationsPage({ ...filters, cursor: pageParam }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useUnreadCount() {
  return useQuery<UnreadCount, Error>({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const res = await api.get("/api/notifications/unread-count");
      if (!res.data?.success) {
        throw new Error(res.data?.message ?? "Không thể tải số thông báo");
      }
      return res.data.data as UnreadCount;
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 30_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation<{ ok: true; alreadyRead: boolean }, Error, string>({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/api/notifications/${id}/read`, {});
      if (!res.data?.success) {
        throw new Error(res.data?.message ?? "Đánh dấu đã đọc thất bại");
      }
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation<{ updated: number }, Error, void>({
    mutationFn: async () => {
      const res = await api.post("/api/notifications/read-all", {});
      if (!res.data?.success) {
        throw new Error(res.data?.message ?? "Đánh dấu tất cả đã đọc thất bại");
      }
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Pure helper used by the SSE event handler. Apply a `created` event to
 * the cache: prepend the new notification to the first page of every
 * list query (so any open dropdown shows it instantly).
 */
export function prependNotificationToCache(
  qc: ReturnType<typeof useQueryClient>,
  notification: NotificationItem
) {
  qc.setQueriesData<InfiniteData<NotificationPage, string | null>>(
    { queryKey: notificationKeys.all, type: "active" },
    (prev) => {
      if (!prev || prev.pages.length === 0) return prev;
      const firstPage = prev.pages[0];
      const exists = firstPage.items.some((n) => n.id === notification.id);
      if (exists) return prev;
      return {
        ...prev,
        pages: [
          { ...firstPage, items: [notification, ...firstPage.items] },
          ...prev.pages.slice(1),
        ],
      };
    }
  );
}

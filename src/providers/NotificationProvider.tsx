/**
 * NotificationProvider.
 *
 * Mounts a single SSE connection per browser tab and dispatches events to
 * react-query + the toast subsystem. The provider is gated by the user
 * permission `notification.view` — if it's missing, no connection is
 * opened and no UI is rendered.
 *
 * Singleton guarantee:
 *   `instance` is module-scoped, so React Fast Refresh / React 18
 *   StrictMode double-mount does not create a second `EventSource`. The
 *   provider looks up the existing instance keyed by `accessToken` and
 *   reuses it.
 *
 * Cookie sync:
 *   `sseAuth.ts` looks for a non-httpOnly `notification-stream-token`
 *   cookie. To make that work, the AuthProvider mirrors the access token
 *   into that cookie on every login / logout transition. We don't read it
 *   from here — we just keep the provider's lifecycle aligned with the
 *   auth store.
 */

"use client";

import {
  ReactNode,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { useNotificationStore } from "@/store/notification.store";
import { useCan } from "@/hooks/useCan";
import { SSE_TOKEN_COOKIE } from "@/lib/sseAuth";
import {
  prependNotificationToCache,
  notificationKeys,
  useUnreadCount,
} from "@/hooks/useNotifications";
import type {
  NotificationItem,
  NotificationRealtimeEvent,
} from "@/types/notification";
import type { NotificationPayload } from "@/lib/notificationBus";
import { showNotificationToast } from "@/components/notifications/notificationToast";

// ============ Singleton EventSource ============
type SseState = {
  token: string;
  source: EventSource;
  refCount: number;
};

let sse: SseState | null = null;

function acquireSse(token: string): SseState {
  if (sse && sse.token === token) {
    sse.refCount += 1;
    return sse;
  }
  if (sse) {
    sse.source.close();
    sse = null;
  }
  const url = `/api/notifications/stream`;
  const source = new EventSource(url, { withCredentials: true });
  sse = { token, source, refCount: 1 };
  return sse;
}

function releaseSse(): void {
  if (!sse) return;
  sse.refCount -= 1;
  if (sse.refCount <= 0) {
    sse.source.close();
    sse = null;
  }
}

// ============ Provider ============

type Props = {
  children: ReactNode;
};

export default function NotificationProvider({ children }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const canView = useCan("notification.view");

  const queryClient = useQueryClient();
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const incrementUnread = useNotificationStore((s) => s.incrementUnread);

  // Pull the initial unread count exactly once when the user becomes
  // eligible. The provider itself does not poll — the SSE stream drives
  // updates from here on.
  const { data: unread } = useUnreadCount();
  useEffect(() => {
    if (!canView) return;
    if (unread?.count !== undefined) {
      setUnreadCount(unread.count);
    }
  }, [canView, unread?.count, setUnreadCount]);

  // Track the latest access token for the SSE handler below.
  const tokenRef = useRef<string | null>(null);
  useEffect(() => {
    tokenRef.current = accessToken;
  }, [accessToken]);

  // Mount SSE.
  useEffect(() => {
    if (!canView || !user || !accessToken) return;

    const state = acquireSse(accessToken);

    const onNotification = (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as { notification: NotificationPayload };
        const raw = payload.notification;
        // Transform SSE payload (NotificationPayload) to NotificationItem
        const notification: NotificationItem = {
          id: raw.id,
          title: raw.title,
          message: raw.message,
          type: raw.type,
          category: raw.category ?? "general",
          priority: raw.priority ?? "normal",
          link: raw.link ?? null,
          senderId: raw.senderId ?? "",
          senderName: raw.senderName ?? "Hệ thống",
          createdAt: raw.createdAt,
          read: false,
          readAt: null,
        };
        prependNotificationToCache(queryClient, notification);
        incrementUnread(1);
        showNotificationToast(notification, () => {
          if (notification.link) {
            window.location.assign(notification.link);
          }
        });
      } catch (err) {
        console.error("[NotificationProvider] failed to parse notification event", err);
      }
    };

    const onSnapshot = (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as { unreadCount: number };
        setUnreadCount(payload.unreadCount);
      } catch (err) {
        console.error("[NotificationProvider] failed to parse snapshot", err);
      }
    };

    const onOpen = () => {
      // Connection established — refresh the badge so it's authoritative.
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    };

    const onError = () => {
      // EventSource auto-reconnects with the server-sent `retry:` hint; we
      // just log for debug visibility.
      if (typeof window !== "undefined") {
        console.warn("[NotificationProvider] SSE connection error — browser will retry");
      }
    };

    state.source.addEventListener("notification", onNotification);
    state.source.addEventListener("snapshot", onSnapshot);
    state.source.addEventListener("open", onOpen);
    state.source.addEventListener("error", onError);

    return () => {
      state.source.removeEventListener("notification", onNotification);
      state.source.removeEventListener("snapshot", onSnapshot);
      state.source.removeEventListener("open", onOpen);
      state.source.removeEventListener("error", onError);
      releaseSse();
    };
  }, [canView, user, accessToken, queryClient, incrementUnread, setUnreadCount]);

  // On logout (token removed) reset the store so the next user starts
  // from a clean slate.
  useEffect(() => {
    if (!accessToken) {
      useNotificationStore.getState().reset();
    }
  }, [accessToken]);

  // Helpers for non-provider callers (e.g. the bell dropdown). The
  // `useReducer` pattern would be a bigger refactor; this is a stable
  // reference thanks to `useMemo`.
  const api = useMemo(
    () => ({
      invalidate: () =>
        queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
    }),
    [queryClient]
  );

  // Avoid serializing the helpers through React (would warn about non-
  // serializable values). The provider simply returns children.
  void api;

  return <>{children}</>;
}

/**
 * Visible for testing. Pure dispatch helper that updates the zustand
 * store + react-query cache based on a realtime event.
 */
export function applyRealtimeEvent(
  qc: ReturnType<typeof useQueryClient>,
  event: NotificationRealtimeEvent
) {
  const store = useNotificationStore.getState();
  if (event.kind === "created") {
    prependNotificationToCache(qc, event.notification);
    store.incrementUnread(1);
  } else if (event.kind === "snapshot") {
    store.setUnreadCount(event.unreadCount);
  }
  // ping events are ignored.
}

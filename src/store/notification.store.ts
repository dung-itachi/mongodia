/**
 * Notification client-side store.
 *
 * Holds the *live* state that doesn't belong in React Query cache:
 *   - the unread count badge number (mutated by SSE events)
 *
 * The store is intentionally tiny and pure. All fetches, mutations, and
 * invalidations are still done via React Query hooks so the cache remains
 * the single source of truth for the list.
 *
 * The actual store-update logic lives in `notification.reducers.ts` as
 * pure functions so it can be unit-tested without rendering React.
 */

import { create } from "zustand";
import {
  applyStoreSnapshot,
  applyStoreCreated,
  applyStoreRead,
  applyStoreReadAll,
  type NotificationStateSnapshot,
} from "./notification.reducers";

type NotificationState = NotificationStateSnapshot & {
  hasFetchedInitial: boolean;
  setUnreadCount: (count: number) => void;
  incrementUnread: (delta?: number) => void;
  decrementUnread: (wasUnread: boolean) => void;
  markHasFetchedInitial: () => void;
  reset: () => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  hasFetchedInitial: false,
  setUnreadCount: (count) =>
    set((state) => ({
      ...applyStoreSnapshot(state, count),
      hasFetchedInitial: true,
    })),
  incrementUnread: (delta = 1) =>
    set((state) => ({
      unreadCount: Math.max(0, state.unreadCount + delta),
    })),
  decrementUnread: (wasUnread) =>
    set((state) => applyStoreRead(state, { wasUnread })),
  markHasFetchedInitial: () => set({ hasFetchedInitial: true }),
  reset: () => set({ unreadCount: 0, hasFetchedInitial: false }),
}));

// Re-export the reducers so consumers/tests can compare symbol-for-symbol.
export { applyStoreSnapshot, applyStoreCreated, applyStoreRead, applyStoreReadAll };


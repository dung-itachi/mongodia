/**
 * Pure helpers for the notification store. Extracted from the closure
 * inside `useNotificationStore` so unit tests can import them without
 * needing to render React or invoke Zustand.
 *
 * These functions take the previous state and an event payload, and
 * return a *partial* state to merge. They never mutate inputs.
 */

export type NotificationStateSnapshot = {
  unreadCount: number;
};

export type NotificationItemLite = {
  id: string;
  read: boolean;
};

export function applyStoreSnapshot(
  prev: NotificationStateSnapshot,
  unreadCount: number
): NotificationStateSnapshot {
  return { unreadCount: Math.max(0, unreadCount) };
}

export function applyStoreCreated(
  prev: NotificationStateSnapshot
): NotificationStateSnapshot {
  return { unreadCount: prev.unreadCount + 1 };
}

export function applyStoreRead(
  prev: NotificationStateSnapshot,
  opts: { wasUnread: boolean }
): NotificationStateSnapshot {
  return {
    unreadCount: Math.max(0, prev.unreadCount - (opts.wasUnread ? 1 : 0)),
  };
}

export function applyStoreReadAll(
  prev: NotificationStateSnapshot
): NotificationStateSnapshot {
  return { unreadCount: 0 };
}

/**
 * Apply a realtime event to a *list* of notifications (`items`).
 * Returns a new array; original is not mutated.
 */
export function applyListEvent(
  items: NotificationItemLite[],
  event:
    | { kind: "created"; notification: NotificationItemLite }
    | { kind: "read"; id: string }
    | { kind: "readAll" }
): NotificationItemLite[] {
  if (event.kind === "created") {
    if (items.some((n) => n.id === event.notification.id)) return items;
    return [event.notification, ...items];
  }
  if (event.kind === "read") {
    return items.map((n) =>
      n.id === event.id ? { ...n, read: true } : n
    );
  }
  // readAll
  return items.map((n) => (n.read ? n : { ...n, read: true }));
}

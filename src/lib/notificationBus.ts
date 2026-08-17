/**
 * In-process notification bus (SSE pub/sub).
 *
 * Why this lives in-process:
 *   Next.js dev/prod runs as a single Node process on a single host in this
 *   codebase. Services that emit notifications (e.g. a future
 *   `notificationService.publish`) call `publish()` and `subscribe()` fans
 *   out to active SSE clients without an extra broker (Redis/NATS).
 *
 * Lifetime:
 *   - Each SSE route opens a `subscribe(employeeId)` iterator; the iterator
 *     yields a single event before pausing. The route's `ReadableStream`
 *     pulls the next event on every loop tick.
 *   - When the client disconnects, the iterator is `.return()`-ed, which
 *     removes the subscriber from the bus.
 *
 * Thread safety:
 *   Node is single-threaded for JS execution, so a plain Map + array queue
 *   is sufficient. No locks needed.
 *
 * Out of scope:
 *   - Cross-process fan-out (would need Redis pub/sub). For a single-host
 *     Node service this is unnecessary.
 *   - Persistence of missed events. Clients use cursor-based pagination
 *     when they reconnect.
 */

export type NotificationPayload = {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  category: string;
  priority: string;
  link?: string | null;
  senderId: string;
  senderName: string;
  recipientIds: string[];
  createdAt: string;
};

export type BusEvent =
  | { kind: "created"; notification: NotificationPayload }
  | { kind: "snapshot"; unreadCount: number };

type Subscriber = {
  employeeId: string;
  push: (event: BusEvent) => void;
  close: () => void;
};

const subscribers = new Set<Subscriber>();

function isMatch(payload: NotificationPayload, employeeId: string): boolean {
  if (!payload.recipientIds || payload.recipientIds.length === 0) return true;
  return payload.recipientIds.includes(employeeId);
}

/**
 * Publish a notification to all matching subscribers.
 *
 * Callers should resolve `recipientIds` to strings (`String(...)`) so we
 * don't depend on ObjectId equality rules across the bus boundary.
 */
export function publish(notification: NotificationPayload): void {
  for (const subscriber of subscribers) {
    if (isMatch(notification, subscriber.employeeId)) {
      try {
        subscriber.push({ kind: "created", notification });
      } catch {
        // Subscriber is dead — prune it.
        subscribers.delete(subscriber);
      }
    }
  }
}

/**
 * Push a snapshot event (e.g. updated unread count) to a single subscriber.
 * Used by mark-read endpoints to nudge the SSE client.
 */
export function pushSnapshot(employeeId: string, unreadCount: number): void {
  for (const subscriber of subscribers) {
    if (subscriber.employeeId === employeeId) {
      try {
        subscriber.push({ kind: "snapshot", unreadCount });
      } catch {
        subscribers.delete(subscriber);
      }
    }
  }
}

/**
 * Subscribe to events for a single employee. Returns a `BusSubscription`
 * that the SSE route can iterate via `for await`.
 *
 * Pattern:
 *   const sub = subscribe(employeeId);
 *   for await (const event of sub) { ... }
 *
 * Cancellation: `break`/early-return/etc. triggers the iterator's
 * try/finally which removes the subscriber from the bus.
 */
export function subscribe(employeeId: string): AsyncIterable<BusEvent> {
  const queue: BusEvent[] = [];
  let resolveNext: ((value: IteratorResult<BusEvent>) => void) | null = null;
  let closed = false;

  const subscriber: Subscriber = {
    employeeId,
    push(event) {
      if (closed) return;
      if (resolveNext) {
        const r = resolveNext;
        resolveNext = null;
        r({ value: event, done: false });
      } else {
        queue.push(event);
      }
    },
    close() {
      closed = true;
      if (resolveNext) {
        const r = resolveNext;
        resolveNext = null;
        r({ value: undefined as unknown as BusEvent, done: true });
      }
    },
  };

  subscribers.add(subscriber);

  return {
    [Symbol.asyncIterator](): AsyncIterator<BusEvent> {
      return {
        next(): Promise<IteratorResult<BusEvent>> {
          if (closed) {
            return Promise.resolve({ value: undefined as unknown as BusEvent, done: true });
          }
          if (queue.length > 0) {
            return Promise.resolve({ value: queue.shift()!, done: false });
          }
          return new Promise((resolve) => {
            resolveNext = resolve;
          });
        },
        return(): Promise<IteratorResult<BusEvent>> {
          closed = true;
          subscribers.delete(subscriber);
          return Promise.resolve({ value: undefined as unknown as BusEvent, done: true });
        },
      };
    },
  };
}

/** Test helper — drop all subscribers. Not used in production. */
export function _resetBus(): void {
  for (const subscriber of subscribers) {
    subscriber.close();
  }
  subscribers.clear();
}

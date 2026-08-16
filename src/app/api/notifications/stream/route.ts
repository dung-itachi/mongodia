/**
 * GET /api/notifications/stream
 *
 * Server-Sent Events stream. The browser subscribes via the native
 * `EventSource` API:
 *
 *   const es = new EventSource('/api/notifications/stream');
 *   es.addEventListener('notification', (e) => {...});
 *
 * Authentication:
 *   - Standard `Authorization: Bearer <token>` header (handy for curl).
 *   - OR the `notification-stream-token` cookie, which AuthProvider sets
 *     after login. Required because the browser's `EventSource` cannot
 *     attach custom headers.
 *
 * Wire format:
 *   - `event: notification\ndata: <json>\n\n`    — new notification.
 *   - `event: snapshot\ndata: <json>\n\n`        — unread count updated.
 *   - `event: ping\ndata: <json>\n\n`            — heartbeat every 25s.
 *
 * Lifecycle:
 *   - The route handler returns a `ReadableStream` whose `pull()` pulls
 *     the next event from the in-process bus. When the client disconnects,
 *     the stream's `cancel()` is called, which calls `sub.return()` to
 *     unsubscribe from the bus.
 *   - Next.js handles the request lifecycle; a single user can have at
 *     most one persistent connection per browser tab.
 */

import { getCurrentUserFromSseRequest } from "@/lib/sseAuth";
import { subscribe, type BusEvent } from "@/lib/notificationBus";

const PING_INTERVAL_MS = 25_000;
const encoder = new TextEncoder();

function formatEvent(eventName: string, payload: unknown): Uint8Array {
  return encoder.encode(
    `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  let currentUser;
  try {
    currentUser = await getCurrentUserFromSseRequest(request);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!currentUser.permissions.includes("notification.view")) {
    return new Response("Forbidden", { status: 403 });
  }

  const employeeId = currentUser.employee._id.toString();
  // Coerce to string so equality is consistent across the bus boundary.
  const employeeIdStr = String(employeeId);

  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Initial retry hint so the browser waits before reconnect.
      controller.enqueue(encoder.encode("retry: 3000\n\n"));

      // Send a hello event so the client knows the connection is live.
      controller.enqueue(
        formatEvent("hello", { employeeId: employeeIdStr, ts: Date.now() })
      );

      const sub = subscribe(employeeIdStr);

      pingTimer = setInterval(() => {
        if (cancelled) return;
        try {
          controller.enqueue(formatEvent("ping", { ts: Date.now() }));
        } catch {
          // Controller closed; cleanup happens in cancel().
        }
      }, PING_INTERVAL_MS);

      // Iterator wrapper: cancel `sub` when the controller closes.
      try {
        for await (const event of sub) {
          if (cancelled) break;
          if (event.kind === "created") {
            controller.enqueue(
              formatEvent("notification", { notification: event.notification })
            );
          } else if (event.kind === "snapshot") {
            controller.enqueue(
              formatEvent("snapshot", { unreadCount: event.unreadCount })
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[SSE] notification stream error:", err);
        }
      } finally {
        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }
      }
    },
    cancel() {
      cancelled = true;
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * ==================================================
 * GLOBAL FETCH AUTH INTERCEPTOR
 * ==================================================
 *
 * Problem this solves:
 *   Next.js API routes protect themselves via `getCurrentUser()`,
 *   which reads the `Authorization: Bearer <token>` header. Hooks
 *   that call `fetch("/api/...")` directly (instead of going through
 *   the configured `axios` instance in `@/lib/axios`) forget to attach
 *   the token, causing 401 → "Token không được cung cấp" errors.
 *
 * Solution:
 *   Wrap `window.fetch` once at app startup. For any request whose URL
 *   starts with `/api/` (or `process.env.NEXT_PUBLIC_API_URL/api/`),
 *   automatically inject `Authorization` from the persisted auth store.
 *
 * This is a defense-in-depth layer — axios is still the preferred
 * client for new code, but this patch keeps every existing `fetch`
 * call working without per-hook edits.
 *
 * Idempotency:
 *   `_fetchAuthInterceptorInstalled` guards against double-installation
 *   under React 18 StrictMode (which mounts effects twice in dev).
 */

import { useAuthStore } from "@/store/auth.store";

declare global {
  interface Window {
    __fetchAuthInterceptorInstalled?: boolean;
  }
}

const API_PATH = "/api/";

function isApiRequest(url: string): boolean {
  // Same-origin: relative or absolute http(s) on the same host
  if (url.startsWith(API_PATH)) return true;
  // CORS: match NEXT_PUBLIC_API_URL host (when API is on a separate origin)
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (apiBase && url.startsWith(apiBase + API_PATH)) return true;
  return false;
}

function getAccessToken(): string | null {
  // Zustand persist stores under `auth-storage` as JSON. Reading from
  // localStorage directly avoids a hard dependency on store hydration
  // timing when the interceptor fires before React effects.
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

export function installFetchAuthInterceptor(): void {
  if (typeof window === "undefined") return;
  if (window.__fetchAuthInterceptorInstalled) return;
  window.__fetchAuthInterceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;

    if (!isApiRequest(url)) {
      return originalFetch(input as RequestInfo, init);
    }

    const headers = new Headers(init?.headers);

    // Don't override if the caller already set Authorization
    if (!headers.has("Authorization")) {
      const token = getAccessToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    // Also keep the token fresh — if a hook used `useAuthStore.getState()`
    // while SSR was still hydrating, the localStorage read above will
    // already pull the latest value.
    void useAuthStore.getState();

    return originalFetch(input as RequestInfo, { ...init, headers });
  };
}

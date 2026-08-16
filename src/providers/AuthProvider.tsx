///Khi website mở - Đọc token từ localStorage và set vào store
"use client";

import { ReactNode, useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { installFetchAuthInterceptor } from "@/lib/fetchInterceptor";
import { SSE_TOKEN_COOKIE } from "@/lib/sseAuthConstants";

// Install as early as possible — module evaluation happens when this
// file is first imported (which is from the root client tree). This
// runs BEFORE the user navigates and BEFORE any hook's `useEffect`
// fires. Safe because `installFetchAuthInterceptor` checks for
// `window` and short-circuits on the server.
installFetchAuthInterceptor();

/**
 * Sync the access token into a non-httpOnly cookie so the SSE stream
 * can authenticate. The browser's `EventSource` cannot send custom
 * headers, so we mirror the token into a cookie that the API route
 * reads back. The cookie is cleared on logout.
 */
function syncSseTokenCookie(token: string | null) {
  if (typeof document === "undefined") return;
  if (token) {
    document.cookie = `${SSE_TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; SameSite=Lax; Max-Age=86400`;
  } else {
    document.cookie = `${SSE_TOKEN_COOKIE}=; path=/; SameSite=Lax; Max-Age=0`;
  }
}

type Props = {
  children: ReactNode;
};

export default function AuthProvider({ children }: Props) {
  const setAccessToken = useAuthStore((state) => state.setAccessToken);

  useEffect(() => {
    // Re-install on mount to be safe under React 18 StrictMode (which
    // double-invokes effects in dev). The function is idempotent.
    installFetchAuthInterceptor();

    // Reflect the persisted access token into the SSE cookie on every
    // mount — covers the "refresh page while logged in" case where the
    // zustand persist middleware has already restored the token.
    syncSseTokenCookie(useAuthStore.getState().accessToken);

    // Subscribe so login/logout transitions also update the cookie.
    const unsub = useAuthStore.subscribe((state, prev) => {
      if (state.accessToken !== prev.accessToken) {
        syncSseTokenCookie(state.accessToken);
      }
    });

    // Token is automatically restored by persist middleware
    // No manual restoration needed
    return () => {
      unsub();
    };
  }, []);

  return <>{children}</>;
}
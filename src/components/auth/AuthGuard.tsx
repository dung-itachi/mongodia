"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Spin } from "antd";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/permission";
import { getRoutePermission } from "@/config/routePermissions";
import api from "@/lib/axios";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard wraps every (protected) route. It enforces two things:
 *   1. The user must have an access token (else redirect to /login).
 *   2. The user must have the permission that the route requires
 *      (else redirect to /403).
 *
 * Two gates are required to avoid flicker / wrong redirects:
 *   - `authHydrated`: zustand `persist` rehydrates asynchronously after
 *     mount, so the first render sees the store's default (empty) values
 *     before the persisted token arrives. We wait until hydration
 *     completes before trusting `accessToken`.
 *   - `permissionsFresh`: the `/api/auth/me` call (which refreshes the
 *     cached permissions) has settled. Until this is true, we hold the
 *     permission gate so a deep-link to a freshly-permissioned route
 *     doesn't bounce through /403 with stale cached permissions.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Read zustand's hydration status synchronously via the lazy initializer
  // — this avoids any synchronous setState calls inside effects. If the
  // store is already hydrated at mount (typical on subsequent client-side
  // navigations), we start as hydrated; otherwise we wait via the
  // `onFinishHydration` callback.
  const [authHydrated, setAuthHydrated] = useState<boolean>(() => {
    const persistApi = (useAuthStore as unknown as {
      persist?: { hasHydrated?: () => boolean };
    }).persist;
    return persistApi?.hasHydrated?.() ?? true;
  });

  // Subscribe to zustand's hydration completion (only relevant when the
  // store wasn't already hydrated at mount, e.g. on a hard page reload).
  useEffect(() => {
    if (authHydrated) return;
    const persistApi = (useAuthStore as unknown as {
      persist?: { onFinishHydration?: (cb: () => void) => () => void };
    }).persist;
    if (!persistApi?.onFinishHydration) {
      // Fallback: persist API not available. Mark hydrated synchronously
      // so the route guard doesn't deadlock waiting for an event that
      // never fires. We need the setState here to unblock the guard.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthHydrated(true);
      return;
    }
    const off = persistApi.onFinishHydration(() => setAuthHydrated(true));
    return off;
  }, [authHydrated]);

  // Track when the /api/auth/me refresh has resolved. We only block on
  // this when there's an actual session to refresh.
  const [permissionsFresh, setPermissionsFresh] = useState(false);

  // Refresh the cached user (including permissions) from the server
  // whenever a fresh session is detected (mount after zustand hydration
  // + each login). This ensures that any new permissions granted since
  // the user last logged in (e.g., after a re-seed) take effect
  // immediately and prevents stale permission arrays from triggering
  // 403 redirects.
  useEffect(() => {
    if (!authHydrated) return;
    if (!accessToken) {
      // No session — nothing to refresh; mark as fresh so the route
      // guard can run and redirect to /login.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPermissionsFresh(true);
      return;
    }
    let cancelled = false;
    void api
      .get("/api/auth/me")
      .then((res) => {
        if (cancelled) return;
        const fresh = res.data?.data;
        if (fresh && typeof fresh === "object") {
          setUser(fresh as typeof user);
        }
      })
      .catch(() => {
        // Non-fatal — AuthGuard will still redirect to /login if the
        // token is rejected on the next request.
      })
      .finally(() => {
        if (!cancelled) setPermissionsFresh(true);
      });
    return () => {
      cancelled = true;
    };
    // Re-run when hydration flips or the token changes. `setUser` is a
    // stable zustand selector; excluded to keep deps minimal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHydrated, accessToken]);

  useEffect(() => {
    if (!authHydrated || !permissionsFresh) return;

    // Check authentication first
    if (!accessToken) {
      router.replace("/login");
      return;
    }

    // Check route permission
    const routePermission = getRoutePermission(pathname);
    if (routePermission) {
      const userPermissions = user?.permissions;
      const hasAccess = hasPermission(userPermissions, routePermission.permission);
      if (!hasAccess) {
        router.replace("/403");
      }
    }
  }, [authHydrated, permissionsFresh, accessToken, user, pathname, router]);

  if (!authHydrated || !permissionsFresh) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          width: "100vw",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          width: "100vw",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  // Permission check - if route requires permission and user doesn't have it
  const routePermission = getRoutePermission(pathname);
  if (routePermission) {
    const userPermissions = user?.permissions;
    const hasAccess = hasPermission(userPermissions, routePermission.permission);
    if (!hasAccess) {
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            width: "100vw",
          }}
        >
          <Spin size="large" />
        </div>
      );
    }
  }

  return <>{children}</>;
}

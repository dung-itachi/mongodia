"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Spin } from "antd";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/permission";
import { getRoutePermission } from "@/config/routePermissions";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

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
  }, [isHydrated, accessToken, user, pathname, router]);

  if (!isHydrated) {
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

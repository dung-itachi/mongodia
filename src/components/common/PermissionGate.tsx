/**
 * PermissionGate Component (Sprint 3.1 - Complete UI Kit)
 *
 * Component-level permission gate.
 * Export from common UI Kit for easy access.
 */

import { ReactNode } from "react";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/permission";

export type PermissionGateProps = {
  /** Permission required */
  permission: string;
  /** Children to render if has permission */
  children: ReactNode;
  /** Fallback to render if no permission (optional) */
  fallback?: ReactNode;
};

export default function PermissionGate({
  permission,
  children,
  fallback = null,
}: PermissionGateProps) {
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions ?? [];

  if (hasPermission(permissions, permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

"use client";

import { ReactNode } from "react";
import { useCan } from "@/hooks/useCan";
import { Permission } from "@/types/permission";

interface PermissionGateProps {
  permission: Permission | string;
  children: ReactNode;
}

export function PermissionGate({ permission, children }: PermissionGateProps) {
  const can = useCan(permission);

  if (!can) {
    return null;
  }

  return <>{children}</>;
}

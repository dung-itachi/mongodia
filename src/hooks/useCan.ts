import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/permission";
import { Permission } from "@/types/permission";

export function useCan(permission: Permission | string): boolean {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return false;
  }

  return hasPermission(user.permissions, permission);
}

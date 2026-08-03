import { Permission } from "@/types/permission";

export function hasPermission(
  userPermissions: Permission[] | string[] | undefined,
  permission: Permission | string
): boolean {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false;
  }

  if ((userPermissions as string[]).includes("*")) {
    return true;
  }

  return (userPermissions as string[]).includes(permission);
}

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

/**
 * Check if the user has at least one of the given permissions.
 *
 * Used by modules that have a "manage" tier that implicitly grants
 * the "view" tier (e.g. `system-settings.manage` → `system-settings.view`).
 *
 * Wildcard "*" in `userPermissions` short-circuits to true.
 */
export function hasAnyPermission(
  userPermissions: Permission[] | string[] | undefined,
  permissions: ReadonlyArray<Permission | string>
): boolean {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false;
  }

  if ((userPermissions as string[]).includes("*")) {
    return true;
  }

  const granted = userPermissions as string[];
  return permissions.some((p) => granted.includes(p as string));
}

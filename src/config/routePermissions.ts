/**
 * Route Permissions Configuration (Sprint 2.5 — Built from modules.ts)
 *
 * This file is GENERATED from src/config/modules.ts.
 * Do NOT hardcode route permissions here — edit modules.ts instead.
 *
 * Usage:
 * - AuthGuard uses this to check permission before rendering a page
 * - Middleware can use this for server-side checks (optional)
 */

import { MODULES, getModuleByRoute, type ModuleDefinition } from "./modules";

export type RoutePermission = {
  /** Route path (must match Next.js route exactly) */
  path: string;
  /** Permission required to access this route (any-of when used with `permissions`). */
  permission: string;
  /** Any-of permissions for this route. When set, the user needs at least one. */
  permissions?: string[];
  /** Human-readable label for the route (for 403 page) */
  label: string;
};

/**
 * All routes that require specific permissions.
 * Routes NOT listed here are accessible to all authenticated users.
 *
 * This is GENERATED from modules.ts — do not edit directly.
 */
export const ROUTE_PERMISSIONS: RoutePermission[] = MODULES.map(
  (module): RoutePermission => ({
    path: module.route,
    permission: module.permission,
    permissions: module.permissions,
    label: module.title,
  })
);

/**
 * Map of route path to permission requirement.
 * O(1) lookup for permission checks.
 */
export const ROUTE_PERMISSION_MAP: Record<string, RoutePermission> =
  ROUTE_PERMISSIONS.reduce(
    (acc, route) => {
      acc[route.path] = route;
      return acc;
    },
    {} as Record<string, RoutePermission>
  );

/**
 * Get the required permission for a route.
 * Returns undefined if the route doesn't require a specific permission.
 *
 * This function handles:
 * - Exact route match (e.g., /dashboard)
 * - Routes with query params (e.g., /orders?status=SHIPPING)
 */
export function getRoutePermission(path: string): RoutePermission | undefined {
  // Exact match first
  if (ROUTE_PERMISSION_MAP[path]) {
    return ROUTE_PERMISSION_MAP[path];
  }

  // Handle routes with query params (e.g., /orders?status=SHIPPING)
  const basePath = path.split("?")[0];
  if (ROUTE_PERMISSION_MAP[basePath]) {
    return ROUTE_PERMISSION_MAP[basePath];
  }

  // Fallback: try to find a module that matches this route
  const module = getModuleByRoute(path);
  if (module) {
    return {
      path: module.route,
      permission: module.permission,
      label: module.title,
    };
  }

  return undefined;
}

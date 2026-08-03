/**
 * Route Permissions Configuration (Sprint 2.4)
 *
 * Central registry for route-level permission requirements.
 * Maps routes to their required permission.
 *
 * Usage:
 * - AuthGuard uses this to check permission before rendering a page
 * - Middleware can use this for server-side checks (optional)
 *
 * Convention:
 * - Use permission from @/types/permission or string literal
 * - Routes without permission are accessible to all authenticated users
 */

export type RoutePermission = {
  /** Route path (must match Next.js route exactly) */
  path: string;
  /** Permission required to access this route */
  permission: string;
  /** Human-readable label for the route (for 403 page) */
  label: string;
};

/**
 * All routes that require specific permissions.
 * Routes NOT listed here are accessible to all authenticated users.
 */
export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Dashboard
  {
    path: "/dashboard",
    permission: "dashboard.view",
    label: "Tổng quan",
  },

  // Marketing
  {
    path: "/marketing/dashboard",
    permission: "report.view",
    label: "Tổng quan MKT",
  },
  {
    path: "/marketing/input",
    permission: "lead.create",
    label: "Nhập số",
  },
  {
    path: "/marketing/orders",
    permission: "order.view",
    label: "QL đơn hàng",
  },

  // Leads
  {
    path: "/leads",
    permission: "lead.view",
    label: "Số cần gọi",
  },

  // Orders
  {
    path: "/orders",
    permission: "order.view",
    label: "Đơn hàng",
  },

  // Products
  {
    path: "/products",
    permission: "product.view",
    label: "QL sản phẩm",
  },

  // Warehouses
  {
    path: "/warehouses",
    permission: "warehouse.view",
    label: "Quản lý kho",
  },

  // Employees
  {
    path: "/employees",
    permission: "employee.view",
    label: "QL tài khoản",
  },

  // Roles
  {
    path: "/roles",
    permission: "role.view",
    label: "Quản lý vai trò",
  },

  // Customers
  {
    path: "/customers",
    permission: "customer.view",
    label: "Khách hàng",
  },

  // Settings
  {
    path: "/settings",
    permission: "settings.view",
    label: "Cài đặt",
  },
];

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

  return undefined;
}

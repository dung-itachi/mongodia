/**
 * Central Module Registry — Single Source of Truth (Sprint 2.5)
 *
 * This is the ONLY place where module definitions live.
 * Both nav.config.tsx and routePermissions.ts are generated from this.
 *
 * To change:
 * - route: edit one place
 * - permission: edit one place
 * - title: edit one place
 * - icon: edit one place
 */

export type NavGroupKey =
  | "DASHBOARD"
  | "MKT"
  | "SALE"
  | "CUSTOMERS"
  | "ORDERS"
  | "PRODUCTS"
  | "ACCOUNTS"
  | "WAREHOUSE";

export type ModulePermission = string;

export type ModuleIcon = string;

/**
 * Module definition — the source of truth for all module data.
 */
export type ModuleDefinition = {
  /** Unique identifier for this module */
  id: string;
  /** Display title in Vietnamese */
  title: string;
  /** Route path (e.g., /employees, /orders?status=SHIPPING) */
  route: string;
  /** Permission required to access this module */
  permission: ModulePermission;
  /** NavGroup this module belongs to */
  group: NavGroupKey;
  /** SVG icon path data */
  icon: ModuleIcon;
  /** Whether this is a standalone nav item (not in a group) */
  standalone?: boolean;
  /** Optional pill value (e.g., notification count) */
  pill?: number | null;
};

/**
 * All modules in the system.
 * This is the Single Source of Truth.
 */
export const MODULES: ModuleDefinition[] = [
  // Dashboard (standalone)
  {
    id: "dashboard",
    title: "Tổng quan",
    route: "/dashboard",
    permission: "dashboard.view",
    group: "DASHBOARD",
    icon: `<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>`,
    standalone: true,
  },

  // Marketing Group
  {
    id: "marketing-dashboard",
    title: "Tổng quan MKT",
    route: "/marketing/dashboard",
    permission: "report.view",
    group: "MKT",
    icon: `<path d="M18 20V10M12 20V4M6 20v-6"/>`,
  },
  {
    id: "marketing-input",
    title: "Nhập số",
    route: "/marketing/input",
    permission: "lead.create",
    group: "MKT",
    icon: `<path d="M12 5v14M5 12h14"/>`,
    pill: 0,
  },
  {
    id: "marketing-orders",
    title: "QL đơn hàng",
    route: "/marketing/orders",
    permission: "order.view",
    group: "MKT",
    icon: `<path d="M9 11l3 3L22 4"/>`,
  },
  {
    id: "facebook-pages",
    title: "Facebook Pages",
    route: "/facebook-pages",
    permission: "facebook-page.view",
    group: "MKT",
    icon: `<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>`,
  },
  {
    id: "campaigns",
    title: "Campaigns",
    route: "/campaigns",
    permission: "campaign.view",
    group: "MKT",
    icon: `<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>`,
  },

  // Sale Group
  {
    id: "leads",
    title: "Số cần gọi",
    route: "/leads",
    permission: "lead.view",
    group: "SALE",
    icon: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>`,
    pill: 0,
  },
  {
    id: "customers",
    title: "Khách hàng",
    route: "/customers",
    permission: "customer.view",
    group: "SALE",
    icon: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  },
  {
    id: "orders-closed",
    title: "Chốt đơn",
    route: "/orders?status=CONFIRMED",
    permission: "order.view",
    group: "SALE",
    icon: `<path d="M20 6 9 17l-5-5"/>`,
    pill: 0,
  },

  // Orders Group
  {
    id: "orders-shipping",
    title: "Đang giao",
    route: "/orders?status=SHIPPING",
    permission: "order.view",
    group: "ORDERS",
    icon: `<path d="M5 12h14M12 5l7 7-7 7"/>`,
    pill: 0,
  },
  {
    id: "orders-completed",
    title: "Giao TC",
    route: "/orders?status=DELIVERED",
    permission: "order.view",
    group: "ORDERS",
    icon: `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>`,
    pill: 0,
  },
  {
    id: "orders-cancelled",
    title: "Hoàn hàng",
    route: "/orders?status=RETURNED",
    permission: "order.view",
    group: "ORDERS",
    icon: `<path d="M9 14 4 9l5-5"/>`,
    pill: 0,
  },
  {
    id: "orders-reconciled",
    title: "Đối soát",
    route: "/orders?status=RECONCILED",
    permission: "order.view",
    group: "ORDERS",
    icon: `<path d="M9 11l3 3L22 4"/>`,
    pill: 0,
  },

  // Products Group
  {
    id: "products",
    title: "QL sản phẩm",
    route: "/products",
    permission: "product.view",
    group: "PRODUCTS",
    icon: `<path d="M12 2L2 7l10 5 10-5-10-5z"/>`,
  },
  {
    id: "gifts",
    title: "Quà tặng",
    route: "/gifts",
    permission: "gift.view",
    group: "PRODUCTS",
    icon: `<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>`,
  },

  // Accounts Group
  {
    id: "employees",
    title: "QL tài khoản",
    route: "/employees",
    permission: "employee.view",
    group: "ACCOUNTS",
    icon: `<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>`,
  },

  // Warehouse Group
  {
    id: "warehouses",
    title: "Quản lý kho",
    route: "/warehouses",
    permission: "warehouse.view",
    group: "WAREHOUSE",
    icon: `<path d="M21 8v13H3V8"/>`,
  },
];

/**
 * Group definitions for navigation.
 */
export type NavGroupDefinition = {
  key: NavGroupKey;
  label: string;
  icon: ModuleIcon;
};

/**
 * All navigation groups.
 */
export const NAV_GROUPS: NavGroupDefinition[] = [
  {
    key: "DASHBOARD",
    label: "Tổng quan",
    icon: `<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>`,
  },
  {
    key: "MKT",
    label: "MKT",
    icon: `<path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>`,
  },
  {
    key: "SALE",
    label: "Sale",
    icon: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>`,
  },
  {
    key: "CUSTOMERS",
    label: "Khách hàng",
    icon: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  },
  {
    key: "ORDERS",
    label: "Đơn hàng",
    icon: `<rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/>`,
  },
  {
    key: "PRODUCTS",
    label: "Sản phẩm",
    icon: `<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>`,
  },
  {
    key: "ACCOUNTS",
    label: "Tài khoản",
    icon: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  },
  {
    key: "WAREHOUSE",
    label: "Kho",
    icon: `<path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>`,
  },
];

/**
 * Map of module id to module definition.
 * O(1) lookup.
 */
export const MODULE_MAP: Record<string, ModuleDefinition> = MODULES.reduce(
  (acc, module) => {
    acc[module.id] = module;
    return acc;
  },
  {} as Record<string, ModuleDefinition>
);

/**
 * Map of route path to module definition.
 * O(1) lookup for route-based checks.
 */
export const ROUTE_MODULE_MAP: Record<string, ModuleDefinition> = MODULES.reduce(
  (acc, module) => {
    acc[module.route] = module;
    return acc;
  },
  {} as Record<string, ModuleDefinition>
);

/**
 * Get module by ID.
 */
export function getModuleById(id: string): ModuleDefinition | undefined {
  return MODULE_MAP[id];
}

/**
 * Get module by route.
 */
export function getModuleByRoute(route: string): ModuleDefinition | undefined {
  // Exact match
  if (ROUTE_MODULE_MAP[route]) {
    return ROUTE_MODULE_MAP[route];
  }

  // Handle routes with query params (e.g., /orders?status=SHIPPING)
  const basePath = route.split("?")[0];
  for (const module of MODULES) {
    if (module.route.startsWith(basePath + "?")) {
      return module;
    }
  }

  return undefined;
}

/**
 * Get all modules in a specific group.
 */
export function getModulesByGroup(group: NavGroupKey): ModuleDefinition[] {
  return MODULES.filter((module) => module.group === group);
}

/**
 * Get the standalone dashboard module.
 */
export function getDashboardModule(): ModuleDefinition | undefined {
  return MODULES.find((module) => module.standalone === true);
}

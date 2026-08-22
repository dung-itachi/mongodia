/**
 * Permission → module-group mapping (Phase 9 — RBAC UI).
 *
 * IMPORTANT: when adding a new permission code to
 * `constants/permissions.ts`, ALSO add it here under the appropriate
 * module group. The seed runs `updateOne(..., { upsert: true })` for
 * each entry, so missing entries fall back to "General" — they are
 * still persisted, just bucketed under a generic module name.
 *
 * Adding a new module group? Update:
 *   1. this file (the mapping)
 *   2. `db/seeds/permissions.seed.ts` (imports PERMISSION_MODULE_MAP)
 *   3. (optional) UI ordering in `getPermissionsGroupedByModule()`
 */

export const PERMISSION_MODULE_MAP: Record<string, string> = {
  "dashboard.view": "Dashboard",

  "employee.view": "Employee",
  "employee.create": "Employee",
  "employee.update": "Employee",
  "employee.delete": "Employee",

  "account.view": "Account",
  "account.create": "Account",
  "account.update": "Account",
  "account.disable": "Account",
  "account.resetPassword": "Account",
  "account.manageAll": "Account",
  "self-account.view": "Account",
  "self-account.update": "Account",
  "self-account.changePassword": "Account",

  "department.view": "Department",
  "department.create": "Department",
  "department.update": "Department",
  "department.delete": "Department",

  "team.view": "Team",
  "team.create": "Team",
  "team.update": "Team",
  "team.delete": "Team",

  "role.view": "Role",
  "role.create": "Role",
  "role.update": "Role",
  "role.delete": "Role",

  // Phase 9 — Role-Permission Tree (RBAC management)
  "role.permission.manage": "Role",

  "area.view": "Area",
  "area.create": "Area",
  "area.update": "Area",
  "area.delete": "Area",

  "product.view": "Product",
  "product.create": "Product",
  "product.update": "Product",
  "product.delete": "Product",

  "category.view": "Category",
  "category.create": "Category",
  "category.update": "Category",
  "category.delete": "Category",

  "variant-option.view": "VariantOption",
  "variant-option.create": "VariantOption",
  "variant-option.update": "VariantOption",
  "variant-option.delete": "VariantOption",

  "variant-value.view": "VariantValue",
  "variant-value.create": "VariantValue",
  "variant-value.update": "VariantValue",
  "variant-value.delete": "VariantValue",

  "product-variant.view": "ProductVariant",
  "product-variant.create": "ProductVariant",
  "product-variant.update": "ProductVariant",
  "product-variant.delete": "ProductVariant",

  "customer.view": "Customer",
  "customer.create": "Customer",
  "customer.update": "Customer",
  "customer.delete": "Customer",

  "supplier.view": "Supplier",
  "supplier.create": "Supplier",
  "supplier.update": "Supplier",
  "supplier.delete": "Supplier",

  "warehouse.view": "Warehouse",
  "warehouse.create": "Warehouse",
  "warehouse.update": "Warehouse",
  "warehouse.delete": "Warehouse",
  "warehouse.import": "Warehouse",
  "warehouse.transfer": "Warehouse",
  "warehouse.receive": "Warehouse",
  "warehouse.adjust": "Warehouse",
  "warehouse.ship": "Warehouse",
  "warehouse.return": "Warehouse",

  "inventory.view": "Inventory",
  "inventory-adjustment.view": "InventoryAdjustment",
  "inventory-adjustment.create": "InventoryAdjustment",

  "order.view": "Order",
  "order.create": "Order",
  "order.update": "Order",
  "order.delete": "Order",
  "order.confirm": "Order",
  "order.cancel": "Order",
  "order.history": "Order",
  "order.revenue": "Order",
  "order.reserve_stock": "Order",

  "facebook-page.view": "FacebookPage",
  "facebook-page.create": "FacebookPage",
  "facebook-page.update": "FacebookPage",
  "facebook-page.delete": "FacebookPage",

  "facebook-page-assignment.view": "FacebookPageAssignment",
  "facebook-page-assignment.create": "FacebookPageAssignment",
  "facebook-page-assignment.update": "FacebookPageAssignment",
  "facebook-page-assignment.delete": "FacebookPageAssignment",

  "combo.view": "Combo",
  "combo.create": "Combo",
  "combo.update": "Combo",
  "combo.delete": "Combo",

  "gift.view": "Gift",
  "gift.create": "Gift",
  "gift.update": "Gift",
  "gift.delete": "Gift",

  "lead.view": "Lead",
  "lead.create": "Lead",
  "lead.update": "Lead",
  "lead.delete": "Lead",
  "lead.assign": "Lead",

  // Marketing Order (Sprint 8.x)
  "marketing-order.viewAll": "MarketingOrder",
  "marketing-order.filterByArea": "MarketingOrder",

  "marketing-expense.view": "MarketingExpense",
  "marketing-expense.create": "MarketingExpense",
  "marketing-expense.update": "MarketingExpense",
  "marketing-expense.delete": "MarketingExpense",
  "marketing-expense.lock": "MarketingExpense",
  "marketing-expense.reopen": "MarketingExpense",

  "report.view": "Report",

  // Sprint Settings — Exchange Rate
  "settings.exchange_rate.view": "Setting",
  "settings.exchange_rate.update": "Setting",

  // Sprint Settings — Shipping Fee
  "settings.shipping_fee.view": "Setting",
  "settings.shipping_fee.update": "Setting",

  // System Settings — module-level gate (Phase 8 — Permission Audit)
  "system-settings.view": "Setting",
  "system-settings.manage": "Setting",

  // Language Settings
  "settings.language.view": "Setting",
  "settings.language.update": "Setting",

  // Login History
  "login-history.view": "LoginHistory",
  "login-history.viewAll": "LoginHistory",
};

import { PERMISSIONS } from "@/constants/permissions";

export type PermissionGroup = {
  /** Module display name (e.g. "Order", "Setting") */
  module: string;
  /** Permission rows belonging to this module, in declaration order */
  permissions: Array<{ code: string; name: string }>;
};

/**
 * Group all known permissions by their module bucket.
 *
 * Deterministic order:
 *   1. Module groups appear in the order they were first encountered
 *      in `PERMISSIONS`.
 *   2. Within each group, permissions follow the order in `PERMISSIONS`.
 *
 * Unmapped codes (seed fallback "General") are collected last under
 * the synthetic "General" bucket.
 */
export function getPermissionsGroupedByModule(): PermissionGroup[] {
  const groups = new Map<string, { code: string; name: string }[]>();
  const order: string[] = [];

  for (const p of PERMISSIONS) {
    const module = PERMISSION_MODULE_MAP[p.code] ?? "General";
    if (!groups.has(module)) {
      groups.set(module, []);
      order.push(module);
    }
    groups.get(module)!.push({ code: p.code, name: p.name });
  }

  return order.map((module) => ({
    module,
    permissions: groups.get(module)!,
  }));
}

/**
 * Validate that every code in `codes` is a known permission.
 *
 * Returns the list of unknown codes (empty = OK). Used by
 * `/api/roles/[id]/permissions` to reject unknown inputs.
 */
export function findUnknownPermissions(codes: string[]): string[] {
  const known = new Set(PERMISSIONS.map((p) => p.code));
  const seen = new Set<string>();
  const unknown: string[] = [];
  for (const c of codes) {
    if (seen.has(c)) continue;
    seen.add(c);
    if (!known.has(c)) unknown.push(c);
  }
  return unknown;
}

/**
 * Resolve a role's effective permission set.
 *
 * Rules:
 *   - If the persisted role permissions already include "*" (wildcard),
 *     we treat the role as having FULL ACCESS — no enumeration.
 *   - Otherwise we return the persisted codes verbatim (deduped).
 *
 * Note: ADMIN gets its wildcard from `constants/roles.ts` at seed time,
 * not from `RolePermission`. The current implementation surfaces
 * `"*"` only if the runtime role is explicitly given the wildcard.
 * The page layer additionally treats role.code === "ADMIN" as
 * wildcard, matching the seed-time invariant.
 */
export function resolveRolePermissionSet(persisted: string[]): {
  wildcard: boolean;
  codes: string[];
} {
  const dedup = Array.from(new Set(persisted));
  if (dedup.includes("*")) {
    return { wildcard: true, codes: [] };
  }
  return { wildcard: false, codes: dedup };
}

/**
 * Tri-state for a permission row (or module bucket) in the tree UI:
 *
 *   "full"    → all child permissions granted
 *   "partial" → some (but not all) child permissions granted
 *   "none"    → no child permissions granted
 *
 * `grantedCodes` is the role's effective set (codes only, no wildcard).
 * `allCodes` is the full set of codes that *could* be granted for
 * this bucket.
 */
export type TriState = "full" | "partial" | "none";

export function computeTriState(
  grantedCodes: ReadonlyArray<string>,
  allCodes: ReadonlyArray<string>,
  wildcard: boolean,
): TriState {
  if (wildcard) return "full";
  const granted = grantedCodes.filter((c) => allCodes.includes(c));
  if (granted.length === 0) return "none";
  if (granted.length === allCodes.length) return "full";
  return "partial";
}

/**
 * Toggle one permission code in a working set.
 *
 * Returns a NEW array — caller is responsible for state immutability.
 */
export function togglePermissionCode(
  grantedCodes: ReadonlyArray<string>,
  code: string,
  force?: boolean,
): string[] {
  const has = grantedCodes.includes(code);
  const shouldHave = force ?? !has;
  if (shouldHave) {
    if (has) return [...grantedCodes];
    return [...grantedCodes, code];
  }
  return grantedCodes.filter((c) => c !== code);
}

/**
 * Toggle ALL permission codes in a bucket.
 *
 * `force` semantics:
 *   - "full"    → grant everything
 *   - "none"    → revoke everything
 *   - "partial" → grant everything (user intent on indeterminate box)
 *
 * Returns the new codes array.
 */
export function toggleBucketCodes(
  grantedCodes: ReadonlyArray<string>,
  bucketCodes: ReadonlyArray<string>,
  target: TriState,
): string[] {
  const grantedSet = new Set(grantedCodes);
  if (target === "full") {
    for (const c of bucketCodes) grantedSet.add(c);
  } else if (target === "none") {
    for (const c of bucketCodes) grantedSet.delete(c);
  } else {
    // partial — treat user click as "grant all"
    for (const c of bucketCodes) grantedSet.add(c);
  }
  return Array.from(grantedSet);
}

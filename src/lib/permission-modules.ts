/**
 * Permission → module-group mapping (Phase 9 — RBAC UI).
 *
 * Re-exports the `MODULE_MAP` defined in `db/seeds/permissions.seed.ts`
 * so both the seed file and the new `/api/permissions` endpoint can
 * share the same single source of truth. Avoids the alternative of
 * hardcoding the map twice and drifting them apart.
 *
 * IMPORTANT: when adding a new permission code to
 * `constants/permissions.ts`, ALSO add it here under the appropriate
 * module group. The seed runs `updateOne(..., { upsert: true })` for
 * each entry, so missing entries fall back to "General" — they are
 * still persisted, just bucketed under a generic module name.
 *
 * Adding a new module group? Update:
 *   1. this file (the mapping)
 *   2. `db/seeds/permissions.seed.ts` `MODULE_MAP`
 *   3. (optional) UI ordering in `getPermissionsGroupedByModule()`
 */

export { MODULE_MAP as PERMISSION_MODULE_MAP } from "@/db/seeds/permissions.seed";

import { PERMISSIONS } from "@/constants/permissions";
import { PERMISSION_MODULE_MAP } from "./permission-modules";

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

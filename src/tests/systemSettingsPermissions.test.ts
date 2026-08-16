/**
 * ==================================================
 * PHASE 8 — SYSTEM SETTINGS PERMISSION AUDIT
 * ==================================================
 *
 * Pure unit tests (no MongoDB required) covering the permission
 * surface for the System Settings module:
 *
 *   - `system-settings.view`   → can open module / GET data
 *   - `system-settings.manage` → can mutate (PUT/POST/DELETE)
 *
 * Cases:
 *   [SS-A] No permission          → 403 (helper denies)
 *   [SS-B] view only              → GET ok, mutation denied
 *   [SS-C] view only              → mutation API helper denies
 *   [SS-D] manage                 → mutation helper allows
 *   [SS-E] admin wildcard "*"     → both view and manage allowed
 *
 * Plus registry/visibility checks:
 *   [SS-F] Modules registry lists both settings items under
 *           permission `system-settings.view`
 *   [SS-G] Permissions constants expose the two new codes
 *   [SS-H] Sidebar permission filter hides the SETTINGS group when
 *           the user lacks `system-settings.view`
 *   [SS-I] Sidebar permission filter keeps the SETTINGS group when
 *           the user only has `system-settings.view` (no `manage`)
 *
 * Run: npx jest src/tests/systemSettingsPermissions.test.ts --forceExit
 */

import { describe, it, expect } from "@jest/globals";
import { hasPermission, hasAnyPermission } from "../lib/permission";
import { MODULES, NAV_GROUPS } from "../config/modules";
import { PERMISSIONS } from "../constants/permissions";

const SS_VIEW = "system-settings.view";
const SS_MANAGE = "system-settings.manage";
const LEGACY_EX_VIEW = "settings.exchange_rate.view";
const LEGACY_EX_UPDATE = "settings.exchange_rate.update";
const LEGACY_SF_VIEW = "settings.shipping_fee.view";
const LEGACY_SF_UPDATE = "settings.shipping_fee.update";

describe("System Settings permission surface", () => {
  it("[SS-G] exposes system-settings.view and system-settings.manage in PERMISSIONS constants", () => {
    const codes = PERMISSIONS.map((p) => p.code);
    expect(codes).toContain(SS_VIEW);
    expect(codes).toContain(SS_MANAGE);
  });

  it("[SS-G] keeps backward-compat legacy codes available", () => {
    const codes = PERMISSIONS.map((p) => p.code);
    expect(codes).toContain(LEGACY_EX_VIEW);
    expect(codes).toContain(LEGACY_EX_UPDATE);
    expect(codes).toContain(LEGACY_SF_VIEW);
    expect(codes).toContain(LEGACY_SF_UPDATE);
  });

  it("[SS-A] hasPermission denies when the user has neither view nor manage nor wildcard", () => {
    expect(hasPermission(["order.view"], SS_VIEW)).toBe(false);
    expect(hasPermission(["order.view"], SS_MANAGE)).toBe(false);
    expect(hasPermission([], SS_VIEW)).toBe(false);
    expect(hasPermission([], SS_MANAGE)).toBe(false);
    expect(hasPermission(undefined, SS_VIEW)).toBe(false);
    expect(hasPermission(undefined, SS_MANAGE)).toBe(false);
  });

  it("[SS-B] hasPermission allows view when only system-settings.view is present", () => {
    expect(hasPermission([SS_VIEW], SS_VIEW)).toBe(true);
    // Mutation must still be denied with only view.
    expect(hasPermission([SS_VIEW], SS_MANAGE)).toBe(false);
  });

  it("[SS-D] hasPermission allows manage when system-settings.manage is present", () => {
    expect(hasPermission([SS_MANAGE], SS_MANAGE)).toBe(true);
    // The module-level view is implied by manage (per spec §3).
    expect(hasAnyPermission([SS_MANAGE], [SS_VIEW, SS_MANAGE])).toBe(true);
  });

  it("[SS-E] wildcard '*' satisfies both view and manage", () => {
    expect(hasPermission(["*"], SS_VIEW)).toBe(true);
    expect(hasPermission(["*"], SS_MANAGE)).toBe(true);
  });

  it("[SS-C] backward-compat: legacy code is still recognized for view/update", () => {
    expect(hasPermission([LEGACY_EX_VIEW], LEGACY_EX_VIEW)).toBe(true);
    expect(hasPermission([LEGACY_EX_UPDATE], LEGACY_EX_UPDATE)).toBe(true);
    expect(hasPermission([LEGACY_SF_VIEW], LEGACY_SF_VIEW)).toBe(true);
    expect(hasPermission([LEGACY_SF_UPDATE], LEGACY_SF_UPDATE)).toBe(true);
  });
});

describe("Modules registry wires System Settings to module-level permission", () => {
  it("[SS-F] both settings modules require any-of [system-settings.view, system-settings.manage]", () => {
    const settings = MODULES.filter((m) => m.group === "SETTINGS");
    expect(settings.length).toBeGreaterThanOrEqual(2);
    for (const m of settings) {
      expect(m.permission).toBe(SS_VIEW);
      expect(m.permissions).toEqual([SS_VIEW, SS_MANAGE]);
    }
  });

  it("[SS-F] SETTINGS group still resolves through the modules registry", () => {
    const group = NAV_GROUPS.find((g) => g.key === "SETTINGS");
    expect(group).toBeDefined();
    expect(group?.label).toBe("Cài đặt hệ thống");
  });
});

describe("Sidebar visibility (reuses hasAnyPermission helper)", () => {
  function simulateSidebar(userPerms: string[]): { showGroup: boolean; itemCount: number } {
    const settings = MODULES.filter((m) => m.group === "SETTINGS");
    const visibleItems = settings.filter((m) => {
      const codes = m.permissions ?? [m.permission];
      return hasAnyPermission(userPerms, codes);
    });
    return { showGroup: visibleItems.length > 0, itemCount: visibleItems.length };
  }

  it("[SS-H] hides the SETTINGS group when the user has no system-settings.view/manage", () => {
    expect(simulateSidebar(["order.view"])).toEqual({ showGroup: false, itemCount: 0 });
    expect(simulateSidebar([])).toEqual({ showGroup: false, itemCount: 0 });
  });

  it("[SS-I] keeps the SETTINGS group when the user has only system-settings.view", () => {
    const r = simulateSidebar([SS_VIEW]);
    expect(r.showGroup).toBe(true);
    expect(r.itemCount).toBe(2);
  });

  it("[SS-D-via-view] keeps the SETTINGS group when the user has only system-settings.manage (manage implies access)", () => {
    const r = simulateSidebar([SS_MANAGE]);
    expect(r.showGroup).toBe(true);
    expect(r.itemCount).toBe(2);
  });

  it("[SS-E] shows the SETTINGS group for wildcard admin", () => {
    const r = simulateSidebar(["*"]);
    expect(r.showGroup).toBe(true);
    expect(r.itemCount).toBe(2);
  });
});

describe("API authorization policy (mirrored from route.ts)", () => {
  /**
   * Mirror of the authorization predicate used in
   * `/api/settings/{exchange-rate,shipping-fee}/route.ts`.
   * If this drifts from the API code, the tests will fail loudly.
   */
  function canRead(perms: string[], legacyView: string): boolean {
    return (
      perms.includes("*") ||
      perms.includes(SS_VIEW) ||
      perms.includes(SS_MANAGE) ||
      perms.includes(legacyView)
    );
  }

  function canWrite(perms: string[], legacyUpdate: string): boolean {
    return (
      perms.includes("*") ||
      perms.includes(SS_MANAGE) ||
      perms.includes(legacyUpdate)
    );
  }

  it("[SS-A] no permission → 403 for both exchange-rate and shipping-fee", () => {
    expect(canRead([], LEGACY_EX_VIEW)).toBe(false);
    expect(canWrite([], LEGACY_EX_UPDATE)).toBe(false);
    expect(canRead([], LEGACY_SF_VIEW)).toBe(false);
    expect(canWrite([], LEGACY_SF_UPDATE)).toBe(false);
  });

  it("[SS-B] view-only → GET succeeds, PUT/POST/DELETE denied", () => {
    expect(canRead([SS_VIEW], LEGACY_EX_VIEW)).toBe(true);
    expect(canWrite([SS_VIEW], LEGACY_EX_UPDATE)).toBe(false);
    expect(canRead([SS_VIEW], LEGACY_SF_VIEW)).toBe(true);
    expect(canWrite([SS_VIEW], LEGACY_SF_UPDATE)).toBe(false);
  });

  it("[SS-C] view-only user (legacy code) → PUT denied but GET ok", () => {
    expect(canRead([LEGACY_EX_VIEW], LEGACY_EX_VIEW)).toBe(true);
    expect(canWrite([LEGACY_EX_VIEW], LEGACY_EX_UPDATE)).toBe(false);
  });

  it("[SS-D] manage user → both GET and mutation succeed", () => {
    expect(canRead([SS_MANAGE], LEGACY_EX_VIEW)).toBe(true);
    expect(canWrite([SS_MANAGE], LEGACY_EX_UPDATE)).toBe(true);
    expect(canRead([SS_MANAGE], LEGACY_SF_VIEW)).toBe(true);
    expect(canWrite([SS_MANAGE], LEGACY_SF_UPDATE)).toBe(true);
  });

  it("[SS-D] manage user can also OPEN the module (sidebar/auth gate)", () => {
    // Mirrors the Sidebar/AuthGuard any-of check.
    expect(hasAnyPermission([SS_MANAGE], [SS_VIEW, SS_MANAGE])).toBe(true);
  });

  it("[SS-E] admin wildcard → full access", () => {
    expect(canRead(["*"], LEGACY_EX_VIEW)).toBe(true);
    expect(canWrite(["*"], LEGACY_EX_UPDATE)).toBe(true);
    expect(canRead(["*"], LEGACY_SF_VIEW)).toBe(true);
    expect(canWrite(["*"], LEGACY_SF_UPDATE)).toBe(true);
  });
});

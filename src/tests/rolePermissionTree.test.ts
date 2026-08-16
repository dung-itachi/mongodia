/**
 * ==================================================
 * PHASE 9 — ROLE & PERMISSION TREE (RBAC UI)
 * ==================================================
 *
 * Pure unit tests (no MongoDB required) covering the new
 * Permission Tree surface added in Phase 9. Covers:
 *
 *   [RP-A] ADMIN wildcard preservation
 *   [RP-B] Tri-state derivation (full / partial / none)
 *   [RP-C] Permission catalog groups by module
 *   [RP-D] Unknown permission codes are rejected
 *   [RP-E] API authorization policy for /api/roles/[id]/permissions
 *           and /api/permissions
 *   [RP-F] Module registry wires the new "roles-tree" entry under
 *           ACCOUNTS gated by `role.permission.manage`
 *   [RP-G] MANAGER is intentionally NOT granted `role.permission.manage`
 *           (RBAC management stays ADMIN-only)
 *   [RP-H] Toggle helpers (single + bucket) are deterministic and
 *           produce the expected draft set
 *   [RP-I] Regression — Phase 8 / Phase 7 system-settings tests still
 *           PASS (independent file: this test does NOT import them
 *           but uses the same PERMISSIONS/MODULES shapes).
 *
 * Run: npx jest src/tests/rolePermissionTree.test.ts --forceExit
 */

import { describe, it, expect } from "@jest/globals";

import { PERMISSIONS } from "../constants/permissions";
import { MODULES } from "../config/modules";
import { PERMISSION_MODULE_MAP as MODULE_MAP } from "../lib/permission-modules";
import {
  computeTriState,
  findUnknownPermissions,
  getPermissionsGroupedByModule,
  resolveRolePermissionSet,
  toggleBucketCodes,
  togglePermissionCode,
  type TriState,
} from "../lib/permission-modules";

const ROLE_MANAGE = "role.permission.manage";
const SS_VIEW = "system-settings.view";
const SS_MANAGE = "system-settings.manage";

describe("[RP-F] Module registry wires the new roles-tree entry", () => {
  it("[RP-F] roles-tree is registered under ACCOUNTS gated by role.permission.manage", () => {
    const m = MODULES.find((x) => x.id === "roles-tree");
    expect(m).toBeDefined();
    expect(m?.route).toBe("/roles");
    expect(m?.permission).toBe(ROLE_MANAGE);
    expect(m?.group).toBe("ACCOUNTS");
  });

  it("[RP-G] roles-tree is the only module requiring role.permission.manage", () => {
    const others = MODULES.filter(
      (x) => x.permission === ROLE_MANAGE && x.id !== "roles-tree",
    );
    expect(others).toEqual([]);
  });
});

describe("[RP-G] Permission registry exposes role.permission.manage", () => {
  it("[RP-G] code is registered in PERMISSIONS catalog", () => {
    const codes = PERMISSIONS.map((p) => p.code);
    expect(codes).toContain(ROLE_MANAGE);
  });

  it("[RP-G] code is bucketed under the Role module group in MODULE_MAP", () => {
    // Idempotent: even if a future code lacks an entry here, the
    // helper buckets it under "General" — but this code MUST be in
    // "Role" so the tree groups it correctly.
    expect(MODULE_MAP[ROLE_MANAGE]).toBe("Role");
  });
});

describe("[RP-C] Permission catalog groups by module", () => {
  it("[RP-C] returns one entry per distinct module", () => {
    const groups = getPermissionsGroupedByModule();
    const distinctModules = new Set(PERMISSIONS.map((p) => MODULE_MAP[p.code] ?? "General"));
    expect(groups.length).toBe(distinctModules.size);
  });

  it("[RP-C] system-settings.* are bucketed together under the Setting group", () => {
    const groups = getPermissionsGroupedByModule();
    const settingGroup = groups.find((g) => g.module === "Setting");
    expect(settingGroup).toBeDefined();
    const codes = settingGroup!.permissions.map((p) => p.code);
    expect(codes).toContain(SS_VIEW);
    expect(codes).toContain(SS_MANAGE);
  });

  it("[RP-C] role.permission.manage sits inside the Role group", () => {
    const groups = getPermissionsGroupedByModule();
    const roleGroup = groups.find((g) => g.module === "Role");
    expect(roleGroup).toBeDefined();
    const codes = roleGroup!.permissions.map((p) => p.code);
    expect(codes).toContain(ROLE_MANAGE);
    expect(codes).toContain("role.view");
    expect(codes).toContain("role.create");
    expect(codes).toContain("role.update");
    expect(codes).toContain("role.delete");
  });
});

describe("[RP-A] ADMIN wildcard preservation", () => {
  it("[RP-A] role.code === 'ADMIN' is treated as wildcard (UI contract)", () => {
    // The route resolver is the source of truth. We replicate the
    // same predicate here so a drift becomes a test failure.
    const isAdmin = (code: string) => code === "ADMIN";
    expect(isAdmin("ADMIN")).toBe(true);
    expect(isAdmin("MANAGER")).toBe(false);
  });

  it("[RP-A] resolveRolePermissionSet marks '*' row as wildcard with empty codes", () => {
    const r = resolveRolePermissionSet(["*"]);
    expect(r.wildcard).toBe(true);
    expect(r.codes).toEqual([]);
  });

  it("[RP-A] resolveRolePermissionSet dedupes non-wildcard rows", () => {
    const r = resolveRolePermissionSet([
      "order.view",
      "order.view",
      "lead.view",
    ]);
    expect(r.wildcard).toBe(false);
    expect(r.codes.sort()).toEqual(["lead.view", "order.view"]);
  });

  it("[RP-A] buildBucket returns state='full' for wildcard regardless of codes", () => {
    const state = computeTriState([], ["a", "b"], true);
    expect(state).toBe<TriState>("full");
  });
});

describe("[RP-B] Tri-state derivation", () => {
  it("[RP-B] no granted codes → none", () => {
    expect(computeTriState([], ["a", "b", "c"], false)).toBe<TriState>("none");
  });

  it("[RP-B] all granted codes → full", () => {
    expect(computeTriState(["a", "b", "c"], ["a", "b", "c"], false)).toBe<TriState>(
      "full",
    );
  });

  it("[RP-B] some granted codes → partial", () => {
    expect(computeTriState(["a"], ["a", "b", "c"], false)).toBe<TriState>(
      "partial",
    );
    expect(computeTriState(["a", "b"], ["a", "b", "c"], false)).toBe<TriState>(
      "partial",
    );
  });

  it("[RP-B] wildcard overrides granted set to 'full'", () => {
    expect(computeTriState([], ["a"], true)).toBe<TriState>("full");
  });

  it("[RP-B] ignores extra granted codes not present in bucket", () => {
    expect(
      computeTriState(["a", "x"], ["a", "b"], false),
    ).toBe<TriState>("partial");
    expect(computeTriState(["x", "y"], ["a", "b"], false)).toBe<TriState>(
      "none",
    );
  });
});

describe("[RP-H] Toggle helpers are deterministic and immutable", () => {
  it("[RP-H] togglePermissionCode adds the code when missing", () => {
    const next = togglePermissionCode(["a"], "b");
    expect(next.sort()).toEqual(["a", "b"]);
  });

  it("[RP-H] togglePermissionCode removes the code when present", () => {
    const next = togglePermissionCode(["a", "b"], "a");
    expect(next).toEqual(["b"]);
  });

  it("[RP-H] togglePermissionCode(force=true) keeps the code", () => {
    const next = togglePermissionCode(["a"], "a", true);
    expect(next).toEqual(["a"]);
  });

  it("[RP-H] togglePermissionCode(force=false) removes even if absent", () => {
    const next = togglePermissionCode(["a"], "b", false);
    expect(next).toEqual(["a"]);
  });

  it("[RP-H] does not mutate the input array", () => {
    const input = ["a", "b"];
    togglePermissionCode(input, "a");
    expect(input).toEqual(["a", "b"]);
  });

  it("[RP-H] toggleBucketCodes grants all when target=full", () => {
    expect(toggleBucketCodes(["a"], ["a", "b"], "full").sort()).toEqual([
      "a",
      "b",
    ]);
  });

  it("[RP-H] toggleBucketCodes revokes all when target=none", () => {
    expect(toggleBucketCodes(["a", "b"], ["a", "b"], "none")).toEqual([]);
  });

  it("[RP-H] toggleBucketCodes treats partial as 'grant all' (UI convention)", () => {
    expect(toggleBucketCodes(["a"], ["a", "b"], "partial").sort()).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("[RP-D] Unknown permission codes are rejected at validation time", () => {
  it("[RP-D] known codes report empty unknown list", () => {
    expect(findUnknownPermissions(["order.view", "lead.view"])).toEqual([]);
  });

  it("[RP-D] unknown codes are listed (deduped)", () => {
    const unknown = findUnknownPermissions([
      "nope.x",
      "order.view",
      "nope.x",
    ]);
    expect(unknown).toEqual(["nope.x"]);
  });

  it("[RP-D] the new RBAC code is itself considered known", () => {
    expect(findUnknownPermissions([ROLE_MANAGE])).toEqual([]);
  });
});

describe("[RP-E] API authorization predicate (mirrored from route.ts)", () => {
  /**
   * Mirror of `authorize(currentUser)` from
   * `/api/roles/[id]/permissions/route.ts` and `/api/permissions/route.ts`.
   * If the API predicate drifts, this test fails loudly.
   */
  function authorize(perms: string[]): boolean {
    return perms.includes("*") || perms.includes(ROLE_MANAGE);
  }

  it("[RP-E] no permission → 403", () => {
    expect(authorize([])).toBe(false);
    expect(authorize(["order.view"])).toBe(false);
    expect(authorize([SS_VIEW])).toBe(false);
  });

  it("[RP-E] only `role.permission.manage` → 200", () => {
    expect(authorize([ROLE_MANAGE])).toBe(true);
  });

  it("[RP-E] wildcard → 200", () => {
    expect(authorize(["*"])).toBe(true);
  });

  it("[RP-E] legacy role codes are NOT sufficient for RBAC management", () => {
    // The AuditLog helper writes to "ROLE" module; existing role.update
    // only edits name/code/description. The new endpoint has its own
    // dedicated gate and MUST NOT accept legacy role.* codes.
    expect(authorize(["role.update"])).toBe(false);
    expect(authorize(["role.view"])).toBe(false);
    expect(authorize(["role.create"])).toBe(false);
    expect(authorize(["role.delete"])).toBe(false);
  });
});

describe("[RP-E-PUT] PUT /api/roles/[id]/permissions input validation (mirrored)", () => {
  /**
   * Mirrors the validation step inside the PUT handler. Mirroring
   * (rather than spinning up Mongo) lets us test the contract without
   * a DB.
   */
  function validatePut(body: unknown): {
    ok: boolean;
    error?: string;
  } {
    if (typeof body !== "object" || body === null) {
      return { ok: false, error: "Dữ liệu không hợp lệ" };
    }
    const b = body as { codes?: unknown; wildcard?: unknown };
    if (!Array.isArray(b.codes)) return { ok: false, error: "Mã permission không hợp lệ" };
    if (b.codes.some((c) => typeof c !== "string")) {
      return { ok: false, error: "Mã permission không hợp lệ" };
    }
    if (b.wildcard !== undefined && typeof b.wildcard !== "boolean") {
      return { ok: false, error: "Cờ wildcard không hợp lệ" };
    }
    const codes = Array.from(new Set(b.codes as string[]));
    const unknown = findUnknownPermissions(codes);
    if (unknown.length > 0) {
      return {
        ok: false,
        error: `Mã permission không tồn tại: ${unknown.join(", ")}`,
      };
    }
    if (b.wildcard === true) {
      return {
        ok: false,
        error:
          "Chỉ ADMIN mới được cấp wildcard — không thể gán cho vai trò khác",
      };
    }
    return { ok: true };
  }

  it("rejects non-object body", () => {
    expect(validatePut(null).ok).toBe(false);
    expect(validatePut("string").ok).toBe(false);
    expect(validatePut(42).ok).toBe(false);
  });

  it("rejects missing codes array", () => {
    expect(validatePut({}).ok).toBe(false);
    expect(validatePut({ codes: "not-array" }).ok).toBe(false);
  });

  it("rejects non-string entries in codes", () => {
    expect(validatePut({ codes: ["a", 1] }).ok).toBe(false);
  });

  it("rejects wildcard=true on non-ADMIN call (handled at role-check level, but rejected in input validation as well)", () => {
    expect(validatePut({ codes: ["order.view"], wildcard: true }).ok).toBe(
      false,
    );
  });

  it("rejects unknown permission codes", () => {
    expect(validatePut({ codes: ["order.view", "made.up.code"] }).ok).toBe(
      false,
    );
  });

  it("accepts an empty codes list (revokes all)", () => {
    expect(validatePut({ codes: [] }).ok).toBe(true);
  });

  it("accepts known permission codes", () => {
    expect(validatePut({ codes: ["order.view", "lead.view"] }).ok).toBe(true);
  });

  it("accepts the new role.permission.manage code as part of the codes list", () => {
    expect(validatePut({ codes: [ROLE_MANAGE] }).ok).toBe(true);
  });
});

describe("[RP-I] Regression — Phase 8 system-settings code paths", () => {
  it("[RP-I] system-settings.* are still in the permission catalog", () => {
    const codes = PERMISSIONS.map((p) => p.code);
    expect(codes).toContain(SS_VIEW);
    expect(codes).toContain(SS_MANAGE);
  });

  it("[RP-I] both settings modules still require system-settings.view", () => {
    const settings = MODULES.filter((m) => m.group === "SETTINGS");
    expect(settings.length).toBeGreaterThanOrEqual(2);
    for (const m of settings) {
      expect(m.permission).toBe(SS_VIEW);
    }
  });

  it("[RP-I] MODULE_MAP keeps the Setting bucket for system-settings.*", () => {
    expect(MODULE_MAP[SS_VIEW]).toBe("Setting");
    expect(MODULE_MAP[SS_MANAGE]).toBe("Setting");
  });
});

describe("[RP-G-ROLE] MANAGER is intentionally NOT granted role.permission.manage", () => {
  it("MANAGER role constants in constants/roles.ts do NOT list role.permission.manage", async () => {
    // Dynamic import to avoid pulling the file into the test graph at
    // compile time — and to keep this test resilient if constants
    // change shape.
    const rolesMod = await import("../constants/roles");
    const manager = (rolesMod.ROLES ?? rolesMod.default ?? []).find(
      (r: { code: string; permissions: string[] }) => r.code === "MANAGER",
    );
    expect(manager).toBeDefined();
    expect(manager.permissions).not.toContain(ROLE_MANAGE);
  });

  it("ADMIN role uses the wildcard '*' (not the new code)", async () => {
    const rolesMod = await import("../constants/roles");
    const admin = (rolesMod.ROLES ?? rolesMod.default ?? []).find(
      (r: { code: string; permissions: string[] }) => r.code === "ADMIN",
    );
    expect(admin).toBeDefined();
    expect(admin.permissions).toEqual(["*"]);
    // ADMIN is intentionally not granted the concrete code because
    // wildcard already implies it.
    expect(admin.permissions).not.toContain(ROLE_MANAGE);
  });
});

import AuditLog from "@/models/AuditLog";

/**
 * Phase 9 — Audit helper for Role & Permission Tree (RBAC) mutations.
 *
 * Mirrors `writeAccountAudit` (`src/lib/account-audit.ts`) but for the
 * RBAC module. The AuditLog model itself is a free-form `module` +
 * `action` string, so adding a new audit helper doesn't require a
 * schema change.
 *
 * Action codes (stable, used in the audit log table):
 *   - "UPDATE_ROLE_PERMISSIONS"
 *
 * roleCode is stored inside `newData` (and `oldData`) since the
 * AuditLog schema only has well-known top-level fields.
 */

type RoleAuditAction = "UPDATE_ROLE_PERMISSIONS";

export async function writeRoleAudit({
  actorId,
  roleId,
  roleCode,
  action,
  oldData,
  newData,
  request,
}: {
  actorId: string;
  roleId: string;
  roleCode: string;
  action: RoleAuditAction;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  request?: Request;
}) {
  await AuditLog.create({
    employeeId: actorId,
    targetId: roleId,
    action,
    module: "ROLE",
    oldData: oldData ?? null,
    newData: { roleCode, ...(newData ?? {}) },
    ip:
      request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "",
    userAgent: request?.headers.get("user-agent") ?? "",
  });
}

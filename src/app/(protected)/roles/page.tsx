"use client";

/**
 * /roles — Phase 9 — Role & Permission Tree (RBAC management).
 *
 * Replaces the legacy "Coming Soon" placeholder with the real
 * Permission Tree page. Gating happens twice:
 *
 *   1. The route is gated by the `roles-tree` module in
 *      `src/config/modules.ts`, which uses the `role.permission.manage`
 *      permission. AuthGuard will redirect users without it to /403.
 *   2. The page itself reads the auth store and shows an inline Alert
 *      if for any reason the user reaches it without the permission
 *      (defense in depth, e.g. session refresh races).
 *
 * The tree's data is fetched via:
 *   - GET /api/roles                              → role list sidebar
 *   - GET /api/permissions                        → permission catalog
 *   - GET /api/roles/[id]/permissions             → current role's grants
 *   - PUT /api/roles/[id]/permissions             → save edits
 *
 * All four endpoints enforce `role.permission.manage` server-side.
 * ADMIN wildcard is rendered as read-only with a "⭐ FULL ACCESS" badge.
 */

import { useAuthStore } from "@/store/auth.store";
import PermissionTreePage from "./PermissionTreePage";

export default function RolesPage() {
  const user = useAuthStore((s) => s.user);
  const currentUserPermissions = user?.permissions ?? [];
  return (
    <PermissionTreePage
      currentUserPermissions={currentUserPermissions}
    />
  );
}

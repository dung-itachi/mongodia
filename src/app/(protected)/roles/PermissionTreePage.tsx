"use client";

import { useEffect, useMemo, useState } from "react";

import { Alert, Checkbox, Input, Spin } from "antd";

import PageHeader from "@/components/common/layout/PageHeader";
import ConfirmDialog from "@/components/common/feedback/ConfirmDialog";

import {
  usePermissionsCatalog,
  type PermissionGroup,
} from "@/hooks/usePermissionsCatalog";
import { useRoleList, type RoleSummary } from "@/hooks/useRoleList";
import {
  useRolePermissions,
  useUpdateRolePermissions,
} from "@/hooks/useRolePermissions";
import { useUpdateRoleWithVisibleGroups } from "@/hooks/useUpdateRoleVisibleGroups";
import { useAntApp } from "@/providers/AntdProvider";

import {
  computeTriState,
  toggleBucketCodes,
  togglePermissionCode,
  type TriState,
} from "@/lib/permission-modules";
import { NAV_GROUPS as SIDEBAR_NAV_GROUPS } from "@/config/nav.config";

type Props = {
  /** Current user's permission list (from auth context). */
  currentUserPermissions: string[];
};

const TRISTATE_GLYPH: Record<TriState, string> = {
  full: "☑",
  partial: "▣",
  none: "☐",
};

const TRISTATE_LABEL: Record<TriState, string> = {
  full: "Full",
  partial: "Partial",
  none: "None",
};

function highlight(text: string, query: string) {
  if (!query) return text;
  const lower = text.toLowerCase();
  const target = query.toLowerCase();
  const idx = lower.indexOf(target);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="rpt-search-highlight">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}

type Bucket = {
  module: string;
  permissions: Array<{ code: string; name: string }>;
  state: TriState;
  all: string[];
  grantedCount: number;
};

function buildBucket(g: PermissionGroup, codes: string[], wildcard: boolean): Bucket {
  const all = g.permissions.map((p) => p.code);
  return {
    module: g.module,
    permissions: g.permissions,
    state: computeTriState(codes, all, wildcard),
    all,
    grantedCount: all.filter((c) => codes.includes(c)).length,
  };
}

export default function PermissionTreePage({ currentUserPermissions }: Props) {
  const { message } = useAntApp();

  const hasManagePerm =
    currentUserPermissions.includes("*") ||
    currentUserPermissions.includes("role.permission.manage");

  // -------- Data --------
  const rolesQ = useRoleList();
  const catalogQ = usePermissionsCatalog();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const rolePermsQ = useRolePermissions(selectedRoleId);

  // Pre-select the first role once they load.
  useEffect(() => {
    if (
      selectedRoleId === null &&
      rolesQ.data &&
      rolesQ.data.items.length > 0
    ) {
      setSelectedRoleId(rolesQ.data.items[0]._id);
    }
  }, [selectedRoleId, rolesQ.data]);

  // -------- Tree UI state --------
  const [roleSearch, setRoleSearch] = useState("");
  const [permSearch, setPermSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!catalogQ.data) return;
    setExpanded((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const next: Record<string, boolean> = {};
      for (const g of catalogQ.data!.groups) next[g.module] = true;
      return next;
    });
  }, [catalogQ.data]);

  // -------- Edit state --------
  const [draft, setDraft] = useState<string[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  useEffect(() => {
    setDraft(null);
  }, [selectedRoleId, rolePermsQ.data]);

  // -------- visibleGroups (sidebar scope) edit state --------
  const [visibleGroupsDraft, setVisibleGroupsDraft] = useState<string[] | null>(null);
  useEffect(() => {
    setVisibleGroupsDraft(null);
  }, [selectedRoleId, rolesQ.data]);

  // Roles that should NOT be edited via the visibleGroups panel
  // because their scope is decided elsewhere:
  //   - ADMIN: sees everything by definition (wildcard bypass).
  //   - LEADER: scope is resolved dynamically from Employee.teamId.code
  //     (MKT/SALE/WAREHOUSE → matching group). See Sidebar.tsx.
  const isAdminEditingDisabled =
    rolePermsQ.data?.isAdmin === true || rolePermsQ.data?.isWildcard === true;
  const isLeader = rolePermsQ.data?.role.code === "LEADER";

  const baseCodes = rolePermsQ.data?.grantedCodes ?? [];
  const sortedCompare = (a: string[]) => [...a].sort().join(",");
  const currentCodes: string[] = useMemo(() => {
    if (rolePermsQ.data?.isWildcard) return [];
    if (draft !== null) return draft;
    return baseCodes;
  }, [rolePermsQ.data, draft, baseCodes]);

  // Lookup current RoleSummary from the roles list so we can round-trip
  // code/name/description/isActive when PUTting the visibleGroups change.
  const currentRoleDetail = useMemo(() => {
    if (!rolePermsQ.data) return null;
    const found = (rolesQ.data?.items ?? []).find(
      (r) => r._id === rolePermsQ.data!.role._id,
    );
    if (!found) return null;
    return found;
  }, [rolePermsQ.data, rolesQ.data]);

  const currentVisibleGroups: string[] = useMemo(() => {
    if (visibleGroupsDraft !== null) return visibleGroupsDraft;
    return currentRoleDetail?.visibleGroups ?? [];
  }, [visibleGroupsDraft, currentRoleDetail]);

  const isVisibleGroupsDirty =
    visibleGroupsDraft !== null &&
    !isAdminEditingDisabled &&
    !isLeader &&
    currentRoleDetail !== null &&
    sortedCompare(currentVisibleGroups) !==
      sortedCompare(currentRoleDetail.visibleGroups ?? []);

  // Sidebar nav groups (filtered to those that actually have items in
  // the registry so we don't render dead toggles).
  const availableSidebarGroups = useMemo(
    () =>
      SIDEBAR_NAV_GROUPS.filter(
        (g) => (g.groupKey ?? "") !== "",
      ),
    [],
  );

  const isDirty =
    draft !== null &&
    !rolePermsQ.data?.isWildcard &&
    sortedCompare(currentCodes) !== sortedCompare(baseCodes);

  const added = useMemo(() => {
    const set = new Set(currentCodes);
    return baseCodes.filter((c) => !set.has(c));
  }, [baseCodes, currentCodes]);

  const removed = useMemo(() => {
    const set = new Set(currentCodes);
    return baseCodes.filter((c) => set.has(c) === false);
  }, [baseCodes, currentCodes]);

  // -------- Computed tree --------
  const tree = useMemo<Bucket[]>(() => {
    if (!catalogQ.data) return [];
    return catalogQ.data.groups.map((g) =>
      buildBucket(g, currentCodes, rolePermsQ.data?.isWildcard === true),
    );
  }, [catalogQ.data, currentCodes, rolePermsQ.data?.isWildcard]);

  const filteredTree = useMemo<Bucket[]>(() => {
    if (!permSearch.trim()) return tree;
    const q = permSearch.toLowerCase();
    return tree
      .map((bucket) => {
        const moduleMatches = bucket.module.toLowerCase().includes(q);
        const matchingPerms = bucket.permissions.filter(
          (p) =>
            p.code.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q),
        );
        if (moduleMatches) return bucket;
        if (matchingPerms.length > 0) {
          return { ...bucket, permissions: matchingPerms };
        }
        return null;
      })
      .filter((b): b is Bucket => b !== null);
  }, [tree, permSearch]);

  const stats = useMemo(() => {
    const totalPerms =
      catalogQ.data?.groups.reduce((s, g) => s + g.permissions.length, 0) ?? 0;
    return {
      totalPerms,
      totalGranted: currentCodes.length,
      modulesFull: tree.filter((b) => b.state === "full").length,
      modulesPartial: tree.filter((b) => b.state === "partial").length,
      modulesNone: tree.filter((b) => b.state === "none").length,
      modulesTotal: tree.length,
    };
  }, [catalogQ.data, tree, currentCodes]);

  // -------- Mutations --------
  const updateMut = useUpdateRolePermissions();
  const updateVisibleGroupsMut = useUpdateRoleWithVisibleGroups();

  function applySave() {
    if (!rolePermsQ.data || draft === null) return;
    updateMut.mutate(
      { roleId: rolePermsQ.data.role._id, codes: draft },
      {
        onSuccess: () => message.success("Cập nhật phân quyền thành công"),
        onError: (err: Error) =>
          message.error(err.message || "Cập nhật phân quyền thất bại"),
      },
    );
  }

  function resetDraft() {
    setDraft(null);
  }

  function toggleVisibleGroup(groupKey: string) {
    if (!rolePermsQ.data || !currentRoleDetail) return;
    setVisibleGroupsDraft((curr) => {
      const base = curr ?? currentRoleDetail.visibleGroups ?? [];
      const has = base.includes(groupKey);
      return has ? base.filter((g) => g !== groupKey) : [...base, groupKey];
    });
  }

  function saveVisibleGroups() {
    if (!rolePermsQ.data || !currentRoleDetail || visibleGroupsDraft === null) return;
    updateVisibleGroupsMut.mutate(
      {
        roleId: rolePermsQ.data.role._id,
        current: currentRoleDetail,
        visibleGroups: visibleGroupsDraft,
      },
      {
        onSuccess: () => {
          message.success("Cập nhật nhóm hiển thị thành công");
          setVisibleGroupsDraft(null);
        },
        onError: (err: Error) =>
          message.error(err.message || "Cập nhật nhóm hiển thị thất bại"),
      },
    );
  }

  function resetVisibleGroupsDraft() {
    setVisibleGroupsDraft(null);
  }

  function setBucketState(bucketModule: string, target: TriState) {
    const bucket = tree.find((b) => b.module === bucketModule);
    if (!bucket) return;
    setDraft((curr) => {
      const base = curr ?? baseCodes;
      return toggleBucketCodes(
        base,
        bucket.permissions.map((p) => p.code),
        target,
      );
    });
  }

  function setPermState(code: string) {
    setDraft((curr) => {
      const base = curr ?? baseCodes;
      return togglePermissionCode(base, code);
    });
  }

  if (!hasManagePerm) {
    return (
      <div>
        <PageHeader
          title="Vai trò & Phân quyền"
          subtitle="Quản lý role → module → permission"
        />
        <Alert
          type="error"
          showIcon
          message="Bạn không có quyền quản lý phân quyền"
          description="Trang này yêu cầu quyền role.permission.manage."
        />
      </div>
    );
  }

  const isLoadingAny =
    rolesQ.isLoading ||
    catalogQ.isLoading ||
    (Boolean(selectedRoleId) && rolePermsQ.isLoading);

  const filteredRoles = (rolesQ.data?.items ?? []).filter((r) => {
    if (!roleSearch.trim()) return true;
    const q = roleSearch.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Vai trò & Phân quyền"
        subtitle="Quản lý role → module → permission"
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Vai trò & Phân quyền" },
        ]}
      />

      {isLoadingAny && (
        <div style={{ padding: 32, textAlign: "center" }}>
          <Spin />
        </div>
      )}

      {!isLoadingAny && (
        <div className="rpt-shell">
          {/* ----------- Sidebar (roles) ----------- */}
          <div className="card rpt-sidebar">
            <div className="card-h">
              <h2>Vai trò</h2>
              <small>{rolesQ.data?.total ?? 0} roles</small>
            </div>
            <div className="card-body">
              <div className="rpt-sidebar-search">
                <Input.Search
                  placeholder="Tìm role..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  allowClear
                  size="small"
                />
              </div>
              <div className="rpt-role-list">
                {filteredRoles.length === 0 && (
                  <div className="rpt-filter-empty">Không có role phù hợp</div>
                )}
                {filteredRoles.map((r) => (
                  <RoleSidebarItem
                    key={r._id}
                    role={r}
                    active={r._id === selectedRoleId}
                    onClick={() => setSelectedRoleId(r._id)}
                    searchQuery={roleSearch}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ----------- Tree panel ----------- */}
          <div className="card rpt-panel">
            <div className="card-h">
              <h2>
                {rolePermsQ.data?.role.name ??
                  "Chọn một vai trò để xem phân quyền"}
              </h2>
              {rolePermsQ.data && <small>{rolePermsQ.data.role.code}</small>}
            </div>
            <div className="card-body">
              {!rolePermsQ.data && (
                <div className="rpt-empty">
                  Chọn một vai trò từ danh sách.
                </div>
              )}

              {rolePermsQ.data && (
                <>
                  <div className="rpt-summary">
                    <span className="rpt-summary-count">
                      {rolePermsQ.data.isWildcard
                        ? "FULL ACCESS"
                        : `${stats.totalGranted} / ${stats.totalPerms} permissions`}
                    </span>
                    <span className="rpt-summary-stats">
                      <span>
                        Module: <strong>{stats.modulesTotal}</strong>
                      </span>
                      <span>
                        Full: <strong>{stats.modulesFull}</strong>
                      </span>
                      <span>
                        Partial: <strong>{stats.modulesPartial}</strong>
                      </span>
                      <span>
                        None: <strong>{stats.modulesNone}</strong>
                      </span>
                    </span>
                  </div>

                  {isAdminEditingDisabled && (
                    <div
                      className="rpt-wildcard-banner"
                      style={{ marginTop: 10 }}
                    >
                      <span style={{ fontSize: 18 }}>⭐</span>
                      <div>
                        <strong>FULL ACCESS</strong>
                        <div style={{ fontSize: 11, marginTop: 4 }}>
                          Vai trò ADMIN sử dụng wildcard <code>*</code> — tất
                          cả module & permission đều được cấp tự động. Không
                          thể chỉnh sửa danh sách permission cho ADMIN.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ============ Visible Groups (Sidebar scope) ============ */}
                  {rolePermsQ.data && !isAdminEditingDisabled && (
                    <div
                      className="card"
                      style={{
                        marginTop: 14,
                        padding: 12,
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: 13 }}>
                            Nhóm hiển thị trên Sidebar
                          </strong>
                          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                            Chọn các nhóm nghiệp vụ mà vai trò này được
                            nhìn thấy trên sidebar.
                            {isLeader && (
                              <>
                                {" "}
                                <span style={{ color: "#f59e0b" }}>
                                  LEADER: nhóm hiển thị được tự động suy ra
                                  từ team (MKT/SALE/WAREHOUSE) — không thể
                                  chỉnh tại đây.
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {isVisibleGroupsDirty && (
                            <>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={resetVisibleGroupsDraft}
                                disabled={updateVisibleGroupsMut.isPending}
                              >
                                Reset
                              </button>
                              <button
                                type="button"
                                className="btn btn-pri btn-sm"
                                onClick={saveVisibleGroups}
                                disabled={updateVisibleGroupsMut.isPending}
                              >
                                Lưu
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(180px, 1fr))",
                          gap: 8,
                        }}
                      >
                        {availableSidebarGroups.map((g) => {
                          const key = g.groupKey ?? "";
                          const checked = currentVisibleGroups.includes(key);
                          return (
                            <label
                              key={key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 10px",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 4,
                                cursor: isLeader ? "not-allowed" : "pointer",
                                opacity: isLeader ? 0.5 : 1,
                                fontSize: 12,
                              }}
                            >
                              <Checkbox
                                checked={checked}
                                disabled={isLeader}
                                onChange={() => toggleVisibleGroup(key)}
                              />
                              <span>{g.label}</span>
                              <span
                                style={{
                                  marginLeft: "auto",
                                  fontSize: 10,
                                  color: "#888",
                                  fontFamily: "monospace",
                                }}
                              >
                                {key}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      {isVisibleGroupsDirty && (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 11,
                            color: "#f59e0b",
                          }}
                        >
                          ⚠ Có thay đổi nhóm hiển thị chưa lưu
                        </div>
                      )}
                    </div>
                  )}

                  <div className="rpt-toolbar" style={{ marginTop: 10 }}>
                    <div className="rpt-search">
                      <Input.Search
                        placeholder="Tìm module hoặc permission..."
                        value={permSearch}
                        onChange={(e) => setPermSearch(e.target.value)}
                        allowClear
                        size="small"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-sec btn-sm"
                      onClick={() =>
                        setExpanded(
                          Object.fromEntries(
                            filteredTree.map((b) => [b.module, true]),
                          ),
                        )
                      }
                    >
                      Expand all
                    </button>
                    <button
                      type="button"
                      className="btn btn-sec btn-sm"
                      onClick={() => setExpanded({})}
                    >
                      Collapse all
                    </button>
                    {isDirty && (
                      <span className="rpt-unsaved">
                        ⚠ Có thay đổi chưa lưu
                      </span>
                    )}
                    <div
                      style={{
                        marginLeft: "auto",
                        display: "flex",
                        gap: 4,
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={resetDraft}
                        disabled={!isDirty || updateMut.isPending}
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        className="btn btn-pri btn-sm"
                        onClick={() => setConfirmOpen(true)}
                        disabled={
                          !isDirty ||
                          updateMut.isPending ||
                          isAdminEditingDisabled
                        }
                      >
                        Lưu
                      </button>
                    </div>
                  </div>

                  <div className="rpt-tree" style={{ marginTop: 12 }}>
                    {filteredTree.length === 0 && (
                      <div className="rpt-filter-empty">
                        Không tìm thấy permission nào khớp
                      </div>
                    )}
                    {filteredTree.map((bucket) => {
                      const open = expanded[bucket.module] ?? true;
                      return (
                        <div className="rpt-module" key={bucket.module}>
                          <div
                            className={`rpt-module-h ${open ? "open" : ""}`}
                            onClick={() =>
                              setExpanded((prev) => ({
                                ...prev,
                                [bucket.module]: !open,
                              }))
                            }
                          >
                            <span className="rpt-caret">▶</span>
                            <TriCheckbox
                              state={bucket.state}
                              disabled={isAdminEditingDisabled}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isAdminEditingDisabled) return;
                                setBucketState(
                                  bucket.module,
                                  bucket.state === "full" ? "none" : "full",
                                );
                              }}
                              title={`${TRISTATE_LABEL[bucket.state]} — click để toggle`}
                            />
                            <span className="rpt-module-name">
                              {highlight(bucket.module, permSearch)}
                            </span>
                            <span className="rpt-module-count">
                              {rolePermsQ.data.isWildcard
                                ? "ALL"
                                : `${bucket.grantedCount}/${bucket.all.length}`}
                            </span>
                          </div>
                          {open && (
                            <div className="rpt-permissions">
                              {bucket.permissions.map((p) => {
                                const granted = currentCodes.includes(p.code);
                                return (
                                  <div
                                    key={p.code}
                                    className="rpt-permission-row"
                                    onClick={() => {
                                      if (isAdminEditingDisabled) return;
                                      setPermState(p.code);
                                    }}
                                  >
                                    <TriCheckbox
                                      compact
                                      state={
                                        rolePermsQ.data.isWildcard
                                          ? "full"
                                          : granted
                                            ? "full"
                                            : "none"
                                      }
                                      disabled={isAdminEditingDisabled}
                                    />
                                    <span className="rpt-perm-name">
                                      {highlight(p.name, permSearch)}
                                    </span>
                                    <span className="rpt-perm-code">
                                      {highlight(p.code, permSearch)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Xác nhận cập nhật phân quyền"
        type="warning"
        confirmText="Cập nhật"
        cancelText="Hủy"
        loading={updateMut.isPending}
        onConfirm={() => {
          setConfirmOpen(false);
          applySave();
        }}
        onCancel={() => setConfirmOpen(false)}
        content={
          <div>
            {added.length === 0 && removed.length === 0 ? (
              <p>Không có thay đổi.</p>
            ) : (
              <>
                {added.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <strong style={{ color: "#14a06b" }}>
                      + Thêm ({added.length}):
                    </strong>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        marginTop: 4,
                        maxHeight: 120,
                        overflow: "auto",
                      }}
                    >
                      {added.join(", ")}
                    </div>
                  </div>
                )}
                {removed.length > 0 && (
                  <div>
                    <strong style={{ color: "#e0524d" }}>
                      - Bỏ ({removed.length}):
                    </strong>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        marginTop: 4,
                        maxHeight: 120,
                        overflow: "auto",
                      }}
                    >
                      {removed.join(", ")}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        }
      />
    </div>
  );
}

function RoleSidebarItem({
  role,
  active,
  onClick,
  searchQuery,
}: {
  role: RoleSummary;
  active: boolean;
  onClick: () => void;
  searchQuery: string;
}) {
  return (
    <button
      type="button"
      className={`rpt-role-item ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <span className="rpt-role-code">{highlight(role.code, searchQuery)}</span>
      <span className="rpt-role-name">
        {highlight(role.name, searchQuery)}
      </span>
    </button>
  );
}

function TriCheckbox({
  state,
  disabled = false,
  compact = false,
  onClick,
  title,
}: {
  state: TriState;
  disabled?: boolean;
  compact?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}) {
  const cls = [
    "rpt-checkbox",
    state,
    compact ? "compact" : "",
    disabled ? "disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span
      className={cls}
      onClick={onClick}
      role="checkbox"
      aria-checked={state === "full"}
      aria-disabled={disabled}
      title={title}
    >
      {TRISTATE_GLYPH[state]}
    </span>
  );
}

/**
 * OrganizationChart — main entry point.
 *
 * Renders a top-down / horizontal org chart from the data returned by
 * the useOrgChart hook. The chart supports:
 *
 *   - Pan: hold-and-drag inside the viewport.
 *   - Zoom: ctrl/cmd + wheel, plus explicit +/- toolbar buttons.
 *   - Fit: re-centers and scales to fit the whole tree in the viewport.
 *   - Center on root: jumps the camera back to the root node.
 *   - Collapse/expand: per-branch toggle.
 *   - Search: type a name/code and the chart highlights matches plus
 *     every ancestor in the path, auto-expands the path so it is
 *     visible, and centers the camera on the first match.
 *
 * Rendering strategy:
 *
 *   - One CSS file owns the visual language (see chart.css).
 *   - Layout is computed by layout.ts (no external deps).
 *   - Nodes are absolutely positioned plain divs; connectors are SVG.
 *   - All transforms (translate, scale) live on the inner `.org-chart-canvas`
 *     so the outer scroll container provides native panning when the user
 *     is NOT actively dragging.
 *
 * State strategy:
 *
 *   - `userCollapsedIds` tracks which nodes the user explicitly collapsed.
 *   - The "effective" set (used by the layout pass) adds search-forced
 *     expansion on top of user collapse: while searching, every ancestor
 *     of every match is treated as expanded regardless of user state.
 *   - This means we never have to call `setCollapsedIds` from inside an
 *     effect to react to search changes — the effective state is just
 *     derived.
 */

"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, Input, Space, Tooltip } from "antd";
import {
  SearchOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  CompressOutlined,
  FullscreenOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import OrgNodeCard from "./OrgNodeCard";
import ConnectorLayer from "./ConnectorLayer";
import { layoutTree, buildIndex } from "./layout";
import AccountCreateDrawer from "@/components/accounts/AccountCreateDrawer";
import { useAccount } from "@/hooks/useAccounts";
import { useAuthStore } from "@/store/auth.store";
import type { OrgNode, OrgFlatEntry } from "./types";
import "./chart.css";
import { useMessage } from "@/contexts/MessageContext";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 110;
const COL_GAP = 32;
const ROW_GAP = 56;
const ELBOW = 18;
const MIN_SCALE = 0.4;
const MAX_SCALE = 1.8;
const ZOOM_STEP = 1.1;

type Position = { tx: number; ty: number };

export type OrganizationChartProps = {
  root: OrgNode;
  flat: OrgFlatEntry[];
  loading?: boolean;
};

export default function OrganizationChart({
  root,
  flat,
  loading,
}: OrganizationChartProps) {
  // ---------------------------------------------------------------------------
  // Auth (Phase 9.5): only ADMINs (or wildcard-permission users) get the
  // "+ sibling" / "↓ child" buttons on each card.
  // ---------------------------------------------------------------------------
  const user = useAuthStore((state) => state.user);
  const canCreate =
    user?.role === "ADMIN" ||
    user?.permissions.includes("*") ||
    user?.permissions.includes("account.create") ||
    false;

  // ---------------------------------------------------------------------------
  // Create-account integration: when the user clicks "+ sibling" or
  // "↓ child" on a node, we stash the anchor id + mode and open the
  // shared AccountCreateDrawer with the right pre-filled values.
  // ---------------------------------------------------------------------------
  const queryClient = useQueryClient();
  const [createAnchorId, setCreateAnchorId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<"sibling" | "child" | null>(
    null
  );
  const { data: anchorAccount } = useAccount(createAnchorId);
  const anchorAccountId = anchorAccount?._id ?? null;
  const anchorTeamId = anchorAccount?.team?._id ?? null;
  const anchorLeaderId = anchorAccount?.leader?._id ?? null;
  const anchorRoleCode = anchorAccount?.role?.code ?? null;

  const openCreate = useCallback(
    (anchorId: string, mode: "sibling" | "child") => {
      setCreateAnchorId(anchorId);
      setCreateMode(mode);
    },
    []
  );
  const closeCreate = useCallback(() => {
    setCreateAnchorId(null);
    setCreateMode(null);
  }, []);

  // Role options available to the drawer when invoked from the chart.
  // We restrict to the "child" roles (LEADER / SALE / MKT / WAREHOUSE /
  // EMPLOYEE) by default — sibling/child of an ADMIN node shouldn't be
  // allowed to spawn more ADMINs. ADMIN can still pick any non-ADMIN
  // role via the existing /accounts page.
  const createRoleOptions = useMemo(
    () => [
      { value: "MANAGER", label: "MANAGER" },
      { value: "LEADER", label: "LEADER" },
      { value: "SALE", label: "SALE" },
      { value: "MKT", label: "MKT" },
      { value: "WAREHOUSE", label: "WAREHOUSE" },
      { value: "EMPLOYEE", label: "EMPLOYEE" },
    ],
    []
  );

  // Default roleCode for the drawer, derived from the anchor:
  //   - sibling mode: mirror the anchor's role so the new account sits
  //     at the same level (LEADER ↔ LEADER, MANAGER ↔ MANAGER, ...).
  //   - child mode: hardcoded EMPLOYEE (a subordinate).
  //   - fallback: if the anchor's role isn't in `createRoleOptions`
  //     (e.g. ADMIN), use MANAGER so the Select shows a real value
  //     instead of an empty placeholder.
  const defaultRoleCode = useMemo(() => {
    if (createMode === "child") return "EMPLOYEE";
    if (!anchorRoleCode) return undefined;
    const allowed = createRoleOptions.some((o) => o.value === anchorRoleCode);
    return allowed ? anchorRoleCode : "MANAGER";
  }, [createMode, anchorRoleCode, createRoleOptions]);

  // Default values for the drawer — picked to match the requested mode.
  const createDefaultValues = useMemo(() => {
    if (!anchorAccount || !createMode) return undefined;
    if (createMode === "child") {
      // New account reports to the anchor. Inherit the anchor's team
      // so the new employee lands on the same team as its manager.
      return {
        leaderId: anchorAccountId ?? undefined,
        teamId: anchorTeamId ?? undefined,
        roleCode: "EMPLOYEE",
      };
    }
    // sibling: copy the anchor's placement (team + leader) AND role
    // so the new account sits next to the anchor in the chart with
    // matching responsibilities. Without `roleCode` the drawer would
    // default to EMPLOYEE — a sibling should match the anchor's
    // level (e.g. LEADER ↔ LEADER), not be demoted to a regular staff.
    return {
      leaderId: anchorLeaderId ?? undefined,
      teamId: anchorTeamId ?? undefined,
      roleCode: defaultRoleCode,
    };
  }, [
    anchorAccount,
    createMode,
    anchorAccountId,
    anchorTeamId,
    anchorLeaderId,
    defaultRoleCode,
  ]);

  const onCreateSuccess = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["employees", "org-chart"] });
    void message.success("Đã thêm tài khoản, đang tải lại sơ đồ…");
  }, [queryClient]);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    pointerId: number;
  } | null>(null);

  // Camera state. tx/ty = translation of the inner canvas in CSS pixels.
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<Position>({ tx: 0, ty: 0 });

  // Only the nodes the user EXPLICITLY collapsed. We do NOT mix search
  // overrides into this set.
  //
  // Initial auto-collapse policy (Phase 9.4):
  //   - The root (level 0) is NEVER auto-collapsed. Showing nothing at
  //     all because the root happens to have many reports makes the
  //     page look broken (see screenshot bug).
  //   - Direct children of the root that themselves own >= 8 total
  //     reports ARE auto-collapsed, so a large org is partially
  //     condensed at first paint but stays one-click-expandable.
  //   - We do NOT cascade the auto-collapse into deeper levels; the
  //     old behaviour propagated `ancestorsCollapsed` down, which
  //     effectively hid the entire tree whenever the root was large.
  const [userCollapsedIds, setUserCollapsedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const child of root.children) {
      if (child.meta.totalReports >= 8) {
        initial.add(child.id);
      }
    }
    return initial;
  });

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // ---------------------------------------------------------------------------
  // Search: parse matches and derive the set of ids that should be treated
  // as expanded while a search is active.
  // ---------------------------------------------------------------------------
  const searchResult = useMemo<{
    matches: OrgFlatEntry[];
    /** Ids that should be force-expanded (every ancestor of every match). */
    forcedExpandedIds: Set<string>;
  }>(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return { matches: [], forcedExpandedIds: new Set<string>() };
    }
    const matches = flat.filter(
      (f) =>
        f.fullName.toLowerCase().includes(q) ||
        f.employeeCode.toLowerCase().includes(q)
    );
    const forced = new Set<string>();
    for (const m of matches) {
      for (const aid of m.ancestorIds) forced.add(aid);
      forced.add(m.id);
    }
    return { matches, forcedExpandedIds: forced };
  }, [search, flat]);

  // Warn (via Ant toast) when a search yields no results. This is a side
  // effect that depends on `search` + `flat`, so it lives in an effect.
  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) return;
    if (searchResult.matches.length === 0) {
      message.warning("Không tìm thấy nhân viên phù hợp");
    }
  }, [search, searchResult.matches]);

  // ---------------------------------------------------------------------------
  // Highlight sets (for outline + connector color). Pure derived data.
  // ---------------------------------------------------------------------------
  const { highlightedNodeIds, highlightedEdgeIds } = useMemo(() => {
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();
    for (const m of searchResult.matches) {
      nodeIds.add(m.id);
      for (let i = 0; i < m.ancestorIds.length; i++) {
        nodeIds.add(m.ancestorIds[i]);
        if (i > 0) {
          edgeIds.add(`${m.ancestorIds[i - 1]}-${m.ancestorIds[i]}`);
        }
      }
      const parentId =
        m.ancestorIds.length > 0
          ? m.ancestorIds[m.ancestorIds.length - 1]
          : root.id;
      edgeIds.add(`${parentId}-${m.id}`);
    }
    return { highlightedNodeIds: nodeIds, highlightedEdgeIds: edgeIds };
  }, [searchResult.matches, root.id]);

  // ---------------------------------------------------------------------------
  // Effective collapse = user collapse \ search-forced-expansion. A node is
  // effectively collapsed iff the user collapsed it AND the search does not
  // demand it open.
  // ---------------------------------------------------------------------------
  const effectiveCollapsedIds = useMemo(() => {
    if (searchResult.forcedExpandedIds.size === 0) {
      return userCollapsedIds;
    }
    const out = new Set<string>();
    for (const id of userCollapsedIds) {
      if (!searchResult.forcedExpandedIds.has(id)) out.add(id);
    }
    return out;
  }, [userCollapsedIds, searchResult.forcedExpandedIds]);

  // ---------------------------------------------------------------------------
  // Layout — runs whenever the effective collapse set changes.
  // ---------------------------------------------------------------------------
  const { laid, width, height } = useMemo(() => {
    return layoutTree(root, (nid) => !effectiveCollapsedIds.has(nid), {
      nodeWidth: NODE_WIDTH,
      nodeHeight: NODE_HEIGHT,
      colGap: COL_GAP,
      rowGap: ROW_GAP,
      startX: NODE_WIDTH / 2,
      startY: 40,
    });
  }, [root, effectiveCollapsedIds]);

  // ---------------------------------------------------------------------------
  // Camera helpers.
  // ---------------------------------------------------------------------------

  const fit = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const sX = (vw - 32) / Math.max(width, 1);
    const sY = (vh - 32) / Math.max(height, 1);
    const s = Math.min(1, Math.max(MIN_SCALE, Math.min(sX, sY)));
    setScale(s);
    setPosition({
      tx: (vw - width * s) / 2,
      ty: 32,
    });
  }, [width, height]);

  const centerOnNode = useCallback(
    (id: string, newScale?: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const vw = vp.clientWidth;
      const vh = vp.clientHeight;
      const { laid: laidForTarget } = layoutTree(
        root,
        (nid) => !effectiveCollapsedIds.has(nid),
        {
          nodeWidth: NODE_WIDTH,
          nodeHeight: NODE_HEIGHT,
          colGap: COL_GAP,
          rowGap: ROW_GAP,
          startX: NODE_WIDTH / 2,
          startY: 40,
        }
      );
      const idx = buildIndex(laidForTarget);
      const target = idx.get(id);
      if (!target) return;
      const targetCenterX = target.x + target.width / 2;
      const targetCenterY = target.y + target.height / 2;
      const nextScale = newScale ?? scale;
      const tx = vw / 2 - targetCenterX * nextScale;
      const ty = vh / 2 - targetCenterY * nextScale;
      setScale(nextScale);
      setPosition({ tx, ty });
    },
    [effectiveCollapsedIds, root, scale]
  );

  const centerOnRoot = useCallback(() => {
    centerOnNode(root.id);
  }, [centerOnNode, root.id]);

  const zoomBy = useCallback((factor: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const centerScreen = { x: vw / 2, y: vh / 2 };
    setScale((prev) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * factor));
      setPosition((p) => ({
        tx: centerScreen.x - (centerScreen.x - p.tx) * (next / prev),
        ty: centerScreen.y - (centerScreen.y - p.ty) * (next / prev),
      }));
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Layout-derived camera effects. These DO touch state (setScale / setPosition),
  // but they are anchored to ref-guarded one-shot triggers so they only run
  // once per layout change — not in response to every render.
  // ---------------------------------------------------------------------------

  const hasInitialFit = useRef(false);
  useLayoutEffect(() => {
    if (hasInitialFit.current) return;
    if (laid.length === 0) return;
    fit();
    hasInitialFit.current = true;
  }, [laid, fit]);

  // Auto-center on the first match after a search. We re-fire the center pass
  // once the DOM has the expanded branch in place (laid changes once we drop
  // the forced-expanded ids from the effective collapse set).
  const lastCenteredMatchIdRef = useRef<string | null>(null);
  const lastLaidCountRef = useRef<number>(0);
  const firstMatchId = useMemo(
    () => searchResult.matches[0]?.id ?? null,
    [searchResult.matches],
  );
  useLayoutEffect(() => {
    const firstId = firstMatchId;
    if (!firstId) {
      lastCenteredMatchIdRef.current = null;
      lastLaidCountRef.current = 0;
      return;
    }
    if (firstId === lastCenteredMatchIdRef.current) {
      // Re-run only when the laid-out count changes (collapses were
      // dropped) so we re-center after the DOM has been rebuilt.
      if (laid.length === lastLaidCountRef.current) return;
    }
    lastLaidCountRef.current = laid.length;
    lastCenteredMatchIdRef.current = firstId;
    const handle = window.setTimeout(() => centerOnNode(firstId), 30);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstMatchId, laid.length]);

  // Re-fit on window resize.
  useEffect(() => {
    function onResize() {
      fit();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fit]);

  // Wheel → zoom when ctrl/cmd is held, otherwise let native scroll handle it.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const vpEl: HTMLDivElement = vp;
    function onWheel(e: WheelEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      const rect = vpEl.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setScale((prev) => {
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * factor));
        setPosition((p) => ({
          tx: mx - (mx - p.tx) * (next / prev),
          ty: my - (my - p.ty) * (next / prev),
        }));
        return next;
      });
    }
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, []);

  // ---------------------------------------------------------------------------
  // Pointer-based pan.
  // ---------------------------------------------------------------------------
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest(".org-node")) return;
    const vp = viewportRef.current;
    if (!vp) return;
    vp.setPointerCapture(e.pointerId);
    vp.classList.add("is-grabbing");
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: position.tx,
      originY: position.ty,
      pointerId: e.pointerId,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setPosition({
      tx: drag.originX + dx,
      ty: drag.originY + dy,
    });
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const vp = viewportRef.current;
    if (vp) vp.classList.remove("is-grabbing");
    dragStateRef.current = null;
    try {
      vp?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  // ---------------------------------------------------------------------------
  // Tree-level actions.
  // ---------------------------------------------------------------------------

  const expandAll = useCallback(() => {
    setUserCollapsedIds(new Set());
  }, []);

  const collapseAll = useCallback(() => {
    const next = new Set<string>();
    function visit(n: OrgNode) {
      if (n.children.length > 0) {
        next.add(n.id);
        for (const c of n.children) visit(c);
      }
    }
    visit(root);
    setUserCollapsedIds(next);
  }, [root]);

  const toggleNode = useCallback((id: string) => {
    setUserCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="org-chart">
      <div className="org-chart-toolbar">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm theo tên hoặc mã NV"
          className="org-chart-search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onPressEnter={() => setSearch(searchInput.trim())}
        />
        <Button
          type="primary"
          onClick={() => setSearch(searchInput.trim())}
          loading={loading}
        >
          Tìm
        </Button>

        <div className="org-chart-spacer" />

        <Space>
          <Tooltip title="Phóng to">
            <Button
              icon={<ZoomInOutlined />}
              onClick={() => zoomBy(ZOOM_STEP)}
            />
          </Tooltip>
          <Tooltip title="Thu nhỏ">
            <Button
              icon={<ZoomOutOutlined />}
              onClick={() => zoomBy(1 / ZOOM_STEP)}
            />
          </Tooltip>
          <Tooltip title="Vừa màn hình">
            <Button icon={<FullscreenOutlined />} onClick={fit}>
              Fit
            </Button>
          </Tooltip>
          <Tooltip title="Về gốc">
            <Button icon={<CompressOutlined />} onClick={centerOnRoot}>
              Center
            </Button>
          </Tooltip>
          <Tooltip title="Mở tất cả">
            <Button icon={<ExpandOutlined />} onClick={expandAll}>
              Expand All
            </Button>
          </Tooltip>
          <Tooltip title="Thu tất cả">
            <Button icon={<ReloadOutlined />} onClick={collapseAll}>
              Collapse All
            </Button>
          </Tooltip>
        </Space>
      </div>

      <div
        ref={viewportRef}
        className="org-chart-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          ref={canvasRef}
          className="org-chart-canvas"
          style={{
            transform: `translate(${position.tx}px, ${position.ty}px) scale(${scale})`,
            width,
            height,
          }}
        >
          <div className="org-chart-tree" style={{ width, height }}>
            <ConnectorLayer
              laid={laid}
              elbow={ELBOW}
              highlightedEdgeIds={highlightedEdgeIds}
            />
            {laid.map((entry) => {
              const isCollapsed = userCollapsedIds.has(entry.node.id);
              const isHighlighted = highlightedNodeIds.has(entry.node.id);
              const onPath = highlightedNodeIds.has(entry.node.id);
              return (
                <OrgNodeCard
                  key={entry.node.id}
                  node={entry.node}
                  x={entry.x}
                  y={entry.y}
                  width={entry.width}
                  height={entry.height}
                  isHighlighted={isHighlighted}
                  isOnSearchPath={onPath && !isHighlighted}
                  collapsed={isCollapsed}
                  hasChildren={entry.node.children.length > 0}
                  onToggle={toggleNode}
                  canCreate={canCreate}
                  onAddSibling={
                    canCreate ? (id: string) => openCreate(id, "sibling") : undefined
                  }
                  onAddChild={
                    canCreate ? (id: string) => openCreate(id, "child") : undefined
                  }
                />
              );
            })}
          </div>
        </div>
        {laid.length <= 1 && !loading ? (
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              right: 16,
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            Không có dữ liệu để hiển thị.
          </div>
        ) : null}
      </div>

      <div
        style={{
          padding: "6px 12px",
          fontSize: 11,
          color: "#94a3b8",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          gap: 12,
          justifyContent: "space-between",
        }}
      >
        <span>
          {flat.length} nhân viên · {laid.length} đang hiển thị
        </span>
        <span>
          {Math.round(scale * 100)}% · Ctrl + cuộn để zoom · Kéo để xem
        </span>
      </div>

      {canCreate ? (
        <AccountCreateDrawer
          open={createAnchorId !== null && createMode !== null}
          onClose={closeCreate}
          mode="create"
          defaultValues={createDefaultValues}
          roleOptions={createRoleOptions}
          teamOptions={[]}
          leaderOptions={[]}
          showBankFields={false}
          onSuccess={onCreateSuccess}
        />
      ) : null}
    </div>
  );
}

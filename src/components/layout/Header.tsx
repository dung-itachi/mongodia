"use client";

import { useMemo } from "react";

import { useSidebar } from "@/components/layout/AppShell";
import { useAuthStore } from "@/store/auth.store";
import { usePathname } from "next/navigation";
import {
  MODULES,
  NAV_GROUPS,
  getModuleByRoute,
  type ModuleDefinition,
  type NavGroupKey,
} from "@/config/modules";

/**
 * Header — topbar.
 *
 * Visual rules live in `src/styles/header.css` (`.topbar`, `.mob-open`,
 * `.pt`, `.vb`, `.srch`, `.tbr`, `.cnt`). Class names mirror the
 * original HTML 1:1.
 *
 * Left side (`.pt`) — page identity, derived from the current route:
 *   - `tT`  → page title (from `modules.ts`, the single source of truth)
 *   - `tS`  → group label (e.g. "MKT", "Đơn hàng") + page meta
 *
 * Right side (`.tbr`) — current user/session context:
 *   - today's date (vi-VN)
 *   - user fullName + role
 *
 * Tailwind is not used here. No inline styles.
 *
 * Phase A.3: `.sb-toggle` toggles sidebar collapse/expand on desktop.
 */

// Map NavGroupKey → badge variant class (CSS). Keep colors stable so
// the visual hierarchy matches the sidebar group coloring.
const GROUP_BADGE_VARIANT: Record<NavGroupKey, string> = {
  DASHBOARD: "vb-b",
  MKT: "vb-a",
  SALE: "vb-g",
  CUSTOMERS: "vb-t",
  ORDERS: "vb-p",
  PRODUCTS: "vb-o",
  ACCOUNTS: "vb-b",
  WAREHOUSE: "vb-o",
};

const GROUP_LABEL: Record<NavGroupKey, string> = Object.fromEntries(
  NAV_GROUPS.map((g) => [g.key, g.label])
) as Record<NavGroupKey, string>;

/**
 * Resolve a pathname → page meta. Uses `getModuleByRoute` first (handles
 * query-string routes like `/orders?status=SHIPPING`). Falls back to a
 * prefix scan so dynamic segments (`/customers/[id]`, `/orders/[id]`)
 * still resolve to a sensible title.
 */
function resolvePageMeta(pathname: string): {
  title: string;
  group: NavGroupKey | null;
} {
  // 1. Exact module match (covers /orders?status=...)
  const exact = getModuleByRoute(pathname);
  if (exact) {
    return { title: exact.title, group: exact.group };
  }

  // 2. Fallback: find first module whose `route` (path-only) is a prefix
  //    of the current pathname. Longest match wins to avoid `/orders`
  //    shadowing `/orders/[id]`.
  const pathOnly = pathname.split("?")[0];
  let best: { module: ModuleDefinition; depth: number } | null = null;

  for (const module of MODULES) {
    const modulePath = module.route.split("?")[0];
    if (modulePath === pathOnly) {
      return { title: module.title, group: module.group };
    }
    if (pathOnly.startsWith(modulePath + "/")) {
      const depth = modulePath.split("/").length;
      if (!best || depth > best.depth) {
        best = { module, depth };
      }
    }
  }

  if (best) {
    return { title: best.module.title, group: best.module.group };
  }

  return { title: "Mongolia CRM", group: null };
}

function formatTodayVi(): string {
  // Example output: "Thứ 6, 08/08/2026"
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const d = new Date();
  const dow = days[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dow}, ${dd}/${mm}/${yyyy}`;
}

export default function Header() {
  const { toggleMobile, toggleCollapsed } = useSidebar();
  const pathname = usePathname();
  const { user } = useAuthStore();

  const { title, group } = useMemo(
    () => resolvePageMeta(pathname),
    [pathname]
  );

  const badgeVariant = group ? GROUP_BADGE_VARIANT[group] : "vb-b";
  const groupLabel = group ? GROUP_LABEL[group] : "Hệ thống";
  const today = useMemo(() => formatTodayVi(), []);

  return (
    <header className="topbar">
      {/* Sidebar toggle button - always visible, toggles collapse on desktop */}
      <button
        type="button"
        className="sb-toggle"
        aria-label="Toggle sidebar"
        onClick={toggleCollapsed}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      {/* Mobile menu button - only shown on mobile via CSS */}
      <button
        type="button"
        className="mob-open"
        aria-label="Open sidebar"
        onClick={toggleMobile}
        style={{ display: "none" }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Left: page identity (title + today's date) */}
      <div className="pt">
        <span id="tT">{title}</span>
        <small id="tS">{today}</small>
      </div>

      {/* Group badge */}
      <div id="tB" className={`vb ${badgeVariant}`}>
        {groupLabel}
      </div>

      <div className="srch">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input id="sq" type="text" disabled />
      </div>

      {/* Right cluster: date + user identity */}
      <div className="tbr">
        <div className="cnt" id="tDate" title="Hôm nay">
          <span id="cntLbl">📅</span> <b id="tc">{today}</b>
        </div>
        {user && (
          <>
            <div
              className="cnt"
              id="tUser"
              title={`${user.fullName} · ${user.role}`}
            >
              <span id="userLbl">👤</span>{" "}
              <b id="userName">{user.fullName || user.username}</b>
            </div>
            <div className="vb vb-b" id="tRole" title="Vai trò">
              {user.roleName || user.role}
            </div>
          </>
        )}
      </div>
    </header>
  );
}

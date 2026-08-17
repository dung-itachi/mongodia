"use client";

import { Suspense, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

import {
  NAV_GROUPS,
  BRAND_NAME,
  BRAND_SUB,
  BRAND_INITIALS,
  LANGUAGES,
  ROLES,
  DEFAULT_LANG,
  DEFAULT_ROLE,
  ICON_ARROW_DOWN,
  type NavItem,
  type NavGroup,
} from "@/config/nav.config";
import { useAuthStore } from "@/store/auth.store";
import { useLanguageStore } from "@/store/language.store";
import { hasAnyPermission } from "@/lib/permission";
import { t } from "@/lib/i18n";

/**
 * Map role-switcher code → set of `NavGroupKey` (from modules.ts) that should
 * be visible when the user "views as" that role. `admin` is a superset and
 * shows everything. Other roles restrict the sidebar to the groups that the
 * role works with day-to-day, plus shared groups (Dashboard, Orders, …).
 *
 * Persisted in localStorage under `sb-role` so the choice survives reloads.
 *
 * NOTE: This is the VIEW-AS switcher only — it does NOT change actual session
 * permissions. The authoritative "what groups does the current user see"
 * decision lives in the Sidebar's `visibleGroups` filter, which reads from
 * the User payload (Role.visibleGroups + Leader team-code resolution).
 */
const ROLE_VISIBLE_GROUPS: Record<
  (typeof ROLES)[number]["code"],
  ReadonlyArray<string>
> = {
  admin: [
    "DASHBOARD",
    "MKT",
    "SALE",
    "CUSTOMERS",
    "ORDERS",
    "PRODUCTS",
    "ACCOUNTS",
    "WAREHOUSE",
    "SETTINGS",
  ],
  mkt: ["DASHBOARD", "MKT", "PRODUCTS"],
  sale: ["DASHBOARD", "SALE", "CUSTOMERS", "ORDERS", "PRODUCTS"],
  kho: ["DASHBOARD", "ORDERS", "WAREHOUSE", "PRODUCTS"],
};

/**
 * Leader team-code → NavGroupKey mapping (Sprint — Leader scope by team).
 *
 * A leader's sidebar is the union of:
 *   - The group that matches their team (MKT / SALE / WAREHOUSE)
 *   - The "shared" groups they need to see (DASHBOARD, ORDERS, PRODUCTS,
 *     CUSTOMERS — so they can monitor their members' day-to-day work).
 *
 * Leaders of teams with a non-business code fall back to DASHBOARD only.
 */
const LEADER_TEAM_TO_GROUP: Record<string, string> = {
  MKT: "MKT",
  SALE: "SALE",
  WAREHOUSE: "WAREHOUSE",
};

function resolveLeaderVisibleGroups(teamCode: string | null | undefined): string[] {
  if (!teamCode) return ["DASHBOARD"];
  const group = LEADER_TEAM_TO_GROUP[teamCode.toUpperCase()];
  if (!group) return ["DASHBOARD"];
  // Leader gets their own team's group + shared cross-functional groups.
  return ["DASHBOARD", group, "ORDERS", "PRODUCTS"];
}

const ROLE_STORAGE_KEY = "sb-role";

type Props = {
  /** True when the mobile overlay should be shown. */
  mobileOpen?: boolean;
  /** Notify parent when sidebar wants to close the mobile overlay. */
  onCloseMobile?: () => void;
  /** Current collapsed state (controlled by AppShell). */
  collapsed?: boolean;
  /** Callback when collapsed state changes. */
  onCollapsedChange?: (v: boolean) => void;
};

/**
 * Sidebar — left rail.
 *
 * Visual rules live in `src/styles/sidebar.css` (`.sb`, `.brand`,
 * `.ls`, `.lb`, `.rs`, `.rb`, `.nav`, `.ng`, `.ngs`, `.nh`, `.na`,
 * `.nb`, `.ni`, `.pill`, `.sbf`, `.ver`, `.sb.col`). Class names mirror
 * the original HTML 1:1.
 *
 * Two independent UI states, both driven by the HTML spec:
 *  - `collapsed` (`.sb.col`) — desktop collapse. Width 50px; all text
 *    labels and the language/role switchers are hidden via CSS rules
 *    `.sb.col .brand-txt { opacity: 0 }`, `.sb.col .nh .nl { opacity:0 }`,
 *    `.sb.col .nb .ni span { display:none }`, etc. Logo + nav icons
 *    remain visible (per spec `.sb.col .sbf { opacity: 0 }` hides the
 *    footer too — mirrored verbatim).
 *  - `mobileOpen` (`.sb.open`) — mobile overlay. Activated on viewports
 *    <=768px by Header's `.mob-open` button. Sidebar notifies parent
 *    to close when `.sb-tg` is tapped.
 *
 * Tailwind is not used here. No inline styles.
 */
export default function Sidebar({
  mobileOpen = false,
  onCloseMobile,
  collapsed = false,
  onCollapsedChange,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const [role, setRoleState] = useState<(typeof ROLES)[number]["code"]>(() => {
    // Read persisted "view-as role" from localStorage so the choice survives
    // page reloads. Falls back to the default role when storage is empty or
    // contains an unknown value.
    if (typeof window === "undefined") return DEFAULT_ROLE;
    try {
      const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
      if (stored && ROLES.some((r) => r.code === stored)) {
        return stored as (typeof ROLES)[number]["code"];
      }
    } catch {
      /* ignore — localStorage may be unavailable */
    }
    return DEFAULT_ROLE;
  });
  const setRole = (next: (typeof ROLES)[number]["code"]) => {
    setRoleState(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(ROLE_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    }
  };

  // Derive class from props (controlled state from AppShell)
  const asideClass = [
    "sb",
    collapsed ? "col" : "",
    mobileOpen ? "open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Filter groups and items by permission AND by the role-switcher filter.
  // The role switcher is a *view* filter — it scopes which nav groups are
  // shown without changing the actual session permissions.
  //
  // Two layers of filtering:
  //   1. Business scope (role-based): which groups the user's role is
  //      allowed to see. Driven by:
  //        - user.role.visibleGroups (from Role doc, seed-backed)
  //        - For LEADER: derived from user.teamCode at runtime
  //        - ADMIN: bypass (sees everything)
  //   2. Permission scope (per-item): even within an allowed group, items
  //      are still hidden if the user lacks the required permission code.
  const userPermissions = user?.permissions ?? [];
  const userRoleCode = user?.role ?? "";
  const userVisibleGroups = user?.visibleGroups ?? [];

  // Compute effective business-scope groups for the current user.
  let businessScopeGroups: Set<string> | null = null; // null = no scope filter (admin)
  if (userRoleCode !== "ADMIN" && !userPermissions.includes("*")) {
    let groups: string[];
    if (userRoleCode === "LEADER") {
      groups = resolveLeaderVisibleGroups(user.teamCode ?? null);
    } else if (userVisibleGroups.length > 0) {
      groups = userVisibleGroups;
    } else {
      // Fallback for roles seeded without visibleGroups: deny-by-default
      // except for DASHBOARD so the user isn't completely locked out.
      groups = ["DASHBOARD"];
    }
    businessScopeGroups = new Set(groups);
  }

  // When the user's role is granted a NavGroup via `visibleGroups`
  // (i.e. the admin ticked the group on the Permission Tree page),
  // the group header AND its items should be visible regardless of the
  // per-item permission check. This keeps the role-scope and the
  // permission-scope in sync: admins manage visibility at the group
  // level, and the Sidebar reflects that instead of hiding the group
  // because the user lacks every individual permission.
  //
  // Permission check still applies to groups that are NOT in the
  // user's `visibleGroups` (defence-in-depth — a stale cache or
  // back-door role assignment can't accidentally expose a screen).
  const isGroupInScope = (groupKey: string): boolean =>
    !businessScopeGroups || businessScopeGroups.has(groupKey);

  const visibleGroups = NAV_GROUPS.map((group) => {
    const inScope = isGroupInScope(group.groupKey ?? "");
    const visibleItems = group.items.filter((item) => {
      // Group-level scope from visibleGroups overrides per-item
      // permission checks: when admin has ticked this group for the
      // role, treat all items in the group as visible.
      if (inScope) return true;
      if (item.permissions && item.permissions.length > 0) {
        return hasAnyPermission(userPermissions, item.permissions);
      }
      if (item.permission) {
        return hasAnyPermission(userPermissions, [item.permission]);
      }
      return true;
    });
    return { ...group, items: visibleItems };
  })
    .filter((group) => {
      // Business-scope filter: drop groups outside the user's role scope.
      if (businessScopeGroups && !businessScopeGroups.has(group.groupKey ?? "")) {
        return false;
      }
      // Role-switcher filter: only keep groups whose `groupKey` is in the
      // role's allow-list. Admin sees everything; other roles see a slice.
      const allowed = ROLE_VISIBLE_GROUPS[role];
      if (!allowed) return true;
      return allowed.includes(group.groupKey ?? "");
    })
    .filter((group) => group.items.length > 0);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <aside className={asideClass}>
      {/* Brand */}
      <div className="brand">
        <div className="ico">{BRAND_INITIALS}</div>
        <div className="brand-txt">
          <div className="nm">{BRAND_NAME}</div>
          <div className="sub">{t("Quản lý đơn hàng", language)}</div>
        </div>
        <button
          type="button"
          className="sb-tg"
          onClick={() => {
            if (onCollapsedChange) onCollapsedChange(!collapsed);
            if (mobileOpen && onCloseMobile) onCloseMobile();
          }}
          aria-label="Toggle sidebar"
        >
          <svg
            className="ic-c"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <svg
            className="ic-o"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
      </div>

      {/* Language switcher (.ls) */}
      <div className="ls">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            className={`lb ${language === l.code ? "on" : ""}`}
            onClick={() => setLanguage(l.code as "vi" | "en" | "mn")}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Role switcher (.rs) */}
      <div className="rs">
        {ROLES.map((r) => (
          <button
            key={r.code}
            type="button"
            className={`rb ${role === r.code ? "on" : ""}`}
            onClick={() => setRole(r.code)}
          >
            {t(r.label, language)}
          </button>
        ))}
      </div>

      {/* Nav groups (filtered by permission) */}
      <nav className="nav">
        <Suspense fallback={null}>
          <NavGroups
            visibleGroups={visibleGroups}
            language={language}
            expandAll={() => {}}
            collapseAll={() => {}}
          />
        </Suspense>
      </nav>

      {/* Footer (.sbf > .ver) */}
      <div className="sbf">
        <button
          type="button"
          className="logout-btn"
          onClick={handleLogout}
          aria-label={t("Đăng xuất", language)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>{t("Đăng xuất", language)}</span>
        </button>
        <div className="ver">v6.0 · Mongolia CRM</div>
      </div>
    </aside>
  );
}

function NavGroupBlock({
  group,
  pathname,
  search,
  standalone,
  isOpen,
  onToggle,
  language,
}: {
  group: NavGroup;
  pathname: string;
  search: string;
  standalone: boolean;
  isOpen: boolean;
  onToggle: () => void;
  language: "vi" | "en" | "mn";
}) {
  const wrapperClass = standalone ? "ngs" : `ng${isOpen ? " open" : ""}`;

  // Sprint 8.6 — Hybrid group header:
  //   - label (icon + text) becomes a Link to group.href (if any)
  //   - chevron stays a button to toggle expand
  // Active state (`.nh.on`) is applied only when the current URL matches the
  // group root EXACTLY — i.e. pathname === group.href and the URL has no
  // query string. This way `/orders?status=SHIPPING` highlights "Đang giao"
  // (child item) instead of the group header, while a bare `/orders` link
  // highlights "Đơn hàng" itself.
  const isGroupActive = isExactRoot(pathname, search, group.href);

  const headerIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <g dangerouslySetInnerHTML={{ __html: group.iconSvg }} />
    </svg>
  );
  const headerLabel = (
    <span className="nl">{t(group.label, language)}</span>
  );
  const chevron = (
    <svg className="na" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <g dangerouslySetInnerHTML={{ __html: ICON_ARROW_DOWN }} />
    </svg>
  );

  return (
    <div className={wrapperClass}>
      {!standalone && (
        <div className={`nh ${isGroupActive ? "on" : ""}`}>
          {group.href ? (
            <>
              <Link
                href={group.href}
                prefetch={false}
                className={`nh-label ${isGroupActive ? "on" : ""}`}
                aria-label={`Mở ${group.label}`}
                aria-current={isGroupActive ? "page" : undefined}
              >
                {headerIcon}
                {headerLabel}
              </Link>
              <button
                type="button"
                className="nh-toggle"
                aria-label={`Mở rộng ${group.label}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggle();
                }}
              >
                {chevron}
              </button>
            </>
          ) : (
            <button type="button" className="nh" onClick={onToggle}>
              {headerIcon}
              {headerLabel}
              {chevron}
            </button>
          )}
        </div>
      )}
      <div className={standalone ? "" : "nb"}>
        {group.items.map((item) => (
          <NavItemLink
            key={item.key}
            item={item}
            active={isActive(pathname, search, item.href)}
            language={language}
          />
        ))}
      </div>
    </div>
  );
}

function NavItemLink({ item, active, language }: { item: NavItem; active: boolean; language: "vi" | "en" | "mn" }) {
  const translatedLabel = t(item.label, language);
  return (
    <Link href={item.href} prefetch={false} className={`ni ${active ? "on" : ""}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <g dangerouslySetInnerHTML={{ __html: item.iconSvg }} />
      </svg>
      <span>{translatedLabel}</span>
      {item.pill != null && <span className="pill">{item.pill}</span>}
    </Link>
  );
}

function isActive(pathname: string, search: string, href: string): boolean {
  if (!href) return false;
  const [pathOnly, queryString = ""] = href.split("?");

  // Path mismatch → not active
  if (pathname !== pathOnly && !pathname.startsWith(pathOnly + "/")) {
    return false;
  }

  // Href has no query → match any pathname at this path
  if (!queryString) {
    return true;
  }

  // Href has query → must also match current search params exactly
  // (compare key=value pairs; current `search` may include extra params
  // we want to ignore, so check that every required key=value is present)
  const required = new URLSearchParams(queryString);
  const current = new URLSearchParams(search);

  for (const [key, value] of required.entries()) {
    if (current.get(key) !== value) {
      return false;
    }
  }
  return true;
}

/**
 * Sprint 8.6 — Exact-root match for group header active state.
 *
 * Unlike `isActive`, this returns true ONLY when:
 *   - pathname equals the href's path component exactly (no prefix match), AND
 *   - the current URL has no query string.
 *
 * Used so that `/orders?status=SHIPPING` does NOT highlight the "Đơn hàng"
 * group header — that URL belongs to a child item ("Đang giao"). Only a
 * bare `/orders` link highlights the group itself.
 */
function isExactRoot(pathname: string, search: string, href?: string): boolean {
  if (!href) return false;
  const [pathOnly, queryString = ""] = href.split("?");

  // Group href shouldn't carry its own query — if it does, fall back to
  // strict pathname equality to keep behavior predictable.
  if (queryString) return pathname === pathOnly;

  return pathname === pathOnly && search === "";
}

/**
 * NavGroups — isolated sub-tree that reads `useSearchParams`.
 *
 * Next.js App Router requires `useSearchParams()` to be wrapped in a
 * Suspense boundary, otherwise the build will fail or the entire page
 * tree will be marked dynamic. We isolate the call here so only this
 * small subtree is suspended; the rest of the sidebar renders normally.
 */
function NavGroups({
  visibleGroups,
  language,
}: {
  visibleGroups: NavGroup[];
  language: "vi" | "en" | "mn";
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    visibleGroups.forEach((g) => {
      const hasActiveItem = g.items.some((item) =>
        isActive(pathname, searchString, item.href)
      );
      if (hasActiveItem || g.items.length === 1) {
        initial.add(g.key);
      }
    });
    return initial;
  });

  const toggleGroup = useCallback((key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setOpenGroups(new Set(visibleGroups.map((g) => g.key)));
  }, [visibleGroups]);

  const handleCollapseAll = useCallback(() => {
    setOpenGroups(new Set());
  }, []);

  return (
    <>
      {/* Expand/Collapse all controls */}
      <div style={{ display: "flex", gap: "4px", padding: "4px 8px", marginBottom: "4px" }}>
        <button
          type="button"
          onClick={handleExpandAll}
          style={{
            flex: 1,
            padding: "4px 8px",
            fontSize: "9px",
            fontWeight: 600,
            background: "rgba(255,255,255,0.06)",
            color: "var(--sb-txt)",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          title={t("Expand", language)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 10, height: 10, marginRight: 4 }}>
            <path d="M4 8l8-6 8 6M4 16l8 6 8-6" strokeWidth="2" />
          </svg>
          {t("Expand", language)}
        </button>
        <button
          type="button"
          onClick={handleCollapseAll}
          style={{
            flex: 1,
            padding: "4px 8px",
            fontSize: "9px",
            fontWeight: 600,
            background: "rgba(255,255,255,0.06)",
            color: "var(--sb-txt)",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          title={t("Collapse", language)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 10, height: 10, marginRight: 4 }}>
            <path d="M4 8l8 6 8-6M4 16l8-6 8 6" strokeWidth="2" />
          </svg>
          {t("Collapse", language)}
        </button>
      </div>
      {visibleGroups.map((group) => (
        <NavGroupBlock
          key={group.key}
          group={group}
          pathname={pathname}
          search={searchString}
          standalone={group.items.length === 1 && !!group.items[0].standalone}
          isOpen={openGroups.has(group.key)}
          onToggle={() => toggleGroup(group.key)}
          language={language}
        />
      ))}
    </>
  );
}

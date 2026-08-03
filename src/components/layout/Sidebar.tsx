"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const [lang, setLang] = useState<(typeof LANGUAGES)[number]["code"]>(
    DEFAULT_LANG
  );
  const [role, setRole] = useState<(typeof ROLES)[number]["code"]>(
    DEFAULT_ROLE
  );

  // Derive class from props (controlled state from AppShell)
  const asideClass = [
    "sb",
    collapsed ? "col" : "",
    mobileOpen ? "open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={asideClass}>
      {/* Brand */}
      <div className="brand">
        <div className="ico">{BRAND_INITIALS}</div>
        <div className="brand-txt">
          <div className="nm">{BRAND_NAME}</div>
          <div className="sub">{BRAND_SUB}</div>
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
            className={`lb ${lang === l.code ? "on" : ""}`}
            onClick={() => setLang(l.code)}
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
            {r.label}
          </button>
        ))}
      </div>

      {/* Nav groups */}
      <nav className="nav">
        {NAV_GROUPS.map((group) => (
          <NavGroupBlock
            key={group.key}
            group={group}
            pathname={pathname}
            standalone={group.items.length === 1 && group.items[0].standalone}
          />
        ))}
      </nav>

      {/* Footer (.sbf > .ver) */}
      <div className="sbf">
        <div className="ver">v6.0 · Mongolia CRM</div>
      </div>
    </aside>
  );
}

function NavGroupBlock({
  group,
  pathname,
  standalone,
}: {
  group: NavGroup;
  pathname: string;
  standalone: boolean;
}) {
  const wrapperClass = standalone ? "ngs" : "ng open";
  return (
    <div className={wrapperClass}>
      {!standalone && (
        <button type="button" className="nh">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <g dangerouslySetInnerHTML={{ __html: group.iconSvg }} />
          </svg>
          <span className="nl">{group.label}</span>
          <svg className="na" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <g dangerouslySetInnerHTML={{ __html: ICON_ARROW_DOWN }} />
          </svg>
        </button>
      )}
      <div className={standalone ? "" : "nb"}>
        {group.items.map((item) => (
          <NavItemLink
            key={item.key}
            item={item}
            active={isActive(pathname, item.href)}
          />
        ))}
      </div>
    </div>
  );
}

function NavItemLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} className={`ni ${active ? "on" : ""}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <g dangerouslySetInnerHTML={{ __html: item.iconSvg }} />
      </svg>
      <span>{item.label}</span>
      {item.pill != null && <span className="pill">{item.pill}</span>}
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (!href) return false;
  const [pathOnly] = href.split("?");
  if (pathname === pathOnly) return true;
  if (href.includes("?") && pathname === pathOnly) return true;
  if (pathname.startsWith(pathOnly + "/")) return true;
  return false;
}
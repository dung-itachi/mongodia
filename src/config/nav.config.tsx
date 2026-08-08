/**
 * Navigation Configuration (Sprint 2.5 — Built from modules.ts)
 *
 * This file is GENERATED from src/config/modules.ts.
 * Do NOT hardcode nav items here — edit modules.ts instead.
 */

import {
  MODULES,
  NAV_GROUPS as MODULE_NAV_GROUPS,
  getDashboardModule,
  type ModuleDefinition,
  type NavGroupKey,
} from "./modules";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  /** Inline SVG inner content (paths only — no <svg> wrapper). */
  iconSvg: string;
  /** Optional pill badge value shown on the right of the item. */
  pill?: number | null;
  /**
   * When true, renders as `.ngs` (standalone, non-grouped) with the
   * `.ni` styling override from sidebar.css.
   */
  standalone?: boolean;
  /** Permission required to show this item. */
  permission?: string;
};

export type NavGroup = {
  key: string;
  label: string;
  /** Inline SVG for the group header. */
  iconSvg: string;
  /**
   * Optional root href for the group.
   * If provided, clicking the group label navigates here (in addition to
   * expanding/collapsing the group). Sprint 8.6 — group "Đơn hàng" → /orders.
   */
  href?: string;
  items: NavItem[];
};

/**
 * Convert ModuleDefinition to NavItem.
 */
function moduleToNavItem(module: ModuleDefinition): NavItem {
  return {
    key: module.id,
    label: module.title,
    href: module.route,
    iconSvg: module.icon,
    pill: module.pill,
    standalone: module.standalone,
    permission: module.permission,
  };
}

/**
 * Build NAV_GROUPS from modules.ts.
 * This is the GENERATED navigation structure.
 */
function buildNavGroups(): NavGroup[] {
  const groups: NavGroup[] = [];

  for (const groupDef of MODULE_NAV_GROUPS) {
    const modulesInGroup = MODULES.filter(
      (module) => module.group === groupDef.key
    );

    // Only add group if it has items
    if (modulesInGroup.length > 0) {
      groups.push({
        key: `ng-${groupDef.key.toLowerCase()}`,
        label: groupDef.label,
        iconSvg: groupDef.icon,
        href: groupDef.href,
        items: modulesInGroup.map(moduleToNavItem),
      });
    }
  }

  return groups;
}

/**
 * Navigation groups — generated from modules.ts.
 * Exported as NAV_GROUPS for Sidebar compatibility.
 */
export const NAV_GROUPS: NavGroup[] = buildNavGroups();

/**
 * Standalone nav items (e.g., Dashboard).
 */
function buildStandaloneItems(): NavItem[] {
  const standaloneModules = MODULES.filter(
    (module) => module.standalone === true
  );
  return standaloneModules.map(moduleToNavItem);
}

export const STANDALONE_NAV_ITEMS: NavItem[] = buildStandaloneItems();

// Legacy export for backward compatibility
export { STANDALONE_NAV_ITEMS as STANDALONE_ITEMS };

export const NAV_ITEMS_CONFIG = {
  navGroups: NAV_GROUPS,
  standaloneItems: STANDALONE_NAV_ITEMS,
};

export const BRAND_NAME = "Mongolia CRM";
export const BRAND_SUB = "Quản lý đơn hàng";
export const BRAND_INITIALS = "MN";

/**
 * Language switcher (.ls) — mirrors HTML exactly.
 */
export const LANGUAGES = [
  { code: "vi", label: "VN" },
  { code: "en", label: "EN" },
  { code: "mn", label: "MN" },
] as const;

/**
 * Role switcher (.rs) — mirrors HTML exactly.
 */
export const ROLES = [
  { code: "admin", label: "Admin" },
  { code: "mkt", label: "MKT" },
  { code: "sale", label: "Sale" },
  { code: "kho", label: "Kho" },
] as const;

export type Language = (typeof LANGUAGES)[number];
export type RoleOption = (typeof ROLES)[number];

export const DEFAULT_LANG: Language["code"] = "vi";
export const DEFAULT_ROLE: RoleOption["code"] = "admin";

/**
 * Right-arrow icon for `.na` (chevron down).
 */
export const ICON_ARROW_DOWN = `<path d="M6 9l6 6 6-6"/>`;

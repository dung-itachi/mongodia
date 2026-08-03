/**
 * Navigation Configuration (Phase A.2 — Pixel Perfect)
 *
 * Pure config — no API calls, no business logic.
 * Used by Sidebar to render nav groups.
 *
 * Icon paths are inline SVG strings matching the HTML spec exactly.
 * `pill` is a static counter shown on nav items (HTML mirror).
 */

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
  items: NavItem[];
};

/**
 * Icon SVG path data — matches the original HTML's `viewBox="0 0 24 24"`
 * stroke icons. Stroke-width 2 inherited from `.nh svg:first-child`.
 */
const ICON = {
  dash: `<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>`,
  mkt: `<path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>`,
  mktDash: `<path d="M18 20V10M12 20V4M6 20v-6"/>`,
  mktInput: `<path d="M12 5v14M5 12h14"/>`,
  mktOrd: `<path d="M9 11l3 3L22 4"/>`,
  leads: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>`,
  closed: `<path d="M20 6 9 17l-5-5"/>`,
  customers: `<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>`,
  grpOrd: `<rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/>`,
  ship: `<path d="M5 12h14M12 5l7 7-7 7"/>`,
  ok: `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>`,
  ret: `<path d="M9 14 4 9l5-5"/>`,
  rec: `<path d="M9 11l3 3L22 4"/>`,
  grpProd: `<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>`,
  prod: `<path d="M12 2L2 7l10 5 10-5-10-5z"/>`,
  grpAcc: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  acc: `<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>`,
  grpWh: `<path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>`,
  wh: `<path d="M21 8v13H3V8"/>`,
};

/**
 * Mirror HTML mẫu — order matters; matches original DOM order.
 * Group `ng-m` (MKT), `ng-s` (Sale), `ng-o` (Orders), `ng-p` (Products),
 * `ng-acc` (Accounts), `ng-w` (Warehouse). Plus standalone `.ngs` for
 * the Dashboard item.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: "ngs-dash",
    label: "Tổng quan",
    iconSvg: ICON.dash,
    items: [
      {
        key: "dash",
        label: "Tổng quan",
        href: "/dashboard",
        iconSvg: ICON.dash,
        standalone: true,
        permission: "dashboard.view",
      },
    ],
  },
  {
    key: "ng-m",
    label: "MKT",
    iconSvg: ICON.mkt,
    items: [
      {
        key: "mkt-dash",
        label: "Tổng quan MKT",
        href: "/marketing/dashboard",
        iconSvg: ICON.mktDash,
        permission: "report.view",
      },
      {
        key: "mkt",
        label: "Nhập số",
        href: "/marketing/input",
        iconSvg: ICON.mktInput,
        pill: 0,
        permission: "lead.create",
      },
      {
        key: "mkt-orders",
        label: "QL đơn hàng",
        href: "/marketing/orders",
        iconSvg: ICON.mktOrd,
        permission: "order.view",
      },
    ],
  },
  {
    key: "ng-s",
    label: "Sale",
    iconSvg: ICON.leads,
    items: [
      {
        key: "leads",
        label: "Số cần gọi",
        href: "/leads",
        iconSvg: ICON.leads,
        pill: 0,
        permission: "lead.view",
      },
      {
        key: "closed",
        label: "Chốt đơn",
        href: "/orders?status=CLOSED",
        iconSvg: ICON.closed,
        pill: 0,
        permission: "order.view",
      },
    ],
  },
  {
    key: "ng-o",
    label: "Đơn hàng",
    iconSvg: ICON.grpOrd,
    items: [
      {
        key: "ship",
        label: "Đang giao",
        href: "/orders?status=SHIPPING",
        iconSvg: ICON.ship,
        pill: 0,
        permission: "order.view",
      },
      {
        key: "ok",
        label: "Giao TC",
        href: "/orders?status=COMPLETED",
        iconSvg: ICON.ok,
        pill: 0,
        permission: "order.view",
      },
      {
        key: "ret",
        label: "Hoàn hàng",
        href: "/orders?status=CANCELLED",
        iconSvg: ICON.ret,
        pill: 0,
        permission: "order.view",
      },
      {
        key: "rec",
        label: "Đối soát",
        href: "/orders?status=RECONCILED",
        iconSvg: ICON.rec,
        pill: 0,
        permission: "order.view",
      },
    ],
  },
  {
    key: "ng-p",
    label: "Sản phẩm",
    iconSvg: ICON.grpProd,
    items: [
      {
        key: "products",
        label: "QL sản phẩm",
        href: "/products",
        iconSvg: ICON.prod,
        permission: "product.view",
      },
    ],
  },
  {
    key: "ng-acc",
    label: "Tài khoản",
    iconSvg: ICON.grpAcc,
    items: [
      {
        key: "accounts",
        label: "QL tài khoản",
        href: "/employees",
        iconSvg: ICON.acc,
        permission: "employee.view",
      },
    ],
  },
  {
    key: "ng-w",
    label: "Kho",
    iconSvg: ICON.grpWh,
    items: [
      {
        key: "wh",
        label: "Quản lý kho",
        href: "/warehouses",
        iconSvg: ICON.wh,
        permission: "warehouse.view",
      },
    ],
  },
];

export const BRAND_NAME = "Mongolia CRM";
export const BRAND_SUB = "Quản lý đơn hàng";
export const BRAND_INITIALS = "MN";

/**
 * Language switcher (.ls) — mirrors HTML exactly. State lives in
 * `Sidebar.tsx` (display-only; not wired to i18n in Phase A.2).
 */
export const LANGUAGES = [
  { code: "vi", label: "VN" },
  { code: "en", label: "EN" },
  { code: "mn", label: "MN" },
] as const;

/**
 * Role switcher (.rs) — mirrors HTML exactly. Display-only in Phase A.2.
 */
export const ROLES = [
  { code: "admin", label: "Admin" },
  { code: "mkt", label: "MKT" },
  { code: "sale", label: "Sale" },
  { code: "kho", label: "Kho" },
] as const;

export const DEFAULT_LANG: (typeof LANGUAGES)[number]["code"] = "vi";
export const DEFAULT_ROLE: (typeof ROLES)[number]["code"] = "admin";

/**
 * Right-arrow icon for `.na` (chevron down). Matches HTML spec exactly.
 */
export const ICON_ARROW_DOWN = `<path d="M6 9l6 6 6-6"/>`;
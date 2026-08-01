/**
 * Breadcrumb label map (Phase A).
 *
 * Static mapping for known routes. Unknown routes fall back to a title
 * derived from the last URL segment.
 */

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  marketing: "Marketing",
  input: "Nhập số",
  orders: "Đơn hàng",
  leads: "Số cần gọi",
  customers: "Khách hàng",
  products: "Sản phẩm",
  warehouses: "Kho",
  employees: "Nhân viên",
  roles: "Vai trò",
};

/**
 * Convert a path segment into a human-readable title.
 * Falls back to the segment with first letter capitalized.
 */
export function getBreadcrumbLabel(segment: string): string {
  if (LABELS[segment]) return LABELS[segment];
  if (segment.length === 0) return "";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export type BreadcrumbItem = {
  label: string;
  href: string;
};

/**
 * Build a breadcrumb trail from a pathname.
 * Example: "/marketing/input" → [
 *   { label: "Marketing", href: "/marketing" },
 *   { label: "Nhập số", href: "/marketing/input" }
 * ]
 */
export function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const items: BreadcrumbItem[] = [];
  let acc = "";

  for (const segment of segments) {
    acc += `/${segment}`;
    items.push({
      label: getBreadcrumbLabel(segment),
      href: acc,
    });
  }

  return items;
}

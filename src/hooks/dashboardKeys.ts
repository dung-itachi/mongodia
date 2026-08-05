/**
 * Dashboard Query Keys (Sprint 7.2 — Charts & Ranking Keys)
 *
 * Canonical keys cho dashboard cache invalidation.
 *
 * Nguyên tắc:
 * - Không invalidate toàn bộ dashboard nếu chỉ Marketing thay đổi.
 * - Mỗi domain có key riêng.
 * - Charts và Ranking có key riêng để refetch độc lập.
 *
 * Cấu trúc:
 * dashboardKeys.all              = ["dashboard"]
 * dashboardKeys.marketing        = ["dashboard", "marketing"]
 * dashboardKeys.marketingCharts   = ["dashboard", "marketing", "charts"]
 * dashboardKeys.marketingRanking  = ["dashboard", "marketing", "ranking"]
 * dashboardKeys.sales           = ["dashboard", "sales"]
 * dashboardKeys.warehouse       = ["dashboard", "warehouse"]
 * dashboardKeys.admin           = ["dashboard", "admin"]
 */

export const dashboardKeys = {
  all: ["dashboard"] as const,

  // Marketing Dashboard
  marketing: () => [...dashboardKeys.all, "marketing"] as const,
  marketingCharts: () => [...dashboardKeys.marketing(), "charts"] as const,
  marketingRanking: () => [...dashboardKeys.marketing(), "ranking"] as const,

  // Sales Dashboard (tương lai)
  sales: () => [...dashboardKeys.all, "sales"] as const,

  // Warehouse Dashboard (tương lai)
  warehouse: () => [...dashboardKeys.all, "warehouse"] as const,

  // Admin Dashboard (tương lai)
  admin: () => [...dashboardKeys.all, "admin"] as const,
};

export default dashboardKeys;

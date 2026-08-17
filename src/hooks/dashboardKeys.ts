/**
 * Dashboard Query Keys (Sprint 7.2 — Charts & Ranking Keys)
 * Sprint 8.0: Thêm filter params cho marketing key
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
 * dashboardKeys.marketing        = ["dashboard", "marketing", { filter }]
 * dashboardKeys.marketingCharts   = ["dashboard", "marketing", "charts"]
 * dashboardKeys.marketingRanking  = ["dashboard", "marketing", "ranking"]
 * dashboardKeys.sales           = ["dashboard", "sales"]
 * dashboardKeys.warehouse       = ["dashboard", "warehouse"]
 * dashboardKeys.admin           = ["dashboard", "admin"]
 */

import type { MarketingDashboardFilter } from "@/types/marketing-dashboard-filter";

export const dashboardKeys = {
  all: ["dashboard"] as const,

  // Marketing Dashboard — key bao gồm filter params (Sprint 8.0)
  marketing: (filter?: MarketingDashboardFilter) => {
    const base = [...dashboardKeys.all, "marketing"] as const;
    if (!filter) return base;
    // Include key filter params for proper cache busting
    return [...base, JSON.stringify(filter)] as const;
  },
  marketingCharts: () => [...dashboardKeys.all, "marketing", "charts"] as const,
  marketingRanking: () => [...dashboardKeys.all, "marketing", "ranking"] as const,

  // Sales Dashboard (tương lai)
  sales: () => [...dashboardKeys.all, "sales"] as const,

  // Warehouse Dashboard (tương lai)
  warehouse: () => [...dashboardKeys.all, "warehouse"] as const,

  // Admin Dashboard (tương lai)
  admin: () => [...dashboardKeys.all, "admin"] as const,
};

export default dashboardKeys;

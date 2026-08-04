/**
 * Marketing Dashboard Query Keys (Sprint 6.8 — canonical).
 *
 * Chuẩn hoá mọi key của Marketing Dashboard về prefix `marketing-dashboard`.
 *
 * Lý do:
 *   - Trước đây project có 2 convention:
 *       1. `["marketing-dashboard"]`       — useMarketingLeads, lead detail page
 *       2. `["marketing", "dashboard"]`    — useMarketingDashboard (Sprint cũ)
 *     Hai array này không match nhau trong React Query (prefix match trên array).
 *   - Chuẩn hoá về `marketing-dashboard` là canonical prefix.
 *   - Sprint 7.1 sẽ migrate `useMarketingDashboard.ts` để dùng key này.
 *
 * Hiện tại (Sprint 6.8):
 *   - Mọi invalidate / queryKey liên quan dashboard PHẢI dùng object này.
 *   - KHÔNG tự gõ `["marketing-dashboard"]` ở bất kỳ đâu khác.
 *
 * Cấu trúc:
 *   marketingDashboardKeys.all        = ["marketing-dashboard"]
 *   marketingDashboardKeys.summary    = ["marketing-dashboard", "summary"]
 *   marketingDashboardKeys.charts     = ["marketing-dashboard", "charts"]
 *   marketingDashboardKeys.activities = ["marketing-dashboard", "activities"]
 *   marketingDashboardKeys.quickActions = ["marketing-dashboard", "quick-actions"]
 */

export const marketingDashboardKeys = {
  all: ["marketing-dashboard"] as const,
  summaries: () => [...marketingDashboardKeys.all, "summary"] as const,
  summary: () => [...marketingDashboardKeys.summaries()] as const,
  charts: () => [...marketingDashboardKeys.all, "charts"] as const,
  activities: () => [...marketingDashboardKeys.all, "activities"] as const,
  quickActions: () => [...marketingDashboardKeys.all, "quick-actions"] as const,
};

export default marketingDashboardKeys;
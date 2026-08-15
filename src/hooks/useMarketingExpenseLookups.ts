/**
 * ==================================================
 * MARKETING EXPENSE LOOKUP HOOKS
 * ==================================================
 *
 * Sprint 6.10 — Marketing Expense UI Improvements
 * Sprint 7.4 — Added Campaigns lookup for Marketing Dashboard Advanced Filters
 * Sprint 8.x — Refactored to React Query to deduplicate fetches across components
 *              (Dashboard page + DailyAdsReport + DailyRevenueReport all use
 *              useMarketingEmployees — without RQ cache, each instance refetches).
 */

import { useQuery } from "@tanstack/react-query";

interface SelectOption {
  label: string;
  value: string;
}

const LOOKUP_STALE_TIME = 5 * 60 * 1000; // 5 phút — lookups ít thay đổi

const lookupKeys = {
  facebookPages: ["lookup", "facebook-pages", "active"] as const,
  employees: ["lookup", "employees", "active"] as const,
  campaigns: ["lookup", "campaigns", "active"] as const,
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.message || "Request failed");
  }
  return json.data as T;
}

function toOptions<T extends { _id: string }>(
  items: T[] | undefined,
  map: (item: T) => { label: string; value: string }
): SelectOption[] {
  if (!items) return [];
  return items.map(map);
}

// ============================================================================
// useFacebookPages
// ============================================================================

interface UseFacebookPagesResult {
  pages: SelectOption[];
  loading: boolean;
  error: string | null;
}

/**
 * Sprint 8.x — Reuses React Query cache so multiple components
 * (Dashboard page + MarketingExpenseToolbar) share a single fetch.
 */
export function useFacebookPages(): UseFacebookPagesResult {
  const { data, isLoading, error } = useQuery<{ items: Array<{ _id: string; name: string }> }>({
    queryKey: lookupKeys.facebookPages,
    queryFn: () => fetchJson("/api/facebook-pages?pageSize=100&isActive=true"),
    staleTime: LOOKUP_STALE_TIME,
  });

  return {
    pages: toOptions(data?.items, (p) => ({ label: p.name, value: p._id })),
    loading: isLoading,
    error: error?.message ?? null,
  };
}

// ============================================================================
// useMarketingEmployees
// ============================================================================

interface UseMarketingEmployeesResult {
  employees: SelectOption[];
  loading: boolean;
  error: string | null;
}

/**
 * Sprint 8.x — Previously each component refetched independently (3 calls on
 * /marketing/dashboard). Now uses React Query so all components share one fetch.
 */
export function useMarketingEmployees(): UseMarketingEmployeesResult {
  const { data, isLoading, error } = useQuery<{
    items: Array<{ _id: string; fullName: string; employeeCode?: string }>;
  }>({
    queryKey: lookupKeys.employees,
    queryFn: () => fetchJson("/api/employees?pageSize=100&isActive=true"),
    staleTime: LOOKUP_STALE_TIME,
  });

  return {
    employees: toOptions(data?.items, (emp) => ({
      label: emp.employeeCode ? `${emp.fullName} (${emp.employeeCode})` : emp.fullName,
      value: emp._id,
    })),
    loading: isLoading,
    error: error?.message ?? null,
  };
}

// ============================================================================
// useCampaignsForSelect (Sprint 7.4 — Marketing Dashboard Advanced Filters)
// ============================================================================

interface UseCampaignsResult {
  campaigns: SelectOption[];
  loading: boolean;
  error: string | null;
}

/**
 * Sprint 8.x — Refactored to React Query to deduplicate fetches.
 */
export function useCampaignsForSelect(): UseCampaignsResult {
  const { data, isLoading, error } = useQuery<{
    items: Array<{ _id: string; name: string; code?: string }>;
  }>({
    queryKey: lookupKeys.campaigns,
    queryFn: () => fetchJson("/api/campaigns?pageSize=100&isActive=true"),
    staleTime: LOOKUP_STALE_TIME,
  });

  return {
    campaigns: toOptions(data?.items, (c) => ({
      label: c.code ? `${c.name} (${c.code})` : c.name,
      value: c._id,
    })),
    loading: isLoading,
    error: error?.message ?? null,
  };
}
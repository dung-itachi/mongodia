/**
 * useDashboardRefresh Hook (Sprint 4.4 — Dashboard Polish)
 *
 * Provides a single action that refetches every dashboard query key.
 * Does not reload the page.
 */

import { useQueryClient } from "@tanstack/react-query";

const DASHBOARD_QUERY_KEYS = [
  ["dashboard"],
  ["dashboard", "summary"],
  ["dashboard", "charts"],
  ["dashboard", "activities"],
  ["dashboard", "quick-actions"],
] as const;

export function useDashboardRefresh() {
  const queryClient = useQueryClient();

  const refresh = () => {
    DASHBOARD_QUERY_KEYS.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: [...key] });
    });
  };

  const isFetching = DASHBOARD_QUERY_KEYS.some((key) =>
    queryClient.isFetching({ queryKey: [...key] }) > 0
  );

  return { refresh, isFetching };
}

export default useDashboardRefresh;
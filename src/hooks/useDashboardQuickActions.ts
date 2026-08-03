/**
 * useDashboardQuickActions Hook (Sprint 4.3 - Dashboard Activity & Quick Actions)
 *
 * Fetch dashboard quick actions using React Query.
 */

import { useQuery } from "@tanstack/react-query";
import type { QuickAction } from "@/types/dashboard-activity";

const fetchDashboardQuickActions = async (): Promise<QuickAction[]> => {
  const response = await fetch("/api/dashboard/quick-actions", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch dashboard quick actions");
  }

  return result.data;
};

export function useDashboardQuickActions() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<QuickAction[], Error>({
    queryKey: ["dashboard", "quick-actions"],
    queryFn: fetchDashboardQuickActions,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: 1500,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: false,
  });

  return {
    data: data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

export default useDashboardQuickActions;
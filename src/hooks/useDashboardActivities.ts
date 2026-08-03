/**
 * useDashboardActivities Hook (Sprint 4.3 - Dashboard Activity & Quick Actions)
 *
 * Fetch dashboard activity data using React Query.
 */

import { useQuery } from "@tanstack/react-query";
import type { DashboardActivityData } from "@/types/dashboard-activity";

const fetchDashboardActivities = async (): Promise<DashboardActivityData> => {
  const response = await fetch("/api/dashboard/activities", {
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
    throw new Error(result.message || "Failed to fetch dashboard activities");
  }

  return result.data;
};

export function useDashboardActivities() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<DashboardActivityData, Error>({
    queryKey: ["dashboard", "activities"],
    queryFn: fetchDashboardActivities,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

export default useDashboardActivities;
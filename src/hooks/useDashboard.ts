/**
 * useDashboard Hook (Sprint 4.1 - Dashboard Foundation)
 *
 * Fetch dashboard data from /api/dashboard.
 * Returns loading state, data, and error.
 */

import { useState, useEffect, useCallback } from "react";
import type { DashboardResponse } from "@/types/dashboard";

export type UseDashboardState = {
  data: DashboardResponse | null;
  loading: boolean;
  error: string | null;
};

export type UseDashboardActions = {
  refetch: () => Promise<void>;
};

export function useDashboard(): [UseDashboardState, UseDashboardActions] {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error(result.message || "Failed to fetch dashboard data");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return [
    { data, loading, error },
    { refetch: fetchDashboard },
  ];
}

export default useDashboard;

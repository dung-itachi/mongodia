/**
 * ==================================================
 * SALES KPI HOOKS
 * ==================================================
 *
 * Sprint 8.3 — Sales KPI & Target
 *
 * React Query hooks for Sales KPI data.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  SalesKPIDashboardResponse,
  SalesKPIChartResponse,
  SalesKPIRankingResponse,
  CreateSalesTargetInput,
  UpdateSalesTargetInput,
  SalesTarget,
} from "@/types/sales-kpi";

// ============================================================================
// API Functions
// ============================================================================

async function fetchSalesKPI(params: {
  employeeId?: string;
  month?: number;
  year?: number;
}): Promise<SalesKPIDashboardResponse> {
  const searchParams = new URLSearchParams();
  if (params.employeeId) searchParams.set("employeeId", params.employeeId);
  if (params.month !== undefined) searchParams.set("month", String(params.month));
  if (params.year !== undefined) searchParams.set("year", String(params.year));

  const response = await fetch(`/api/sales/kpi?${searchParams.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch KPI");
  }
  return response.json();
}

async function fetchSalesKPIChart(params: {
  employeeId?: string;
  month?: number;
  year?: number;
}): Promise<SalesKPIChartResponse> {
  const searchParams = new URLSearchParams();
  if (params.employeeId) searchParams.set("employeeId", params.employeeId);
  if (params.month !== undefined) searchParams.set("month", String(params.month));
  if (params.year !== undefined) searchParams.set("year", String(params.year));

  const response = await fetch(`/api/sales/kpi/chart?${searchParams.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch KPI chart");
  }
  return response.json();
}

async function fetchSalesKPIRanking(params: {
  month?: number;
  year?: number;
  limit?: number;
}): Promise<SalesKPIRankingResponse> {
  const searchParams = new URLSearchParams();
  if (params.month !== undefined) searchParams.set("month", String(params.month));
  if (params.year !== undefined) searchParams.set("year", String(params.year));
  if (params.limit !== undefined) searchParams.set("limit", String(params.limit));

  const response = await fetch(`/api/sales/kpi/ranking?${searchParams.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch KPI ranking");
  }
  return response.json();
}

async function createSalesTarget(input: CreateSalesTargetInput): Promise<SalesTarget> {
  const response = await fetch("/api/sales/target", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create/update target");
  }
  return response.json();
}

async function updateSalesTarget(
  id: string,
  input: UpdateSalesTargetInput
): Promise<SalesTarget> {
  const response = await fetch(`/api/sales/target/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update target");
  }
  return response.json();
}

// ============================================================================
// Hooks
// ============================================================================

export function useSalesKPI(params?: { employeeId?: string; month?: number; year?: number }) {
  return useQuery({
    queryKey: ["sales-kpi", params],
    queryFn: () => fetchSalesKPI(params ?? {}),
  });
}

export function useSalesKPIChart(params?: { employeeId?: string; month?: number; year?: number }) {
  return useQuery({
    queryKey: ["sales-kpi-chart", params],
    queryFn: () => fetchSalesKPIChart(params ?? {}),
  });
}

export function useSalesKPIRanking(params?: {
  month?: number;
  year?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["sales-kpi-ranking", params],
    queryFn: () => fetchSalesKPIRanking(params ?? {}),
  });
}

export function useSalesTarget() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createSalesTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-kpi"] });
      queryClient.invalidateQueries({ queryKey: ["sales-kpi-chart"] });
      queryClient.invalidateQueries({ queryKey: ["sales-kpi-ranking"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSalesTargetInput }) =>
      updateSalesTarget(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-kpi"] });
      queryClient.invalidateQueries({ queryKey: ["sales-kpi-chart"] });
      queryClient.invalidateQueries({ queryKey: ["sales-kpi-ranking"] });
    },
  });

  return {
    createTarget: createMutation.mutate,
    updateTarget: updateMutation.mutate,
    createLoading: createMutation.isPending,
    updateLoading: updateMutation.isPending,
    createError: createMutation.error,
    updateError: updateMutation.error,
  };
}

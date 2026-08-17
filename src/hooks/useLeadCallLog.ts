/**
 * Lead Call Log Hooks (Module 6 - Nhật ký cuộc gọi)
 *
 * React Query hooks cho Call Log.
 * - useLeadCallHistory: Lấy lịch sử cuộc gọi
 * - useLeadCallStats: Lấy thống kê cuộc gọi
 * - useLogCall: Ghi nhận cuộc gọi mới
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { LeadCallStatus } from "@/constants/leadCallStatus";

// ============================================================================
// Types
// ============================================================================

export interface CallLogItem {
  id: string;
  leadId: string;
  saleId: string;
  callTime: string;
  status: LeadCallStatus;
  note?: string;
  duration?: number;
  sale?: {
    id: string;
    name: string;
    employeeCode: string;
  };
  createdAt: string;
}

export interface CallLogStats {
  totalCalls: number;
  noAnswerCount: number;
  busyCount: number;
  wrongNumberCount: number;
  potentialCount: number;
  notInterestedCount: number;
  callBackCount: number;
  convertedCount: number;
}

export interface CallLogResponse {
  callHistory: CallLogItem[];
  stats?: CallLogStats;
}

export interface LogCallPayload {
  status: LeadCallStatus;
  note?: string;
  duration?: number;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchCallHistory(
  leadId: string,
  includeStats: boolean = false
): Promise<CallLogResponse> {
  const params = new URLSearchParams();
  if (includeStats) {
    params.set("includeStats", "true");
  }

  const queryString = params.toString();
  const url = `/api/leads/${leadId}/calls${queryString ? `?${queryString}` : ""}`;

  const response = await api.get(url);
  return response.data.data;
}

async function logCall(
  leadId: string,
  payload: LogCallPayload
): Promise<CallLogItem> {
  const response = await api.post(`/api/leads/${leadId}/calls`, payload);
  return response.data.data;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook để lấy lịch sử cuộc gọi của một lead
 */
export function useLeadCallHistory(leadId: string | null, includeStats: boolean = false) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<CallLogResponse, Error>({
    queryKey: ["lead-call-history", leadId, includeStats],
    queryFn: () => fetchCallHistory(leadId!, includeStats),
    enabled: !!leadId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return {
    data: data ?? null,
    callHistory: data?.callHistory ?? [],
    stats: data?.stats ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

/**
 * Hook để ghi nhận cuộc gọi mới
 */
export function useLogCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      payload,
    }: {
      leadId: string;
      payload: LogCallPayload;
    }) => logCall(leadId, payload),
    onSuccess: (_result, variables) => {
      // Invalidate call history
      void queryClient.invalidateQueries({
        queryKey: ["lead-call-history", variables.leadId],
      });
      // Invalidate sale leads to update call counts
      void queryClient.invalidateQueries({ queryKey: ["sale-leads"] });
      void queryClient.invalidateQueries({ queryKey: ["sale-lead-counts"] });
      // Invalidate marketing tracking
      void queryClient.invalidateQueries({ queryKey: ["marketing-lead-tracking"] });
    },
  });
}

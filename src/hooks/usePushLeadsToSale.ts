/**
 * Marketing Push Leads Hooks (Sprint 8.5 — Marketing → Sale Workflow)
 *
 * React Query hooks for Marketing to push leads to Sale.
 * - usePushLeadsToSale: Đẩy leads sang Sale
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

// ============================================================================
// Types
// ============================================================================

export interface PushLeadResult {
  success: boolean;
  pushedCount: number;
  failedCount: number;
  errors: string[];
  leads?: Array<{
    id: string;
    leadCode: string;
    customerName: string;
    status: string;
    saleEmployeeId?: string;
    orderId?: string;
  }>;
}

export interface PushLeadInput {
  leadIds: string[];
  saleEmployeeId?: string;
}

// ============================================================================
// API Functions
// ============================================================================

async function pushLeadsToSale(input: PushLeadInput): Promise<PushLeadResult> {
  const response = await api.post("/api/marketing/leads/push", input);
  return response.data.data;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to push leads to Sale
 *
 * Usage:
 * const pushMutation = usePushLeadsToSale();
 * pushMutation.mutate({ leadIds: ['id1', 'id2'] });
 */
export function usePushLeadsToSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PushLeadInput) => pushLeadsToSale(input),
    onSuccess: () => {
      // Invalidate marketing leads to refetch
      void queryClient.invalidateQueries({ queryKey: ["marketing-leads"] });
      void queryClient.invalidateQueries({ queryKey: ["marketing-lead-tracking"] });
      void queryClient.invalidateQueries({ queryKey: ["marketing-lead-tracking-counts"] });
      // Invalidate sale leads (they should see the new leads)
      void queryClient.invalidateQueries({ queryKey: ["sale-leads"] });
      void queryClient.invalidateQueries({ queryKey: ["sale-lead-counts"] });
      // Invalidate orders (Sprint 8.5.2 - tự động tạo order)
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["order"] });
      // Invalidate dashboard counts
      void queryClient.invalidateQueries({ queryKey: ["marketing-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

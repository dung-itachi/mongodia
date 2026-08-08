/**
 * ==================================================
 * USE CONVERT LEAD HOOK
 * ==================================================
 *
 * Sprint 8.4 — Tách Lead và Order
 *
 * Hook for converting a lead to an order.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrderItem } from "@/types/variant";

interface ConvertLeadResponse {
  success: boolean;
  orderId?: string;
  message?: string;
  error?: string;
}

async function convertLead({ leadId, orderItem }: { leadId: string; orderItem: OrderItem }): Promise<ConvertLeadResponse> {
  const response = await fetch(`/api/leads/${leadId}/convert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderItem }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Không thể chốt đơn");
  }

  return data;
}

export function useConvertLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: convertLead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sale-leads"] });
      void queryClient.invalidateQueries({ queryKey: ["sale-lead-counts"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["marketing-lead-tracking"] });
    },
  });
}

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

export interface ManualRevenueInput {
  marketingRevenue?: number;
  saleRevenue?: number;
}

async function convertLead({
  leadId,
  orderItem,
  isPrepaid,
  prepaymentAmount,
  manualRevenue,
}: {
  leadId: string;
  orderItem: OrderItem;
  isPrepaid?: boolean;
  prepaymentAmount?: number;
  manualRevenue?: ManualRevenueInput;
}): Promise<ConvertLeadResponse> {
  const response = await fetch(`/api/leads/${leadId}/convert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderItem, isPrepaid, prepaymentAmount, manualRevenue }),
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

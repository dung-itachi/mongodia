/**
 * ==================================================
 * USE CONVERT LEAD HOOK
 * ==================================================
 *
 * Sprint 8.4 — Tách Lead và Order
 *
 * Hook for converting a lead to an order.
 */

import { useMutation } from "@tanstack/react-query";

interface ConvertLeadResponse {
  success: boolean;
  orderId?: string;
  message?: string;
  error?: string;
}

async function convertLead(leadId: string): Promise<ConvertLeadResponse> {
  const response = await fetch(`/api/leads/${leadId}/convert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Không thể chốt đơn");
  }

  return data;
}

export function useConvertLead() {
  return useMutation({
    mutationFn: convertLead,
  });
}

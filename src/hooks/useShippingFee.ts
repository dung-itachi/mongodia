/**
 * useShippingFee — hooks for the system shipping fee setting.
 *
 * - useShippingFee(): read the current shipping fee (cached for 60s).
 *   GET `/api/settings/shipping-fee` is open to any authenticated user
 *   (Sprint 8.x+ public-read) because the value is needed by /leads,
 *   /marketing/orders, and /orders/:id revenue columns for non-admin
 *   roles. Non-401 failures fall back to the system default so revenue
 *   columns render instead of crashing.
 * - useUpdateShippingFee(): PUT /api/settings/shipping-fee. Requires
 *   `system-settings.manage` server-side.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import {
  DEFAULT_SHIPPING_FEE,
  type ShippingFeeSettingValue,
} from "@/types/system-settings";

const QUERY_KEY = ["settings", "shipping-fee"] as const;

/** Fallback returned when the GET request fails for a non-auth reason. */
const DEFAULT_FALLBACK: ShippingFeeSettingValue = {
  fee: DEFAULT_SHIPPING_FEE,
  currency: "MNT",
  updatedAt: new Date().toISOString(),
  updatedBy: null,
};

async function fetchShippingFee(): Promise<ShippingFeeSettingValue> {
  try {
    const res = await api.get("/api/settings/shipping-fee");
    return res.data.data as ShippingFeeSettingValue;
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    // 401 is handled by the axios interceptor (logout + redirect) — rethrow.
    if (status === 401) throw err;
    // Any other failure (403 should not occur with public-read, network
    // errors, 5xx, ...) falls back to the default so the page still renders.
    return DEFAULT_FALLBACK;
  }
}

export function useShippingFee(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchShippingFee,
    staleTime: 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateShippingFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { fee: number; currency?: "MNT" | "VND" | "USD" }) => {
      const res = await api.put("/api/settings/shipping-fee", input);
      return res.data.data as ShippingFeeSettingValue;
    },
    onSuccess: (data) => {
      void queryClient.setQueryData(QUERY_KEY, data);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
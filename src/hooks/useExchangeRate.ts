/**
 * useExchangeRate — hooks for system exchange rate.
 *
 * - useExchangeRate(): read the current rate (cached for 60s).
 *   GET `/api/settings/exchange-rate` is open to any authenticated user
 *   (Sprint 8.x+ public-read) because the value is needed by /leads,
 *   /marketing/orders, /dashboard, and the leads reconciliation panel
 *   for non-admin roles. Non-401 failures fall back to the system
 *   default (7 VND per 1 MNT) so the page still renders.
 * - useUpdateExchangeRate(): PUT /api/settings/exchange-rate. Requires
 *   `system-settings.manage` server-side.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import {
  DEFAULT_MNT_TO_VND_RATE,
  type ExchangeRateSettingValue,
} from "@/types/system-settings";

const QUERY_KEY = ["settings", "exchange-rate"] as const;

/** Fallback returned when the GET request fails for a non-auth reason. */
const DEFAULT_FALLBACK: ExchangeRateSettingValue = {
  rate: DEFAULT_MNT_TO_VND_RATE,
  fromCurrency: "MNT",
  toCurrency: "VND",
  updatedAt: new Date().toISOString(),
  updatedBy: null,
};

async function fetchExchangeRate(): Promise<ExchangeRateSettingValue> {
  try {
    const res = await api.get("/api/settings/exchange-rate");
    return res.data.data as ExchangeRateSettingValue;
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    // 401 is handled by the axios interceptor (logout + redirect) — rethrow.
    if (status === 401) throw err;
    // Any other failure falls back to the default so the page still renders.
    return DEFAULT_FALLBACK;
  }
}

export function useExchangeRate(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchExchangeRate,
    staleTime: 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateExchangeRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { rate: number }) => {
      const res = await api.put("/api/settings/exchange-rate", input);
      return res.data.data as ExchangeRateSettingValue;
    },
    onSuccess: (data) => {
      void queryClient.setQueryData(QUERY_KEY, data);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
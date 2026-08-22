/**
 * useExchangeRate — hooks for system exchange rate.
 *
 * - useExchangeRate(): read the current rate (cached for 60s).
 * - useUpdateExchangeRate(): PATCH /api/settings/exchange-rate.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type {
  ExchangeRateSettingValue,
} from "@/types/system-settings";

const QUERY_KEY = ["settings", "exchange-rate"] as const;

async function fetchExchangeRate(): Promise<ExchangeRateSettingValue> {
  const res = await api.get("/api/settings/exchange-rate");
  return res.data.data as ExchangeRateSettingValue;
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
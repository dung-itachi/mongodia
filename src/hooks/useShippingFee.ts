/**
 * useShippingFee — hooks for the system shipping fee setting.
 *
 * - useShippingFee(): read the current shipping fee (cached for 60s).
 * - useUpdateShippingFee(): PUT /api/settings/shipping-fee.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type {
  ShippingFeeSettingValue,
} from "@/lib/system-settings";

const QUERY_KEY = ["settings", "shipping-fee"] as const;

async function fetchShippingFee(): Promise<ShippingFeeSettingValue> {
  const res = await api.get("/api/settings/shipping-fee");
  return res.data.data as ShippingFeeSettingValue;
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
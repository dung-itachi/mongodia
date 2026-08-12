import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type AdjustmentItem = {
  productId?: string;
  variantId?: string;
  giftId?: string;
  newQuantity: number;
  reason: string;
  note?: string;
};

export type AdjustmentPayload = {
  warehouseId: string;
  items: AdjustmentItem[];
  note?: string;
};

async function callApi(url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Request thất bại");
  return data.data;
}

export function useWarehouseAdjustments(filters: {
  warehouseId?: string;
  page?: number;
  limit?: number;
}) {
  const result = useQuery({
    queryKey: ["warehouse-adjustments", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.warehouseId) params.set("warehouseId", filters.warehouseId);
      if (filters.page) params.set("page", String(filters.page));
      if (filters.limit) params.set("limit", String(filters.limit));
      return callApi(`/api/warehouse/adjustments?${params.toString()}`);
    },
  });
  return { ...result, loading: result.isLoading };
}

export function useCreateAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdjustmentPayload) =>
      callApi("/api/warehouse/adjustments", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["warehouse-inventory"] });
      void qc.invalidateQueries({ queryKey: ["warehouse-adjustments"] });
      void qc.invalidateQueries({ queryKey: ["warehouse-movements"] });
    },
  });
}

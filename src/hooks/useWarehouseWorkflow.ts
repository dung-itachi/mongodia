import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type WorkflowItem = {
  productId?: string;
  variantId?: string;
  giftId?: string;
  orderedQuantity?: number;
  receivedQuantity?: number;
  quantity?: number;
};

export type ReceiptPayload = {
  warehouseId: string;
  items: WorkflowItem[];
  note?: string;
};

export type TransferPayload = {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  items: WorkflowItem[];
  note?: string;
  status?: "DRAFT" | "SENT" | "COMPLETED";
};

export type ShipmentPayload = {
  items?: WorkflowItem[];
  note?: string;
};

export type ReturnPayload = {
  items: WorkflowItem[];
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

export function useWarehouseWorkflowInventory(filters: { warehouseId?: string; itemType?: string; page?: number; limit?: number }) {
  const result = useQuery({
    queryKey: ["warehouse-inventory", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.warehouseId) params.set("warehouseId", filters.warehouseId);
      if (filters.itemType) params.set("itemType", filters.itemType);
      if (filters.page) params.set("page", String(filters.page));
      if (filters.limit) params.set("limit", String(filters.limit));
      return callApi(`/api/warehouse/inventory?${params.toString()}`);
    },
  });
  return { ...result, loading: result.isLoading };
}

export function useWarehouseMovements(filters: { warehouseId?: string; type?: string; startDate?: string; endDate?: string; search?: string; page?: number; limit?: number }) {
  const result = useQuery({
    queryKey: ["warehouse-movements", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.warehouseId) params.set("warehouseId", filters.warehouseId);
      if (filters.type) params.set("type", filters.type);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.search) params.set("search", filters.search);
      if (filters.page) params.set("page", String(filters.page));
      if (filters.limit) params.set("limit", String(filters.limit));
      return callApi(`/api/warehouse/movements?${params.toString()}`);
    },
  });
  return { ...result, loading: result.isLoading };
}

export function useWarehouseReceipts(filters: { warehouseId?: string; search?: string; productId?: string; createdBy?: string; page?: number; limit?: number }) {
  const result = useQuery({
    queryKey: ["warehouse-receipts", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.warehouseId) params.set("warehouseId", filters.warehouseId);
      if (filters.search) params.set("search", filters.search);
      if (filters.productId) params.set("productId", filters.productId);
      if (filters.createdBy) params.set("createdBy", filters.createdBy);
      if (filters.page) params.set("page", String(filters.page));
      if (filters.limit) params.set("limit", String(filters.limit));
      return callApi(`/api/warehouse/imports?${params.toString()}`);
    },
  });
  return { ...result, loading: result.isLoading };
}

export function useWarehouseTransfers(filters: { status?: string; page?: number; limit?: number }) {
  const result = useQuery({
    queryKey: ["warehouse-transfers", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.page) params.set("page", String(filters.page));
      if (filters.limit) params.set("limit", String(filters.limit));
      return callApi(`/api/warehouse/transfers?${params.toString()}`);
    },
  });
  return { ...result, loading: result.isLoading };
}

export function useCreateReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReceiptPayload) => callApi("/api/warehouse/imports", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["warehouse-inventory"] });
      void qc.invalidateQueries({ queryKey: ["warehouse-receipts"] });
      void qc.invalidateQueries({ queryKey: ["warehouse-movements"] });
    },
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransferPayload) => callApi("/api/warehouse/transfers", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["warehouse-inventory"] });
      void qc.invalidateQueries({ queryKey: ["warehouse-transfers"] });
      void qc.invalidateQueries({ queryKey: ["warehouse-movements"] });
    },
  });
}

export function useReceiveTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { receivedQuantities: number[]; note?: string } }) =>
      callApi(`/api/warehouse/transfers/${id}/receive`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["warehouse-inventory"] });
      void qc.invalidateQueries({ queryKey: ["warehouse-transfers"] });
      void qc.invalidateQueries({ queryKey: ["warehouse-movements"] });
    },
  });
}

export function useShipOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: ShipmentPayload }) =>
      callApi(`/api/warehouse/orders/${orderId}/ship`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["warehouse-inventory"] });
      void qc.invalidateQueries({ queryKey: ["warehouse-movements"] });
      void qc.invalidateQueries({ queryKey: ["order"] });
      void qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useReturnOrderStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: ReturnPayload }) =>
      callApi(`/api/warehouse/orders/${orderId}/return`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["warehouse-inventory"] });
      void qc.invalidateQueries({ queryKey: ["warehouse-movements"] });
      void qc.invalidateQueries({ queryKey: ["order"] });
      void qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

/**
 * useReconciliationLists Hook
 *
 * 🧾 Lấy 2 danh sách cho trang Đối soát từ URL param:
 *  - pendingOrders: đơn DELIVERED + isReconciled=false (cần đối soát)
 *  - reconciledOrders: đơn DELIVERED + isReconciled=true (đã đối soát)
 */

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { OrderListItem } from "@/types/order";

type UseReconciliationListsParams = {
  /** Giới hạn số đơn tải về cho mỗi nhóm (mặc định 500). */
  limit?: number;
};

type ReconciliationListsData = {
  pendingOrders: OrderListItem[];
  reconciledOrders: OrderListItem[];
};

async function fetchDeliveredOrders(
  isReconciled: boolean,
  limit: number
): Promise<OrderListItem[]> {
  const params = new URLSearchParams();
  params.set("status", "DELIVERED");
  params.set("isReconciled", String(isReconciled));
  params.set("limit", String(limit));
  const response = await api.get(`/api/orders?${params.toString()}`);
  const items = (response.data?.data?.items ?? []) as OrderListItem[];
  return items;
}

export function useReconciliationLists(
  params: UseReconciliationListsParams = {}
): ReconciliationListsData & { loading: boolean; refetch: () => void } {
  const { limit = 500 } = params;

  const pending = useQuery<OrderListItem[], Error>({
    queryKey: ["orders", "reconciliation", "pending", limit],
    queryFn: () => fetchDeliveredOrders(false, limit),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const reconciled = useQuery<OrderListItem[], Error>({
    queryKey: ["orders", "reconciliation", "reconciled", limit],
    queryFn: () => fetchDeliveredOrders(true, limit),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const refetch = () => {
    void pending.refetch();
    void reconciled.refetch();
  };

  return {
    pendingOrders: pending.data ?? [],
    reconciledOrders: reconciled.data ?? [],
    loading: pending.isLoading || reconciled.isLoading,
    refetch,
  };
}

export default useReconciliationLists;
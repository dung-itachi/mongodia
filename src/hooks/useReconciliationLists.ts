/**
 * useReconciliationLists Hook
 *
 * 🧾 Lấy song song 3 danh sách đơn hàng cần cho trang "Đối soát":
 *  - deliveredOrders: đơn DELIVERED chưa đối soát (cần chuyển → RECONCILED)
 *  - returnedOrders: đơn RETURNED chưa đối soát (cần chuyển → RECONCILED)
 *  - reconciledOrders: đơn đã đối soát (để hiển thị stats)
 *
 * Tất cả chạy song song qua React Query; refetch dùng chung 1 hàm.
 */

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { OrderListItem } from "@/types/order";

type UseReconciliationListsParams = {
  /** Giới hạn số đơn tải về cho mỗi nhóm (mặc định 200). */
  limit?: number;
};

type ReconciliationListsData = {
  deliveredOrders: OrderListItem[];
  returnedOrders: OrderListItem[];
  reconciledOrders: OrderListItem[];
};

async function fetchListByStatus(
  status: string,
  limit: number
): Promise<OrderListItem[]> {
  const params = new URLSearchParams();
  params.set("status", status);
  params.set("limit", String(limit));
  const response = await api.get(`/api/orders?${params.toString()}`);
  const items = (response.data?.data?.items ?? []) as OrderListItem[];
  return items;
}

export function useReconciliationLists(
  params: UseReconciliationListsParams = {}
): ReconciliationListsData & { loading: boolean; refetch: () => void } {
  const { limit = 200 } = params;

  const delivered = useQuery<OrderListItem[], Error>({
    queryKey: ["orders", "reconciliation", "delivered", limit],
    queryFn: () => fetchListByStatus("DELIVERED", limit),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const returned = useQuery<OrderListItem[], Error>({
    queryKey: ["orders", "reconciliation", "returned", limit],
    queryFn: () => fetchListByStatus("RETURNED", limit),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const reconciled = useQuery<OrderListItem[], Error>({
    queryKey: ["orders", "reconciliation", "reconciled", limit],
    queryFn: () => fetchListByStatus("RECONCILED", limit),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const refetch = () => {
    void delivered.refetch();
    void returned.refetch();
    void reconciled.refetch();
  };

  return {
    deliveredOrders: delivered.data ?? [],
    returnedOrders: returned.data ?? [],
    reconciledOrders: reconciled.data ?? [],
    loading: delivered.isLoading || returned.isLoading || reconciled.isLoading,
    refetch,
  };
}

export default useReconciliationLists;
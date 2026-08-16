/**
 * ReconciliationPanel Component
 *
 * 🧾 Panel chính của trang Đối soát (?status=RECONCILED).
 * Thiết kế theo mongolia-crm (7).html:
 *
 *  ┌───────────────────────────────────────────┐
 *  │ Stats row: Giao TC · Hoàn · ĐS · Doanh thu│
 *  ├───────────────────────────────────────────┤
 *  │ ✅→Đối soát (DELIVERED)                   │
 *  │  Bảng + nút ☑ ĐS tất cả + ☑ từng dòng    │
 *  ├───────────────────────────────────────────┤
 *  │ ↩→Đối soát (RETURNED)                    │
 *  │  Bảng + nút ☑ ĐS tất cả + ☑ từng dòng    │
 *  └───────────────────────────────────────────┘
 *
 * Sử dụng:
 *   <ReconciliationPanel />
 *
 * Props: (không) — tự fetch & mutate.
 */

import { memo, useCallback, useState } from "react";
import { App } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useReconciliationLists } from "@/hooks/useReconciliationLists";
import { useChangeOrderStatus } from "@/hooks/useOrders";
import type { OrderListItem } from "@/types/order";
import ReconciliationStats from "./ReconciliationStats";
import ReconciliationCard from "./ReconciliationCard";
import styles from "../orders.module.css";

function totalAmount(orders: OrderListItem[]): number {
  return orders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
}

function ReconciliationPanelInner() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const {
    deliveredOrders,
    returnedOrders,
    reconciledOrders,
    loading,
    refetch,
  } = useReconciliationLists({ limit: 500 });

  const changeStatus = useChangeOrderStatus();
  const [bulkSubmittingDelivered, setBulkSubmittingDelivered] = useState(false);
  const [bulkSubmittingReturned, setBulkSubmittingReturned] = useState(false);

  const invalidateReconciliation = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["orders", "reconciliation"],
    });
    void refetch();
  }, [queryClient, refetch]);

  const handleReconcileOne = useCallback(
    async (id: string) => {
      try {
        await changeStatus.mutateAsync({
          id,
          data: { status: "RECONCILED" },
        });
        message.success("Đã đối soát đơn hàng");
        invalidateReconciliation();
      } catch (error) {
        message.error(
          error instanceof Error
            ? error.message
            : "Không thể đối soát đơn hàng"
        );
      }
    },
    [changeStatus, message, invalidateReconciliation]
  );

  const handleReconcileAll = useCallback(
    async (source: "delivered" | "returned") => {
      const list =
        source === "delivered" ? deliveredOrders : returnedOrders;
      if (list.length === 0) return;

      const setLoading =
        source === "delivered"
          ? setBulkSubmittingDelivered
          : setBulkSubmittingReturned;
      setLoading(true);

      const results = await Promise.allSettled(
        list.map((o) =>
          changeStatus.mutateAsync({
            id: o._id,
            data: { status: "RECONCILED" },
          })
        )
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;

      setLoading(false);

      if (succeeded > 0) {
        message.success(
          `Đã đối soát ${succeeded}/${results.length} đơn${
            failed > 0 ? ` (${failed} lỗi)` : ""
          }`
        );
      }
      if (failed > 0 && succeeded === 0) {
        message.error("Đối soát thất bại");
      }

      invalidateReconciliation();
    },
    [
      deliveredOrders,
      returnedOrders,
      changeStatus,
      message,
      invalidateReconciliation,
    ]
  );

  return (
    <div className={styles["recon-panel"]}>
      <ReconciliationStats
        deliveredCount={deliveredOrders.length}
        returnedCount={returnedOrders.length}
        reconciledCount={reconciledOrders.length}
        deliveredRevenue={totalAmount(deliveredOrders)}
        loading={loading}
      />

      <ReconciliationCard
        title={<>✅ → Đối soát</>}
        accentColor="green"
        orders={deliveredOrders}
        loading={loading}
        onReconcileOne={handleReconcileOne}
        onReconcileAll={() => handleReconcileAll("delivered")}
        bulkSubmitting={bulkSubmittingDelivered}
        showRevenue
      />

      <ReconciliationCard
        title={<>↩ → Đối soát</>}
        accentColor="orange"
        orders={returnedOrders}
        loading={loading}
        onReconcileOne={handleReconcileOne}
        onReconcileAll={() => handleReconcileAll("returned")}
        bulkSubmitting={bulkSubmittingReturned}
      />
    </div>
  );
}

const ReconciliationPanel = memo(ReconciliationPanelInner);
export default ReconciliationPanel;
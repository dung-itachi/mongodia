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
import { useExchangeRate } from "@/hooks/useExchangeRate";
import type { OrderListItem } from "@/types/order";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import ReconciliationStats from "./ReconciliationStats";
import ReconciliationCard from "./ReconciliationCard";
import styles from "../orders.module.css";

function totalAmount(orders: OrderListItem[]): number {
  return orders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
}

function ReconciliationPanelInner() {
  const lang = useLanguageStore((s) => s.language);
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const {
    deliveredOrders,
    returnedOrders,
    reconciledOrders,
    loading,
    refetch,
  } = useReconciliationLists({ limit: 500 });

  const { data: exchangeRateData } = useExchangeRate();
  const exchangeRate = exchangeRateData?.rate ?? 1;

  const changeStatus = useChangeOrderStatus();
  const [bulkSubmittingDelivered, setBulkSubmittingDelivered] = useState(false);
  const [bulkSubmittingReturned, setBulkSubmittingReturned] = useState(false);

  // Track orders that have been clicked for reconciliation (local only)
  const [reconciledOrderIds, setReconciledOrderIds] = useState<Set<string>>(new Set());

  // Sort delivered orders: un-reconciled first, reconciled (clicked) at bottom
  const sortedDeliveredOrders = [...deliveredOrders].sort((a, b) => {
    const aDone = reconciledOrderIds.has(a._id);
    const bDone = reconciledOrderIds.has(b._id);
    if (aDone && !bDone) return 1;
    if (!aDone && bDone) return -1;
    return 0;
  });

  // Sort returned orders: un-reconciled first, reconciled (clicked) at bottom
  const sortedReturnedOrders = [...returnedOrders].sort((a, b) => {
    const aDone = reconciledOrderIds.has(a._id);
    const bDone = reconciledOrderIds.has(b._id);
    if (aDone && !bDone) return 1;
    if (!aDone && bDone) return -1;
    return 0;
  });

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
        message.success(t("Đã đối soát đơn hàng", lang));
        // Add to local reconciled set (will be removed after refetch)
        setReconciledOrderIds((prev) => new Set([...prev, id]));
        invalidateReconciliation();
      } catch (error) {
        message.error(
          error instanceof Error
            ? error.message
            : t("Không thể đối soát đơn hàng", lang)
        );
      }
    },
    [changeStatus, message, invalidateReconciliation, lang]
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

      // Mark all as reconciled locally first
      const allIds = list.map((o) => o._id);
      setReconciledOrderIds((prev) => new Set([...prev, ...allIds]));

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
          `${t("Đã đối soát", lang)} ${succeeded}/${results.length} ${t("đơn", lang)}${
            failed > 0 ? ` (${failed} ${t("lỗi", lang)})` : ""
          }`
        );
      }
      if (failed > 0 && succeeded === 0) {
        message.error(t("Đối soát thất bại", lang));
      }

      invalidateReconciliation();
    },
    [
      deliveredOrders,
      returnedOrders,
      changeStatus,
      message,
      invalidateReconciliation,
      lang,
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
        title={<>{`✅ ${t("Đơn giao thành công", lang)}`}</>}
        accentColor="green"
        orders={sortedDeliveredOrders}
        loading={loading}
        onReconcileOne={handleReconcileOne}
        onReconcileAll={() => handleReconcileAll("delivered")}
        bulkSubmitting={bulkSubmittingDelivered}
        showRevenue
        exchangeRate={exchangeRate}
      />

      <ReconciliationCard
        title={<>{`↩ ${t("Đơn đã đối soát", lang)}`}</>}
        accentColor="orange"
        orders={sortedReturnedOrders}
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
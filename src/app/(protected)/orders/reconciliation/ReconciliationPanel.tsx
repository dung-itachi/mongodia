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
import { useExchangeRate } from "@/hooks/useExchangeRate";
import type { OrderListItem } from "@/types/order";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import ReconciliationStats from "./ReconciliationStats";
import ReconciliationCard from "./ReconciliationCard";
import styles from "../orders.module.css";

async function reconcileOrder(orderId: string, value: boolean): Promise<void> {
  const response = await fetch(`/api/orders/${orderId}/reconcile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!response.ok) throw new Error("Failed to reconcile order");
}

function totalAmount(orders: OrderListItem[]): number {
  return orders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
}

function ReconciliationPanelInner() {
  const lang = useLanguageStore((s) => s.language);
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const {
    pendingOrders,
    reconciledOrders,
    loading,
    refetch,
  } = useReconciliationLists({ limit: 500 });

  const { data: exchangeRateData } = useExchangeRate();
  const exchangeRate = exchangeRateData?.rate ?? 1;

  const [bulkSubmittingPending, setBulkSubmittingPending] = useState(false);
  const [bulkSubmittingReconciled, setBulkSubmittingReconciled] = useState(false);

  // Track orders that have been clicked for reconciliation (local only)
  const [reconciledOrderIds, setReconciledOrderIds] = useState<Set<string>>(new Set());

  // Sort pending orders: un-reconciled first, reconciled (clicked) at bottom
  const sortedPendingOrders = [...pendingOrders].sort((a, b) => {
    const aDone = reconciledOrderIds.has(a._id);
    const bDone = reconciledOrderIds.has(b._id);
    if (aDone && !bDone) return 1;
    if (!aDone && bDone) return -1;
    return 0;
  });

  // Sort reconciled orders: reconciled first
  const sortedReconciledOrders = [...reconciledOrders].sort((a, b) => {
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
        await reconcileOrder(id, true);
        message.success(t("Đã đối soát đơn hàng", lang));
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
    [message, invalidateReconciliation, lang]
  );

  const handleUnreconcileOne = useCallback(
    async (id: string) => {
      try {
        await reconcileOrder(id, false);
        message.success(t("Đã bỏ đối soát đơn hàng", lang));
        setReconciledOrderIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        invalidateReconciliation();
      } catch (error) {
        message.error(
          error instanceof Error
            ? error.message
            : t("Không thể bỏ đối soát đơn hàng", lang)
        );
      }
    },
    [message, invalidateReconciliation, lang]
  );

  const handleReconcileAll = useCallback(
    async (source: "pending" | "reconciled") => {
      const list = source === "pending" ? pendingOrders : reconciledOrders;
      if (list.length === 0) return;

      const setLoading =
        source === "pending"
          ? setBulkSubmittingPending
          : setBulkSubmittingReconciled;
      setLoading(true);

      const allIds = list.map((o) => o._id);
      setReconciledOrderIds((prev) => new Set([...prev, ...allIds]));

      const reconcileFn = source === "pending"
        ? (id: string) => reconcileOrder(id, true)
        : (id: string) => reconcileOrder(id, false);

      const results = await Promise.allSettled(
        list.map((o) => reconcileFn(o._id))
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
      } else {
        message.error(t("Đối soát thất bại", lang));
      }

      invalidateReconciliation();
    },
    [pendingOrders, reconciledOrders, message, invalidateReconciliation, lang]
  );

  return (
    <div className={styles["recon-panel"]}>
      <ReconciliationStats
        pendingCount={pendingOrders.length}
        reconciledCount={reconciledOrders.length}
        pendingRevenue={totalAmount(pendingOrders)}
        loading={loading}
      />

      <ReconciliationCard
        title={<>{`✅ ${t("Đơn chưa đối soát", lang)}`}</>}
        accentColor="green"
        orders={sortedPendingOrders}
        loading={loading}
        onReconcileOne={handleReconcileOne}
        onReconcileAll={() => handleReconcileAll("pending")}
        bulkSubmitting={bulkSubmittingPending}
        showRevenue
        exchangeRate={exchangeRate}
      />

      <ReconciliationCard
        title={<>{`↩ ${t("Đơn đã đối soát", lang)}`}</>}
        accentColor="purple"
        orders={sortedReconciledOrders}
        loading={loading}
        onReconcileOne={handleUnreconcileOne}
        onReconcileAll={() => handleReconcileAll("reconciled")}
        bulkSubmitting={bulkSubmittingReconciled}
        showRevenue
        exchangeRate={exchangeRate}
        isReconciled
      />
    </div>
  );
}

const ReconciliationPanel = memo(ReconciliationPanelInner);
export default ReconciliationPanel;
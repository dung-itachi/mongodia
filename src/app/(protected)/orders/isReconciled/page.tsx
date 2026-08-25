"use client";

/**
 * ReconciliationPage - Trang Đối soát
 * 
 * Route: /orders/isReconciled
 * Hiển thị cả 2 phần:
 *   - Đơn chưa đối soát (DELIVERED + isReconciled=false)
 *   - Đơn đã đối soát (DELIVERED + isReconciled=true)
 */

import ReconciliationPanel from "../reconciliation/ReconciliationPanel";
import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export default function ReconciliationPage() {
  const lang = useLanguageStore((s) => s.language);

  return (
    <PageContainer>
      <PageHeader
        title={t("Đối soát đơn hàng", lang)}
        breadcrumb={[
          { label: t("Trang chủ", lang), href: "/" },
          { label: t("Đơn hàng", lang), href: "/orders" },
          { label: t("Đối soát", lang) },
        ]}
      />
      <ReconciliationPanel />
    </PageContainer>
  );
}

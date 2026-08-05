"use client";

/**
 * ==================================================
 * MARKETING EXPENSE DETAIL PAGE
 * ==================================================
 *
 * Sprint 6.12 — Marketing Expense Detail
 *
 * Route: /marketing/expense/[id]
 *
 * Components:
 *   - MarketingExpenseDetail (main detail view)
 *   - MarketingExpenseWorkflowBar (reuse)
 *   - MarketingExpenseSummaryCard (reuse)
 *   - MarketingExpenseAuditCard (new)
 *   - MarketingExpenseTimeline (new)
 *
 * Hooks:
 *   - useMarketingExpense(id)
 *   - useMarketingExpenseTimeline(id)
 *
 * Permission:
 *   - marketing-expense.view
 *
 * Architecture:
 *   Page → useMarketingExpense() → API Route → Service → Repository → MongoDB
 */

import { use } from "react";
import { Suspense } from "react";
import { useRouter } from "next/navigation";

import PageContainer from "@/components/common/layout/PageContainer";
import { PermissionGate } from "@/components/common";
import MarketingExpenseDetail from "@/components/marketing-expense/MarketingExpenseDetail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MarketingExpenseDetailPage({ params }: PageProps) {
  const router = useRouter();

  return (
    <PageContainer>
      <PermissionGate
        permission="marketing-expense.view"
        fallback={
          <div style={{ padding: 24, textAlign: "center" }}>
            Bạn không có quyền xem báo cáo chi phí marketing.
          </div>
        }
      >
        <Suspense fallback={<div>Đang tải...</div>}>
          <MarketingExpenseDetailWrapper params={params} />
        </Suspense>
      </PermissionGate>
    </PageContainer>
  );
}

function MarketingExpenseDetailWrapper({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const handleBack = () => {
    router.push("/marketing/expense");
  };

  const handleSuccess = () => {
    // Refetch will happen automatically via React Query
  };

  return (
    <MarketingExpenseDetail
      id={id}
      onBack={handleBack}
      onSuccess={handleSuccess}
    />
  );
}

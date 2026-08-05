/**
 * ==================================================
 * MARKETING EXPENSE DETAIL COMPONENT
 * ==================================================
 *
 * Sprint 6.12 — Marketing Expense Detail (Refactored)
 *
 * Trang Detail cho Marketing Expense Report.
 * Layout:
 *   Header
 *   Action Bar (WorkflowBar)
 *   Summary Card
 *   Tabs (config-driven)
 *
 * Dùng hooks:
 *   - useMarketingExpense(id)
 *   - useMarketingExpenseTimeline(id)
 *
 * Tabs config:
 *   MARKETING_EXPENSE_DETAIL_TABS[].map(...)
 *
 * Không mock, không tự tính.
 */

import { Tabs, Card } from "antd";
import {
  FileTextOutlined,
} from "@ant-design/icons";

import { useMarketingExpense, useMarketingExpenseTimeline } from "@/hooks/useMarketingExpenses";

import MarketingExpenseWorkflowBar from "./MarketingExpenseWorkflowBar";
import MarketingExpenseSummaryCard from "./MarketingExpenseSummaryCard";
import MarketingExpenseTimeline from "./MarketingExpenseTimeline";

import SkeletonCard from "@/components/common/overlay/SkeletonCard";
import EmptyState from "@/components/common/display/EmptyState";
import StatusBadge from "@/components/common/display/StatusBadge";
import { marketingExpenseStatusConfig } from "@/configs/marketing-expense-status.config";
import {
  MARKETING_EXPENSE_DETAIL_TABS,
  type DetailTabConfig,
} from "@/configs/marketing-expense-detail-tabs.config";

import styles from "./marketing-expense-detail.module.css";

interface MarketingExpenseDetailProps {
  id: string;
  onBack?: () => void;
  onSuccess?: () => void;
}

export default function MarketingExpenseDetail({
  id,
  onBack,
  onSuccess,
}: MarketingExpenseDetailProps) {
  const { data: expense, loading, error } = useMarketingExpense(id);
  const { data: timelineHistory } = useMarketingExpenseTimeline(id);

  if (loading) {
    return (
      <div className={styles.container}>
        <SkeletonCard rows={8} title />
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className={styles.container}>
        <EmptyState
          title="Không tìm thấy báo cáo"
          description={error ?? "Báo cáo không tồn tại hoặc đã bị xóa."}
          action={
            onBack ? (
              <a onClick={onBack}>Quay lại danh sách</a>
            ) : undefined
          }
        />
      </div>
    );
  }

  // Build tab items từ config
  const tabItems = MARKETING_EXPENSE_DETAIL_TABS.map((tabConfig: DetailTabConfig) => ({
    key: tabConfig.key,
    label: tabConfig.label,
    children: buildTabContent(tabConfig, expense, id, timelineHistory),
  }));

  return (
    <div className={styles.container}>
      <Card className={styles.headerCard}>
        <div className={styles.headerRow}>
          <div className={styles.headerTitle}>
            <FileTextOutlined />
            <span>Báo cáo chi phí marketing</span>
            <StatusBadge
              status={expense.status}
              mapping={marketingExpenseStatusConfig as unknown as Record<string, { color: string; backgroundColor: string; label: string }>}
            />
          </div>
          {onBack && (
            <a onClick={onBack} className={styles.backLink}>
              ← Quay lại
            </a>
          )}
        </div>

        <MarketingExpenseWorkflowBar
          recordId={id}
          status={expense.status}
          permissions={[]}
          onSuccess={onSuccess}
        />
      </Card>

      <MarketingExpenseSummaryCard
        requestedBudget={expense.requestedBudget}
        spentBudget={expense.spentBudget}
        totalRevenue={expense.totalRevenue}
        totalLeads={expense.totalLeads}
        closedLeads={expense.closedLeads}
      />

      <Tabs items={tabItems} defaultActiveKey="info" className={styles.tabs} />
    </div>
  );
}

// ============================================================================
// Tab Content Builder
// ============================================================================

function buildTabContent(
  tabConfig: DetailTabConfig,
  expense: NonNullable<ReturnType<typeof useMarketingExpense>["data"]>,
  id: string,
  timelineHistory?: ReturnType<typeof useMarketingExpenseTimeline>["data"]
): React.ReactNode {
  // Timeline tab cần thêm props
  if (tabConfig.key === "timeline") {
    return (
      <MarketingExpenseTimeline
        history={timelineHistory ?? []}
        loading={false}
      />
    );
  }

  // Các tab khác dùng buildContent
  return tabConfig.buildContent(expense);
}

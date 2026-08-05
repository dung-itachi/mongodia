/**
 * ==================================================
 * MARKETING EXPENSE WORKFLOW BAR COMPONENT
 * ==================================================
 *
 * Workflow Simplification Refactor (Aug 2026)
 *
 * Config-driven workflow action bar.
 * Không chứa business rule - chỉ render actions từ config.
 *
 * Workflow mới:
 *   DRAFT → LOCKED → REOPENED → LOCKED
 *
 * Actions:
 *   - Nếu DRAFT/REOPENED: Marketing thấy nút "Khóa báo cáo"
 *   - Nếu LOCKED: Admin thấy nút "Mở lại"
 *   - Nếu LOCKED: Marketing không thấy nút gì
 */

import { memo, useCallback } from "react";
import { Button, Space, Popconfirm } from "antd";

import {
  getMarketingExpenseActions,
  type ActionConfig,
} from "@/configs/marketing-expense-actions.config";

import {
  useLockMarketingExpense,
  useReopenMarketingExpense,
} from "@/hooks/useMarketingExpenses";

import styles from "./marketing-expense-workflow.module.css";

interface MarketingExpenseWorkflowBarProps {
  recordId: string;
  status: string;
  permissions?: string[];
  onSuccess?: () => void;
}

function MarketingExpenseWorkflowBarInner({
  recordId,
  status,
  permissions = [],
  onSuccess,
}: MarketingExpenseWorkflowBarProps) {
  const lockMutation = useLockMarketingExpense();
  const reopenMutation = useReopenMarketingExpense();

  const isSubmitting =
    lockMutation.isPending ||
    reopenMutation.isPending;

  const actions = getMarketingExpenseActions(status, permissions);

  const handleLock = useCallback(() => {
    lockMutation.mutate(recordId, {
      onSuccess: () => onSuccess?.(),
    });
  }, [recordId, lockMutation, onSuccess]);

  const handleReopen = useCallback(() => {
    reopenMutation.mutate(recordId, {
      onSuccess: () => onSuccess?.(),
    });
  }, [recordId, reopenMutation, onSuccess]);

  const getActionHandler = (action: ActionConfig) => {
    switch (action.id) {
      case "lock":
        return handleLock;
      case "reopen":
        return handleReopen;
      default:
        return undefined;
    }
  };

  const getActionConfirmTitle = (action: ActionConfig) => {
    switch (action.id) {
      case "lock":
        return "Khóa báo cáo?";
      case "reopen":
        return "Mở lại báo cáo?";
      default:
        return undefined;
    }
  };

  const getActionConfirmDescription = (action: ActionConfig) => {
    switch (action.id) {
      case "lock":
        return "Báo cáo sẽ bị khóa và không thể chỉnh sửa.";
      case "reopen":
        return "Báo cáo sẽ được mở lại để chỉnh sửa.";
      default:
        return undefined;
    }
  };

  const renderAction = (action: ActionConfig) => {
    const onClick = getActionHandler(action);
    const confirmTitle = getActionConfirmTitle(action);
    const confirmDescription = getActionConfirmDescription(action);

    const button = (
      <Button
        key={action.id}
        loading={isSubmitting}
        icon={action.icon}
        danger={action.danger}
        onClick={onClick}
      >
        {action.label}
      </Button>
    );

    if (confirmTitle) {
      return (
        <Popconfirm
          key={action.id}
          title={confirmTitle}
          description={confirmDescription}
          onConfirm={onClick as () => void}
          okText="Xác nhận"
          cancelText="Hủy"
        >
          {button}
        </Popconfirm>
      );
    }

    return button;
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      <div className={styles.workflowBar}>
        <Space size="small" wrap>
          {actions.map(renderAction)}
        </Space>
      </div>
    </>
  );
}

const MarketingExpenseWorkflowBar = memo(MarketingExpenseWorkflowBarInner);
export default MarketingExpenseWorkflowBar;

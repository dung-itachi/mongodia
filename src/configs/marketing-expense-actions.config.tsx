/**
 * ==================================================
 * MARKETING EXPENSE ACTION MENU CONFIG
 * ==================================================
 *
 * Workflow Simplification Refactor (Aug 2026)
 *
 * Config-driven action menu cho MarketingExpenseReport.
 *
 * Workflow mới:
 *   DRAFT / REOPENED  →  LOCKED  (Marketing tự lock)
 *                      ↑
 *                  REOPENED (Admin mở lại)
 *
 * Actions:
 *   - View: luôn hiển thị
 *   - Edit: DRAFT, REOPENED
 *   - Lock: DRAFT, REOPENED (Marketing)
 *   - Reopen: LOCKED (Admin)
 *   - Delete: DRAFT, REOPENED
 */

import type { MenuProps } from "antd";
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
} from "@ant-design/icons";

import { MarketingExpenseReportStatus } from "@/constants/marketing-expense";

// ============================================================================
// Action Types
// ============================================================================

export type ActionId =
  | "view"
  | "edit"
  | "lock"
  | "reopen"
  | "delete";

export interface ActionConfig {
  id: ActionId;
  label: string;
  icon: React.ReactNode;
  /** Các status cho phép action này. */
  allowedStatuses: MarketingExpenseReportStatus[];
  /** Hiển thị divider sau action này. */
  dividerAfter?: boolean;
  /** Action nguy hiểm (màu đỏ). */
  danger?: boolean;
  /** Permission required for this action. */
  permission?: string;
}

// ============================================================================
// Action Definitions
// ============================================================================

export const MARKETING_EXPENSE_ACTIONS: ActionConfig[] = [
  {
    id: "view",
    label: "Xem chi tiết",
    icon: <EyeOutlined />,
    allowedStatuses: Object.values(MarketingExpenseReportStatus),
  },
  {
    id: "edit",
    label: "Sửa",
    icon: <EditOutlined />,
    allowedStatuses: [
      MarketingExpenseReportStatus.DRAFT,
      MarketingExpenseReportStatus.REOPENED,
    ],
    permission: "marketing-expense.update",
  },
  {
    id: "lock",
    label: "Khóa báo cáo",
    icon: <LockOutlined />,
    allowedStatuses: [
      MarketingExpenseReportStatus.DRAFT,
      MarketingExpenseReportStatus.REOPENED,
    ],
    permission: "marketing-expense.lock",
    dividerAfter: true,
  },
  {
    id: "reopen",
    label: "Mở lại",
    icon: <UnlockOutlined />,
    allowedStatuses: [MarketingExpenseReportStatus.LOCKED],
    permission: "marketing-expense.reopen",
    dividerAfter: true,
  },
  {
    id: "delete",
    label: "Xóa",
    icon: <DeleteOutlined />,
    allowedStatuses: [
      MarketingExpenseReportStatus.DRAFT,
      MarketingExpenseReportStatus.REOPENED,
    ],
    permission: "marketing-expense.delete",
    danger: true,
  },
];

// ============================================================================
// Helpers
// ============================================================================

/**
 * Lấy danh sách actions cho workflow bar.
 * Tự động filter theo:
 *   - status (action.allowedStatuses)
 *   - permissions (action.permission)
 */
export function getMarketingExpenseActions(
  status: MarketingExpenseReportStatus | string,
  permissions?: string[]
): ActionConfig[] {
  const allowedActions: ActionConfig[] = [];

  for (const action of MARKETING_EXPENSE_ACTIONS) {
    const isStatusAllowed = action.allowedStatuses.includes(
      status as MarketingExpenseReportStatus
    );
    if (!isStatusAllowed) continue;

    if (action.permission && permissions) {
      const hasPermission = permissions.includes(action.permission);
      if (!hasPermission) continue;
    }

    if (action.id === "view" || action.id === "edit" || action.id === "delete") {
      continue;
    }

    allowedActions.push(action);
  }

  return allowedActions;
}

/**
 * Kiểm tra user có quyền thực hiện action không.
 */
export function hasPermissionForAction(
  actionId: ActionId,
  permissions?: string[]
): boolean {
  const action = MARKETING_EXPENSE_ACTIONS.find((a) => a.id === actionId);
  if (!action || !action.permission) return true;
  if (!permissions) return false;
  return permissions.includes(action.permission);
}

/**
 * Lấy danh sách menu items cho action menu.
 */
export function getMarketingExpenseMenuItems(
  status: MarketingExpenseReportStatus | string,
  onAction?: (actionId: ActionId, recordId: string) => void,
  recordId?: string,
  permissions?: string[]
): MenuProps["items"] {
  const items: MenuProps["items"] = [];

  for (const action of MARKETING_EXPENSE_ACTIONS) {
    const isStatusAllowed = action.allowedStatuses.includes(
      status as MarketingExpenseReportStatus
    );
    if (!isStatusAllowed) continue;

    if (action.permission && permissions) {
      const hasPermission = permissions.includes(action.permission);
      if (!hasPermission) continue;
    }

    items.push({
      key: action.id,
      icon: action.icon,
      label: action.label,
      danger: action.danger,
      disabled: false,
      onClick: onAction && recordId
        ? () => onAction(action.id, recordId)
        : undefined,
    });

    if (action.dividerAfter) {
      items.push({ type: "divider" as const });
    }
  }

  return items;
}

/**
 * Kiểm tra action có được phép thực hiện không.
 */
export function canPerformAction(
  actionId: ActionId,
  status: MarketingExpenseReportStatus | string,
  permissions?: string[]
): boolean {
  const action = MARKETING_EXPENSE_ACTIONS.find((a) => a.id === actionId);
  if (!action) return false;

  const isStatusAllowed = action.allowedStatuses.includes(
    status as MarketingExpenseReportStatus
  );
  if (!isStatusAllowed) return false;

  if (action.permission && permissions) {
    return permissions.includes(action.permission);
  }

  return true;
}

/**
 * ==================================================
 * MARKETING EXPENSE HISTORY CONFIG
 * ==================================================
 *
 * Workflow Simplification Refactor (Aug 2026)
 *
 * Timeline config cho MarketingExpenseHistory.
 * Dùng config object pattern — Timeline chỉ cần config[action].
 */

import {
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
  PlusCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

import { MarketingExpenseAction } from "@/constants/marketing-expense-action";

export interface HistoryActionConfig {
  label: string;
  icon: React.ReactNode;
  color: string;
}

export const MARKETING_EXPENSE_HISTORY_CONFIG: Record<
  MarketingExpenseAction,
  HistoryActionConfig
> = {
  [MarketingExpenseAction.CREATED]: {
    label: "Tạo báo cáo",
    icon: <PlusCircleOutlined />,
    color: "blue",
  },
  [MarketingExpenseAction.UPDATED]: {
    label: "Cập nhật",
    icon: <EditOutlined />,
    color: "gray",
  },
  [MarketingExpenseAction.LOCKED]: {
    label: "Khóa báo cáo",
    icon: <LockOutlined />,
    color: "red",
  },
  [MarketingExpenseAction.REOPENED]: {
    label: "Mở lại báo cáo",
    icon: <UnlockOutlined />,
    color: "orange",
  },
  [MarketingExpenseAction.DELETED]: {
    label: "Xóa báo cáo",
    icon: <DeleteOutlined />,
    color: "red",
  },
};

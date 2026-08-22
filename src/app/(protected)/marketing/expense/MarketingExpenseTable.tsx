/**
 * Marketing Expense Table (Sprint 6.9 — Marketing Expense List UI)
 * Sprint 6.10 — Config-driven action menu, StatusBadge, Calculator
 *
 * Columns:
 *   Report Date | Facebook Page | Marketing Employee |
 *   Requested Budget | Approved Budget | Spent Budget | Remaining Budget |
 *   ROAS | CPA | Conversion Rate | Status | Created At | Actions
 *
 * Sort: gọi onSortChange (field, order) → gửi lên server.
 * Action menu: config-driven từ marketing-expense-actions.config.ts
 */

import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import type { ColumnType } from "antd/es/table";
import { MoreOutlined } from "@ant-design/icons";

import DataTable from "@/components/common/table/DataTable";
import StatusBadge from "@/components/common/display/StatusBadge";

import type { MarketingExpenseResponse } from "@/mappers/marketing-expense.mapper";

import {
  MarketingExpenseReportStatus,
  MARKETING_EXPENSE_STATUS_LABELS,
} from "@/constants/marketing-expense";

import {
  getMarketingExpenseMenuItems,
} from "@/configs/marketing-expense-actions.config";
import { marketingExpenseStatusConfig } from "@/configs/marketing-expense-status.config";
import { sumBudgetAllocation } from "@/utils/MarketingExpenseCalculator";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

import styles from "@/app/(protected)/marketing/expense/marketing-expense.module.css";

// ============================================================================
// Helpers
// ============================================================================

const VND = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const PCT = new Intl.NumberFormat("vi-VN", {
  style: "percent",
  maximumFractionDigits: 2,
});

function formatVND(value: unknown): string {
  return VND.format(Number(value) || 0);
}

function formatPct(value: unknown): string {
  return PCT.format(Number(value) || 0);
}

function formatDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatRoas(value: unknown): string {
  const n = Number(value) || 0;
  return `${n.toFixed(2)}x`;
}

function formatCpa(value: unknown): string {
  return formatVND(value);
}

function getEmployeeName(
  emp: { fullName?: string; employeeCode?: string; _id?: string } | string | null | undefined
): string {
  if (!emp) return "—";
  if (typeof emp === "string") return emp;
  return emp.fullName ?? "—";
}

function getEmployeeCode(
  emp: { fullName?: string; employeeCode?: string; _id?: string } | string | null | undefined
): string {
  if (!emp) return "";
  if (typeof emp === "string") return "";
  return emp.employeeCode ?? "";
}

function getFbPageName(
  page: { name?: string; code?: string; _id?: string } | string | null | undefined
): string {
  if (!page) return "—";
  if (typeof page === "string") return page;
  return page.name ?? page.code ?? "—";
}

// ============================================================================
// Column definitions
// ============================================================================

type ActionHandler = (actionId: string, recordId: string) => void;

function buildColumns(
  _onSortChange: (field: string, order: "asc" | "desc" | undefined) => void,
  sortField?: string,
  sortOrder?: "asc" | "desc",
  onAction?: ActionHandler,
  lang: ReturnType<typeof useLanguageStore.getState>["language"] = "vi"
): ColumnType<MarketingExpenseResponse>[] {
  return [
    {
      key: "reportDate",
      title: t("Ngày báo cáo", lang),
      dataIndex: "reportDate",
      width: 120,
      sorter: true,
      sortOrder: sortField === "reportDate"
        ? sortOrder === "asc"
          ? "ascend"
          : "descend"
        : undefined,
      render: (value: unknown) => formatDate(value),
    },

    {
      key: "facebookPage",
      title: t("Facebook Page", lang),
      width: 160,
      render: (_: unknown, record) => {
        const page = record.facebookPage;
        const name = getFbPageName(page);
        return (
          <div>
            <div className={styles["me-cell-primary"]}>{name}</div>
          </div>
        );
      },
    },

    {
      key: "marketingEmployee",
      title: t("Nhân viên Marketing", lang),
      width: 160,
      render: (_: unknown, record) => {
        const emp = record.marketingEmployee;
        return (
          <div>
            <div className={styles["me-cell-primary"]}>
              {getEmployeeName(emp)}
            </div>
            {getEmployeeCode(emp) && (
              <div className={styles["me-cell-secondary"]}>
                {getEmployeeCode(emp)}
              </div>
            )}
          </div>
        );
      },
    },

    {
      key: "requestedBudget",
      title: t("Ngân sách yêu cầu", lang),
      dataIndex: "requestedBudget",
      width: 140,
      align: "right" as const,
      sorter: true,
      sortOrder: sortField === "requestedBudget"
        ? sortOrder === "asc"
          ? "ascend"
          : "descend"
        : undefined,
      render: (_: unknown, record) => {
        const total = sumBudgetAllocation(record.requestedBudget);
        return <span style={{ fontWeight: 500 }}>{formatVND(total)}</span>;
      },
    },

    {
      key: "approvedBudget",
      title: t("Ngân sách duyệt", lang),
      dataIndex: "approvedBudget",
      width: 140,
      align: "right" as const,
      sorter: true,
      sortOrder: sortField === "approvedBudget"
        ? sortOrder === "asc"
          ? "ascend"
          : "descend"
        : undefined,
      render: (_: unknown, record) => {
        // Trong model hiện tại, "approved" = "requested".
        const total = sumBudgetAllocation(record.requestedBudget);
        return <span style={{ fontWeight: 500 }}>{formatVND(total)}</span>;
      },
    },

    {
      key: "spentBudget",
      title: t("Ngân sách thực chi", lang),
      dataIndex: "spentBudget",
      width: 140,
      align: "right" as const,
      sorter: true,
      sortOrder: sortField === "spentBudget"
        ? sortOrder === "asc"
          ? "ascend"
          : "descend"
        : undefined,
      render: (_: unknown, record) => {
        const total = sumBudgetAllocation(record.spentBudget);
        return <span style={{ fontWeight: 500 }}>{formatVND(total)}</span>;
      },
    },

    {
      key: "remainingBudget",
      title: t("Ngân sách còn lại", lang),
      dataIndex: "remainingBudget",
      width: 140,
      align: "right" as const,
      sorter: true,
      sortOrder: sortField === "remainingBudget"
        ? sortOrder === "asc"
          ? "ascend"
          : "descend"
        : undefined,
      render: (_: unknown, record) => (
        <span style={{ fontWeight: 500, color: "#52c41a" }}>
          {formatVND(record.remainingBudget)}
        </span>
      ),
    },

    {
      key: "roas",
      title: "ROAS",
      dataIndex: "roas",
      width: 90,
      align: "right" as const,
      sorter: true,
      sortOrder: sortField === "roas"
        ? sortOrder === "asc"
          ? "ascend"
          : "descend"
        : undefined,
      render: (value: unknown) => (
        <span style={{ fontWeight: 500 }}>{formatRoas(value)}</span>
      ),
    },

    {
      key: "cpa",
      title: "CPA",
      dataIndex: "cpa",
      width: 110,
      align: "right" as const,
      sorter: true,
      sortOrder: sortField === "cpa"
        ? sortOrder === "asc"
          ? "ascend"
          : "descend"
        : undefined,
      render: (value: unknown) => (
        <span style={{ fontWeight: 500 }}>{formatCpa(value)}</span>
      ),
    },

    {
      key: "conversionRate",
      title: t("Tỷ lệ chuyển đổi", lang),
      dataIndex: "conversionRate",
      width: 120,
      align: "right" as const,
      sorter: true,
      sortOrder: sortField === "conversionRate"
        ? sortOrder === "asc"
          ? "ascend"
          : "descend"
        : undefined,
      render: (value: unknown) => (
        <span style={{ fontWeight: 500 }}>{formatPct(value)}</span>
      ),
    },

    {
      key: "status",
      title: t("Trạng thái", lang),
      dataIndex: "status",
      width: 130,
      render: (_: unknown, record) => (
        <StatusBadge
          status={record.status}
          mapping={marketingExpenseStatusConfig}
        />
      ),
    },

    {
      key: "createdAt",
      title: t("Ngày tạo", lang),
      dataIndex: "createdAt",
      width: 120,
      sorter: true,
      sortOrder: sortField === "createdAt"
        ? sortOrder === "asc"
          ? "ascend"
          : "descend"
        : undefined,
      render: (value: unknown) => formatDate(value),
    },

    {
      key: "actions",
      title: t("Thao tác", lang),
      width: 120,
      align: "center" as const,
      render: (_: unknown, record) => {
        const handleMenuClick = (e: { key: string }) => {
          onAction?.(e.key, record._id);
        };

        const menuItems = getMarketingExpenseMenuItems(
          record.status,
          undefined,
          record._id
        );

        return (
          <Dropdown
            trigger={["click"]}
            menu={{ items: menuItems, onClick: handleMenuClick }}
          >
            <button
              type="button"
              className="ant-btn ant-btn-ghost ant-btn-sm"
              style={{ padding: "4px 8px", display: "flex", alignItems: "center", justifyContent: "center", margin: "auto" }}
            >
              <MoreOutlined />
            </button>
          </Dropdown>
        );
      },
    },
  ];
}

// ============================================================================
// Component
// ============================================================================

export interface MarketingExpenseTableProps {
  data: MarketingExpenseResponse[];
  loading?: boolean;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (field: string, order: "asc" | "desc" | undefined) => void;
  onChange?: (
    pagination: unknown,
    filters: unknown,
    sorter: unknown
  ) => void;
  onEdit?: (recordId: string) => void;
}

export default function MarketingExpenseTable({
  data,
  loading,
  sortField,
  sortOrder,
  onSortChange,
  onChange,
  onEdit,
}: MarketingExpenseTableProps) {
  const lang = useLanguageStore((s) => s.language);
  const handleAction: ActionHandler = (actionId, recordId) => {
    if (actionId === "view" || actionId === "edit") {
      onEdit?.(recordId);
    }
  };

  const columns = buildColumns(
    (field, order) => onSortChange?.(field, order),
    sortField,
    sortOrder,
    handleAction,
    lang
  );

  return (
    <DataTable
      columns={columns as unknown as import("@/components/common/table/DataTable").Column[]}
      data={data as unknown as Record<string, unknown>[]}
      loading={loading}
      rowKey="_id"
      onChange={onChange as unknown as undefined}
      emptyText={t("Chưa có báo cáo", lang)}
      scroll={{ x: 1400 }}
      size="middle"
    />
  );
}

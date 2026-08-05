/**
 * ==================================================
 * MARKETING EXPENSE AUDIT CARD
 * ==================================================
 *
 * Workflow Simplification Refactor (Aug 2026)
 *
 * Chuẩn bị audit items cho AuditCard generic.
 * Không hardcode field names — dùng AuditItem[].
 */

import type { MarketingExpenseResponse } from "@/mappers/marketing-expense.mapper";
import { AuditCard } from "@/components/common";
import type { AuditItem } from "@/components/common";

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getEmployeeName(
  employee?: { fullName: string; employeeCode: string } | null
): React.ReactNode {
  if (!employee) return null;
  return `${employee.fullName} (${employee.employeeCode})`;
}

export default function MarketingExpenseAuditCard({
  data,
}: MarketingExpenseAuditCardProps) {
  const auditItems: AuditItem[] = [
    {
      label: "Người tạo",
      value: getEmployeeName(data.createdByEmployee),
    },
    {
      label: "Thời gian tạo",
      value: formatDateTime(data.createdAt),
    },
    {
      label: "Thời gian sửa",
      value: formatDateTime(data.updatedAt),
    },
    // Locked — chỉ hiện khi có dữ liệu
    ...(data.lockedBy
      ? [
          {
            label: "Người khóa",
            value: getEmployeeName(data.lockedByEmployee),
          } as AuditItem,
          {
            label: "Thời gian khóa",
            value: formatDateTime(data.lockedAt),
          } as AuditItem,
        ]
      : []),
    // Reopened — chỉ hiện khi có dữ liệu
    ...(data.reopenedBy
      ? [
          {
            label: "Người mở lại",
            value: getEmployeeName(data.reopenedByEmployee),
          } as AuditItem,
          {
            label: "Thời gian mở lại",
            value: formatDateTime(data.reopenedAt),
          } as AuditItem,
        ]
      : []),
  ];

  return <AuditCard items={auditItems} />;
}

interface MarketingExpenseAuditCardProps {
  data: MarketingExpenseResponse;
}

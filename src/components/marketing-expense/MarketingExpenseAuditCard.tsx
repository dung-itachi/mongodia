"use client";

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
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

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
  const lang = useLanguageStore((s) => s.language);
  const auditItems: AuditItem[] = [
    {
      label: t("Người tạo", lang),
      value: getEmployeeName(data.createdByEmployee),
    },
    {
      label: t("Thời gian tạo", lang),
      value: formatDateTime(data.createdAt),
    },
    {
      label: t("Thời gian sửa", lang),
      value: formatDateTime(data.updatedAt),
    },
    // Locked — chỉ hiện khi có dữ liệu
    ...(data.lockedBy
      ? [
          {
            label: t("Người khóa", lang),
            value: getEmployeeName(data.lockedByEmployee),
          } as AuditItem,
          {
            label: t("Thời gian khóa", lang),
            value: formatDateTime(data.lockedAt),
          } as AuditItem,
        ]
      : []),
    // Reopened — chỉ hiện khi có dữ liệu
    ...(data.reopenedBy
      ? [
          {
            label: t("Người mở lại", lang),
            value: getEmployeeName(data.reopenedByEmployee),
          } as AuditItem,
          {
            label: t("Thời gian mở lại", lang),
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

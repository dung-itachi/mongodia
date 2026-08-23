"use client";

/**
 * ==================================================
 * MARKETING EXPENSE TIMELINE COMPONENT
 * ==================================================
 *
 * Sprint 6.12 — Marketing Expense Detail (Refactored)
 *
 * Hiển thị lịch sử thay đổi của báo cáo.
 * Dùng Ant Design Timeline + config object.
 *
 * Usage:
 *   config = MARKETING_EXPENSE_HISTORY_CONFIG[action]
 *   // → { label, icon, color }
 *
 * Không dùng switch/if-else.
 */

import { Timeline as AntTimeline, Empty, Card } from "antd";

import type { MarketingExpenseHistoryItem } from "@/repositories/marketing-expense-history.repository";
import { MarketingExpenseAction } from "@/constants/marketing-expense-action";
import { MARKETING_EXPENSE_HISTORY_CONFIG } from "@/configs/marketing-expense-history.config";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

import styles from "./marketing-expense-timeline.module.css";

interface MarketingExpenseTimelineProps {
  history: MarketingExpenseHistoryItem[];
  loading?: boolean;
}

function formatDateTime(dateStr: string): string {
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

export default function MarketingExpenseTimeline({
  history,
  loading,
}: MarketingExpenseTimelineProps) {
  const lang = useLanguageStore((s) => s.language);

  if (loading) {
    return (
      <Card title={t("Lịch sử", lang)} className={styles.timelineCard}>
        <div className={styles.loading}>{t("Đang tải...", lang)}</div>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card title={t("Lịch sử", lang)} className={styles.timelineCard}>
        <Empty description={t("Chưa có lịch sử", lang)} />
      </Card>
    );
  }

  const timelineItems = history.map((item) => {
    // Get config by action — không dùng switch/if
    const config = MARKETING_EXPENSE_HISTORY_CONFIG[item.action as MarketingExpenseAction];

    return {
      key: item._id,
      color: config?.color ?? "gray",
      icon: config?.icon,
      content: (
        <div className={styles.timelineItem}>
          <div className={styles.timelineHeader}>
            <span className={styles.timelineAction}>
              {config?.label ?? item.action}
            </span>
            <span className={styles.timelineTime}>
              {formatDateTime(item.createdAt)}
            </span>
          </div>
          {item.employee && (
            <div className={styles.timelineEmployee}>
              {item.employee.fullName} ({item.employee.employeeCode})
            </div>
          )}
          {item.note && (
            <div className={styles.timelineNote}>{item.note}</div>
          )}
        </div>
      ),
    };
  });

  return (
    <Card title={t("Lịch sử", lang)} className={styles.timelineCard}>
      <AntTimeline items={timelineItems} />
    </Card>
  );
}

"use client";

/**
 * ==================================================
 * MARKETING EXPENSE SUMMARY CARD COMPONENT
 * ==================================================
 *
 * Sprint 6.10 — Marketing Expense UI Improvements (Point 2)
 *
 * Component hiển thị tổng quan ngân sách và hiệu suất.
 * Dùng chung cho:
 *   - Drawer (create/edit form)
 *   - Detail view
 *   - Approve workflow
 *   - Dashboard preview
 *
 * Calculator: calculateBudgetSummary()
 */

import { calculateBudgetSummary } from "@/utils/MarketingExpenseCalculator";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

import styles from "@/app/(protected)/marketing/expense/marketing-expense.module.css";

export interface MarketingExpenseSummaryCardProps {
  requestedBudget?: { morning: number; afternoon: number; emergency: number };
  spentBudget?: { morning: number; afternoon: number; emergency: number };
  totalRevenue: number;
  totalLeads: number;
  closedLeads: number;
}

export default function MarketingExpenseSummaryCard({
  requestedBudget,
  spentBudget,
  totalRevenue,
  totalLeads,
  closedLeads,
}: MarketingExpenseSummaryCardProps) {
  const lang = useLanguageStore((s) => s.language);
  const summary = calculateBudgetSummary({ requestedBudget, spentBudget });

  const roas =
    totalRevenue > 0 && summary.spent > 0
      ? totalRevenue / summary.spent
      : 0;

  const cpa = totalLeads > 0 ? summary.spent / totalLeads : 0;

  const conversionRate = totalLeads > 0 ? closedLeads / totalLeads : 0;

  const formatVND = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryTitle}>{t("Tổng quan", lang)}</div>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>{t("Ngân sách yêu cầu", lang)}</span>
          <span className={styles.summaryValue}>
            {formatVND(summary.requested)}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>{t("Ngân sách duyệt", lang)}</span>
          <span className={styles.summaryValue}>
            {formatVND(summary.approved)}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>{t("Ngân sách thực chi", lang)}</span>
          <span className={styles.summaryValue}>
            {formatVND(summary.spent)}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>{t("Ngân sách còn lại", lang)}</span>
          <span
            className={`${styles.summaryValue} ${
              summary.remaining >= 0 ? styles.positive : styles.negative
            }`}
          >
            {formatVND(summary.remaining)}
          </span>
        </div>
      </div>

      <div className={styles.performanceSection}>
        <div className={styles.summaryTitle}>{t("Hiệu suất", lang)}</div>
        <div className={styles.performanceGrid}>
          <div className={styles.performanceItem}>
            <span className={styles.performanceLabel}>ROAS</span>
            <span className={`${styles.performanceValue} ${styles.roas}`}>
              {roas.toFixed(2)}x
            </span>
          </div>
          <div className={styles.performanceItem}>
            <span className={styles.performanceLabel}>CPA</span>
            <span className={`${styles.performanceValue} ${styles.cpa}`}>
              {formatVND(cpa)}
            </span>
          </div>
          <div className={styles.performanceItem}>
            <span className={styles.performanceLabel}>{t("Tỷ lệ chuyển đổi", lang)}</span>
            <span className={`${styles.performanceValue} ${styles.conversion}`}>
              {(conversionRate * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

/**
 * ==================================================
 * BUDGET ALLOCATION TABLE COMPONENT
 * ==================================================
 *
 * Sprint 6.10 — Marketing Expense UI Improvements (Points 1, 4)
 *
 * Table hiển thị budget theo các ca làm việc:
 *   - Morning (Sáng)
 *   - Afternoon (Chiều)
 *   - Emergency (Khẩn cấp)
 *
 * Mỗi dòng gồm:
 *   - Requested Budget (input)
 *   - Approved Budget (readonly = requested)
 *   - Spent Budget (input)
 *   - Remaining Budget (readonly, calculated)
 *
 * Calculator: sumBudgetAllocation()
 * Debounce: 200ms cho budget inputs
 */

import { memo, useState, useEffect, useCallback, useRef } from "react";
import { InputNumber } from "antd";
import type { UseFormWatch, UseFormSetValue } from "react-hook-form";

import type { MarketingExpenseForm } from "@/validators/marketing-expense.form";
import {
  sumBudgetAllocation,
  calculateRemainingBudget,
} from "@/utils/MarketingExpenseCalculator";
import { MARKETING_BUDGET_SLOTS, type BudgetSlotId } from "@/configs/marketing-budget-slots.config";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

import styles from "@/app/(protected)/marketing/expense/marketing-expense.module.css";

interface BudgetAllocationTableProps {
  watch: UseFormWatch<MarketingExpenseForm>;
  setValue: UseFormSetValue<MarketingExpenseForm>;
  readOnly?: boolean;
}

function DebouncedInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (val: number | null) => {
      const numVal = val ?? 0;
      setLocalValue(numVal);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        onChange(numVal);
      }, 200);
    },
    [onChange]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <InputNumber
      value={localValue}
      onChange={handleChange}
      min={0}
      disabled={disabled}
      formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
      parser={(val) => Number(val?.replace(/,/g, "") || 0) ?? 0}
      className={styles.budgetInput}
    />
  );
}

function BudgetAllocationTableInner({
  watch,
  setValue,
  readOnly = false,
}: BudgetAllocationTableProps) {
  const lang = useLanguageStore((s) => s.language);
  const requestedBudget = watch("requestedBudget");
  const spentBudget = watch("spentBudget");

  const requested = requestedBudget ?? { morning: 0, afternoon: 0, emergency: 0 };
  const spent = spentBudget ?? { morning: 0, afternoon: 0, emergency: 0 };

  const requestedTotal = sumBudgetAllocation(requested);
  const spentTotal = sumBudgetAllocation(spent);
  const remainingTotal = calculateRemainingBudget(requested, spent);

  const formatVND = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleRequestedChange = useCallback(
    (shift: BudgetSlotId, value: number) => {
      setValue("requestedBudget", {
        ...requested,
        [shift]: value,
      });
    },
    [requested, setValue]
  );

  const handleSpentChange = useCallback(
    (shift: BudgetSlotId, value: number) => {
      setValue("spentBudget", {
        ...spent,
        [shift]: value,
      });
    },
    [spent, setValue]
  );

  return (
    <div>
      <table className={styles.budgetTable}>
        <thead>
          <tr>
            <th>{t("Ca", lang)}</th>
            <th>{t("Ngân sách yêu cầu", lang)}</th>
            <th>{t("Ngân sách duyệt", lang)}</th>
            <th>{t("Đã chi", lang)}</th>
            <th>{t("Còn lại", lang)}</th>
          </tr>
        </thead>
        <tbody>
          {MARKETING_BUDGET_SLOTS.map((slot) => {
            const requestedValue = requested[slot.id] ?? 0;
            const spentValue = spent[slot.id] ?? 0;
            const remaining = requestedValue - spentValue;

            return (
              <tr key={slot.id}>
                <td>
                  <span className={styles.budgetRowLabel}>{slot.label}</span>
                </td>
                <td>
                  <DebouncedInput
                    value={requestedValue}
                    onChange={(val) => handleRequestedChange(slot.id, val)}
                    disabled={readOnly}
                  />
                </td>
                <td>
                  <InputNumber
                    className={styles.budgetInput}
                    value={requestedValue}
                    min={0}
                    disabled
                    formatter={(val) =>
                      `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(val) =>
                      Number(val?.replace(/,/g, "") || 0) ?? 0
                    }
                  />
                </td>
                <td>
                  <DebouncedInput
                    value={spentValue}
                    onChange={(val) => handleSpentChange(slot.id, val)}
                    disabled={readOnly}
                  />
                </td>
                <td>
                  <span
                    className={`${styles.budgetRemaining} ${
                      remaining < 0 ? styles.negative : ""
                    }`}
                  >
                    {formatVND(remaining)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>
              <strong>{t("Tổng cộng", lang)}</strong>
            </td>
            <td>
              <strong>{formatVND(requestedTotal)}</strong>
            </td>
            <td>
              <strong>{formatVND(requestedTotal)}</strong>
            </td>
            <td>
              <strong>{formatVND(spentTotal)}</strong>
            </td>
            <td>
              <span
                className={`${styles.budgetRemaining} ${
                  remainingTotal < 0 ? styles.negative : ""
                }`}
              >
                {formatVND(remainingTotal)}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const BudgetAllocationTable = memo(BudgetAllocationTableInner);
export default BudgetAllocationTable;

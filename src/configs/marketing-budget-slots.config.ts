/**
 * ==================================================
 * MARKETING BUDGET SLOTS CONFIG
 * ==================================================
 *
 * Sprint 6.10 — Marketing Expense UI Improvements (Point 1)
 *
 * Cấu hình các ca làm việc trong phân bổ ngân sách.
 * Dễ dàng thêm ca mới: EVENING, HOLIDAY, FLASH SALE...
 *
 * Mỗi slot gồm:
 *   - id: unique key
 *   - label: tên hiển thị
 *   - icon: icon tùy chọn
 */

export type BudgetSlotId = "morning" | "afternoon" | "emergency";

export interface BudgetSlot {
  id: BudgetSlotId;
  label: string;
}

export const MARKETING_BUDGET_SLOTS: BudgetSlot[] = [
  { id: "morning", label: "Sáng" },
  { id: "afternoon", label: "Chiều" },
  { id: "emergency", label: "Khẩn cấp" },
];

export const SLOT_LABELS: Record<BudgetSlotId, string> = {
  morning: "Sáng",
  afternoon: "Chiều",
  emergency: "Khẩn cấp",
};

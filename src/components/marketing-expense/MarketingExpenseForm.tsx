/**
 * ==================================================
 * MARKETING EXPENSE FORM COMPONENT
 * ==================================================
 *
 * Sprint 6.10 — Marketing Expense UI Improvements (Point 3)
 *
 * Pure form component - chỉ chịu trách nhiệm form.
 * Không biết gì về drawer/open/close.
 *
 * Architecture:
 *   Parent (Drawer/Page)
 *   ↓
 *   MarketingExpenseForm
 *   ↓
 *   useForm
 *   ↓
 *   onSubmit callback
 */

import { memo, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { DatePicker, Input } from "antd";
import dayjs from "dayjs";

import FormField from "@/components/common/forms/FormField";
import CardSection from "@/components/common/cards/CardSection";
import AsyncSelect from "@/components/common/inputs/AsyncSelect";

import {
  marketingExpenseFormSchema,
  defaultMarketingExpenseForm,
  type MarketingExpenseForm,
} from "@/validators/marketing-expense.validator";

import { useFacebookPages, useMarketingEmployees } from "@/hooks/useMarketingExpenseLookups";

import BudgetAllocationTable from "./BudgetAllocationTable";
import MarketingExpenseSummaryCard from "./MarketingExpenseSummaryCard";

import styles from "./marketing-expense.module.css";

const { TextArea } = Input;

export interface MarketingExpenseFormProps {
  record?: {
    _id: string;
    reportDate: string;
    marketingEmployeeId: string;
    facebookPageId: string | null;
    requestedBudget: { morning: number; afternoon: number; emergency: number };
    spentBudget: { morning: number; afternoon: number; emergency: number };
    totalRevenue: number;
    totalLeads: number;
    closedLeads: number;
    note?: string;
  } | null;
  onSubmit: (data: MarketingExpenseForm) => void;
  readOnly?: boolean;
}

function MarketingExpenseFormInner({
  record,
  onSubmit,
  readOnly = false,
}: MarketingExpenseFormProps) {
  const { pages, loading: pagesLoading } = useFacebookPages();
  const { employees, loading: employeesLoading } = useMarketingEmployees();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MarketingExpenseForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(marketingExpenseFormSchema) as Resolver<
      MarketingExpenseForm,
      any
    >,
    defaultValues: defaultMarketingExpenseForm,
  });

  const requestedBudget = watch("requestedBudget");
  const spentBudget = watch("spentBudget");
  const totalRevenue = watch("totalRevenue") ?? 0;
  const totalLeads = watch("totalLeads") ?? 0;
  const closedLeads = watch("closedLeads") ?? 0;

  useEffect(() => {
    if (!record) return;

    reset({
      reportDate: dayjs(record.reportDate).format("YYYY-MM-DD"),
      marketingEmployeeId: record.marketingEmployeeId,
      facebookPageId: record.facebookPageId ?? null,
      requestedBudget: record.requestedBudget,
      spentBudget: record.spentBudget,
      totalRevenue: record.totalRevenue ?? 0,
      totalLeads: record.totalLeads ?? 0,
      closedLeads: record.closedLeads ?? 0,
      note: record.note ?? "",
    });
  }, [record, reset]);

  const pageOptions = pages.map((p) => ({ label: p.label, value: p.value }));
  const employeeOptions = employees.map((e) => ({
    label: e.label,
    value: e.value,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <CardSection title="Thông tin báo cáo">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <FormField
            label="Ngày báo cáo"
            required
            error={errors.reportDate?.message}
          >
            <Controller
              name="reportDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày"
                  status={errors.reportDate ? "error" : undefined}
                  disabled={readOnly}
                  onChange={(date) =>
                    field.onChange(date?.format("YYYY-MM-DD") ?? "")
                  }
                  value={field.value ? dayjs(field.value) : undefined}
                />
              )}
            />
          </FormField>

          <FormField
            label="Nhân viên Marketing"
            required
            error={errors.marketingEmployeeId?.message}
          >
            <Controller
              name="marketingEmployeeId"
              control={control}
              render={({ field }) => (
                <AsyncSelect
                  options={employeeOptions}
                  placeholder="Chọn nhân viên marketing"
                  loading={employeesLoading}
                  disabled={readOnly}
                  onChange={(val) => field.onChange(val ?? "")}
                  value={field.value || undefined}
                />
              )}
            />
          </FormField>

          <FormField
            label="Facebook Page"
            error={errors.facebookPageId?.message}
          >
            <Controller
              name="facebookPageId"
              control={control}
              render={({ field }) => (
                <AsyncSelect
                  options={pageOptions}
                  placeholder="Chọn Facebook Page (để trống = toàn team)"
                  loading={pagesLoading}
                  disabled={readOnly}
                  onChange={(val) => field.onChange(val ?? null)}
                  value={field.value || undefined}
                  allowClear
                />
              )}
            />
          </FormField>
        </div>
      </CardSection>

      <CardSection title="Phân bổ ngân sách">
        <BudgetAllocationTable watch={watch} setValue={setValue} readOnly={readOnly} />
      </CardSection>

      <MarketingExpenseSummaryCard
        requestedBudget={requestedBudget}
        spentBudget={spentBudget}
        totalRevenue={totalRevenue}
        totalLeads={totalLeads}
        closedLeads={closedLeads}
      />

      <CardSection title="Thông tin bổ sung">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            <FormField label="Tổng doanh thu" error={errors.totalRevenue?.message}>
              <Controller
                name="totalRevenue"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    value={field.value ?? 0}
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                    placeholder="0"
                    min={0}
                    disabled={readOnly}
                  />
                )}
              />
            </FormField>

            <FormField label="Tổng leads" error={errors.totalLeads?.message}>
              <Controller
                name="totalLeads"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    value={field.value ?? 0}
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                    placeholder="0"
                    min={0}
                    disabled={readOnly}
                  />
                )}
              />
            </FormField>

            <FormField label="Leads đã chốt" error={errors.closedLeads?.message}>
              <Controller
                name="closedLeads"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    value={field.value ?? 0}
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                    placeholder="0"
                    min={0}
                    disabled={readOnly}
                  />
                )}
              />
            </FormField>
          </div>

          <FormField label="Ghi chú" error={errors.note?.message}>
            <Controller
              name="note"
              control={control}
              render={({ field }) => (
                <TextArea
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Nhập ghi chú (không bắt buộc)"
                  rows={3}
                  disabled={readOnly}
                />
              )}
            />
          </FormField>
        </div>
      </CardSection>
    </form>
  );
}

const MarketingExpenseForm = memo(MarketingExpenseFormInner);
export default MarketingExpenseForm;

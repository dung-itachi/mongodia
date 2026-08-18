/**
 * ==================================================
 * MARKETING EXPENSE DRAWER COMPONENT
 * ==================================================
 *
 * Sprint 6.10 — Marketing Expense UI Improvements (Point 3)
 * Sprint 6.11 — Added WorkflowBar
 *
 * Drawer wrapper - open/close, mutation handling, dirty form detection.
 * Form content nằm trong nhưng dùng Controller pattern.
 *
 * Mode:
 *   - create: POST /api/marketing/expenses
 *   - edit: PATCH /api/marketing/expenses/:id + WorkflowBar
 */

import { memo, useCallback, useEffect, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver, SubmitHandler } from "react-hook-form";
import { DatePicker, Input } from "antd";
import dayjs from "dayjs";
import { Button, Space } from "antd";

import DrawerForm from "@/components/common/forms/DrawerForm";
import FormField from "@/components/common/forms/FormField";
import CardSection from "@/components/common/cards/CardSection";
import AsyncSelect from "@/components/common/inputs/AsyncSelect";
import ConfirmDialog from "@/components/common/feedback/ConfirmDialog";

import {
  marketingExpenseFormSchema,
  defaultMarketingExpenseForm,
  type MarketingExpenseForm,
} from "@/validators/marketing-expense.form";

import {
  useCreateMarketingExpense,
  useUpdateMarketingExpense,
  useMarketingExpense,
} from "@/hooks/useMarketingExpenses";
import { useFacebookPages, useMarketingEmployees } from "@/hooks/useMarketingExpenseLookups";

import BudgetAllocationTable from "./BudgetAllocationTable";
import MarketingExpenseSummaryCard from "./MarketingExpenseSummaryCard";
import MarketingExpenseWorkflowBar from "./MarketingExpenseWorkflowBar";

import styles from "@/app/(protected)/marketing/expense/marketing-expense.module.css";

const { TextArea } = Input;

export interface MarketingExpenseDrawerProps {
  mode: "create" | "edit";
  open: boolean;
  recordId?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function MarketingExpenseDrawerInner({
  mode,
  open,
  recordId,
  onClose,
  onSuccess,
}: MarketingExpenseDrawerProps) {
  const isEdit = mode === "edit";
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const { pages, loading: pagesLoading } = useFacebookPages();
  const { employees, loading: employeesLoading } = useMarketingEmployees();

  const { data: recordData, refetch } = useMarketingExpense(
    isEdit && recordId ? recordId : null
  );

  const createMutation = useCreateMarketingExpense();
  const updateMutation = useUpdateMarketingExpense();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
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

  const currentStatus = recordData?.status;
  const isLocked = currentStatus === "LOCKED";
  const readOnly = isLocked;

  useEffect(() => {
    if (!open) return;
    if (!isEdit || !recordData) {
      reset(defaultMarketingExpenseForm);
      return;
    }

    reset({
      reportDate: dayjs(recordData.reportDate).format("YYYY-MM-DD"),
      marketingEmployeeId: recordData.marketingEmployeeId,
      facebookPageId: recordData.facebookPageId ?? null,
      requestedBudget: recordData.requestedBudget,
      spentBudget: recordData.spentBudget,
      totalRevenue: recordData.totalRevenue ?? 0,
      totalLeads: recordData.totalLeads ?? 0,
      closedLeads: recordData.closedLeads ?? 0,
      note: recordData.note ?? "",
    });
  }, [recordData, isEdit, open, reset]);

  const onSubmit: SubmitHandler<MarketingExpenseForm> = useCallback(
    (data) => {
      const payload = {
        reportDate: data.reportDate,
        marketingEmployeeId: data.marketingEmployeeId,
        facebookPageId: data.facebookPageId || null,
        requestedBudget: data.requestedBudget,
        spentBudget: data.spentBudget,
        totalRevenue: data.totalRevenue ?? 0,
        totalLeads: data.totalLeads ?? 0,
        closedLeads: data.closedLeads ?? 0,
        note: data.note ?? "",
      };

      if (isEdit && recordId) {
        updateMutation.mutate(
          { id: recordId, data: payload },
          {
            onSuccess: () => {
              onSuccess?.();
              onClose();
            },
          }
        );
      } else {
        createMutation.mutate(payload, {
          onSuccess: () => {
            onSuccess?.();
            onClose();
          },
        });
      }
    },
    [isEdit, recordId, createMutation, updateMutation, onSuccess, onClose]
  );

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowConfirmCancel(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const handleConfirmCancel = useCallback(() => {
    setShowConfirmCancel(false);
    reset(defaultMarketingExpenseForm);
    onClose();
  }, [onClose, reset]);

  const handleWorkflowSuccess = useCallback(() => {
    refetch();
    onSuccess?.();
  }, [refetch, onSuccess]);

  const pageOptions = pages.map((p) => ({ label: p.label, value: p.value }));
  const employeeOptions = employees.map((e) => ({
    label: e.label,
    value: e.value,
  }));

  return (
    <>
      <DrawerForm
        open={open}
        title={isEdit ? "Sửa báo cáo chi phí" : "Tạo báo cáo chi phí"}
        width={640}
        loading={isSubmitting}
        onClose={handleClose}
        onSubmit={handleSubmit(onSubmit as (data: MarketingExpenseForm) => void)}
        submitText={isEdit ? "Cập nhật" : "Tạo mới"}
      >
        <div className={styles.form}>
          {isEdit && recordData && (
            <MarketingExpenseWorkflowBar
              recordId={recordData._id}
              status={recordData.status}
              onSuccess={handleWorkflowSuccess}
            />
          )}

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
            <BudgetAllocationTable
              watch={watch}
              setValue={setValue}
              readOnly={readOnly}
            />
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
        </div>
      </DrawerForm>

      <ConfirmDialog
        open={showConfirmCancel}
        title="Bỏ thay đổi?"
        content="Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng form không?"
        type="warning"
        confirmText="Bỏ thay đổi"
        cancelText="Tiếp tục sửa"
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowConfirmCancel(false)}
      />
    </>
  );
}

const MarketingExpenseDrawer = memo(MarketingExpenseDrawerInner);
export default MarketingExpenseDrawer;

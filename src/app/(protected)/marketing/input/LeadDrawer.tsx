/**
 * Lead Drawer Component (Sprint 5.2 — Marketing Input)
 *
 * Drawer form for creating and editing leads.
 * Uses react-hook-form + Zod so create/edit share one validation contract.
 */

import { memo, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DrawerForm, FormSection, FormField } from "@/components/common";
import { Select, Input } from "antd";
import { LEAD_SOURCE_OPTIONS, LEAD_STATUS_OPTIONS } from "@/constants/marketing";
import type { SelectProps } from "antd";
import { defaultLeadForm, marketingLeadFormSchema, type MarketingLeadForm } from "@/validators/marketing-lead.validator";
import type { MarketingLead } from "@/types/marketing-lead";

const { TextArea } = Input;

export type LeadFormData = MarketingLeadForm;

export type LeadDrawerProps = {
  open: boolean;
  loading?: boolean;
  lead?: MarketingLead | null;
  onClose: () => void;
  onSubmit: (data: LeadFormData) => void;
};

function LeadDrawerInner({
  open,
  loading,
  lead,
  onClose,
  onSubmit,
}: LeadDrawerProps) {
  const isEdit = !!lead;
  const { control, handleSubmit, reset, formState: { errors } } =
    useForm<LeadFormData>({
      resolver: zodResolver(marketingLeadFormSchema),
      defaultValues: defaultLeadForm,
    });

  useEffect(() => {
    if (!open) {
      reset(defaultLeadForm);
      return;
    }

    reset(
      lead
        ? {
            customerName: lead.customerName,
            phone: lead.phone ?? "",
            email: lead.email ?? "",
            source: lead.source,
            status: lead.status,
            note: lead.note ?? "",
          }
        : defaultLeadForm
    );
  }, [lead, open, reset]);

  const handleClose = () => {
    reset(defaultLeadForm);
    onClose();
  };

  return (
    <DrawerForm
      open={open}
      title={isEdit ? "Sửa Lead" : "Thêm Lead"}
      width={520}
      loading={loading}
      onClose={handleClose}
      onSubmit={handleSubmit(onSubmit)}
      submitText="Lưu"
    >
      <FormSection title="Thông tin khách hàng">
        <FormField label="Tên khách hàng" required error={errors.customerName?.message}>
          <Controller
            name="customerName"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Nhập tên khách hàng" status={errors.customerName ? "error" : undefined} />
            )}
          />
        </FormField>

        <FormField label="Số điện thoại" required error={errors.phone?.message}>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Nhập số điện thoại" status={errors.phone ? "error" : undefined} />
            )}
          />
        </FormField>

        <FormField label="Email" error={errors.email?.message}>
          <Controller
            name="email"
            control={control}
            render={({ field }) => <Input {...field} placeholder="Nhập email (không bắt buộc)" />}
          />
        </FormField>
      </FormSection>

      <FormSection title="Nguồn & Trạng thái">
        <FormField label="Nguồn" required error={errors.source?.message}>
          <Controller
            name="source"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                style={{ width: "100%" }}
                options={LEAD_SOURCE_OPTIONS as SelectProps["options"]}
                placeholder="Chọn nguồn"
                status={errors.source ? "error" : undefined}
              />
            )}
          />
        </FormField>

        <FormField label="Trạng thái" required error={errors.status?.message}>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                style={{ width: "100%" }}
                options={LEAD_STATUS_OPTIONS as SelectProps["options"]}
                placeholder="Chọn trạng thái"
                status={errors.status ? "error" : undefined}
              />
            )}
          />
        </FormField>
      </FormSection>

      <FormSection title="Ghi chú">
        <FormField label="Ghi chú" error={errors.note?.message}>
          <Controller
            name="note"
            control={control}
            render={({ field }) => <TextArea {...field} placeholder="Nhập ghi chú" rows={3} />}
          />
        </FormField>
      </FormSection>
    </DrawerForm>
  );
}

const LeadDrawer = memo(LeadDrawerInner);
export default LeadDrawer;

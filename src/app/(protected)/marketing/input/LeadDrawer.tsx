/**
 * Lead Drawer Component (Sprint 5.2 — Marketing Input)
 *
 * Drawer form for creating and editing leads.
 * Uses react-hook-form + Zod so create/edit share one validation contract.
 */

import { memo, useEffect, useMemo } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DrawerForm, FormSection, FormField } from "@/components/common";
import { Select, Input, DatePicker } from "antd";
import dayjs from "dayjs";
import { LEAD_SOURCE_OPTIONS, LEAD_STATUS_OPTIONS } from "@/constants/marketing";
import type { SelectProps } from "antd";
import { defaultLeadForm, marketingLeadFormSchema, type MarketingLeadForm } from "@/validators/marketing-lead.validator";
import type { MarketingLead } from "@/types/marketing-lead";
import { useActiveFacebookPages } from "@/hooks/useFacebookPages";
import { useProducts, useCombosByProduct, type ComboItem } from "@/hooks/useProducts";

const { TextArea } = Input;

export type LeadFormData = MarketingLeadForm;

export type LeadDrawerProps = {
  open: boolean;
  loading?: boolean;
  lead?: MarketingLead | null;
  onClose: () => void;
  onSubmit: (data: LeadFormData) => void;
  /** Title shown when creating a new lead. Defaults to "Thêm Lead". */
  createTitle?: string;
  /** Title shown when editing an existing lead. Defaults to "Sửa Lead". */
  editTitle?: string;
};

function LeadDrawerInner({
  open,
  loading,
  lead,
  onClose,
  onSubmit,
  createTitle = "Thêm Lead",
  editTitle = "Sửa Lead",
}: LeadDrawerProps) {
  const isEdit = !!lead;
  const { control, handleSubmit, reset, resetField, formState: { errors } } =
    useForm<LeadFormData>({
    resolver: zodResolver(marketingLeadFormSchema),
    defaultValues: defaultLeadForm,
    mode: "onSubmit",
  });

  // Watch productId to filter combos by selected product
  const watchedProductId = useWatch({ control, name: "productId" });
  const watchedComboId = useWatch({ control, name: "comboId" });

  // Sprint 8.6: Load active Facebook Pages for the page dropdown
  const { pages: facebookPages, loading: pagesLoading } = useActiveFacebookPages();

  // Sprint 9.x: Load active Products for the product dropdown
  const { products, loading: productsLoading } = useProducts();

  // Sprint 9.x: Combos filtered by selected product (Sprint 9.x enhancement)
  // If no product selected, load all combos (existing behavior).
  const { combos: rawCombos, loading: combosLoading } = useCombosByProduct(
    watchedProductId && watchedProductId.trim() !== "" ? watchedProductId : null
  );

  // Stable reference for combos array (avoid useEffect re-runs)
  const filteredCombos = useMemo(() => rawCombos, [rawCombos]);

  const facebookPageOptions: SelectProps["options"] = facebookPages.map((p) => ({
    value: p._id,
    label: `${p.name} (${p.code})`,
  }));

  const productOptions: SelectProps["options"] = products
    .filter((p) => p.isActive !== false)
    .map((p) => ({
      value: p._id,
      label: `${p.name} (${p.code})`,
    }));

  const comboOptions: SelectProps["options"] = filteredCombos.map((c) => ({
    value: c._id,
    label: `${c.name} (${c.code})`,
  }));

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
            facebookPageId: lead.facebookPage?._id ?? "",
            comboId: lead.combo?._id ?? "",
            productId: lead.product?._id ?? "",
            address: lead.address ?? "",
            orderDate: lead.orderDate ?? "",
            receivedDate: lead.receivedDate ?? "",
          }
        : defaultLeadForm
    );
  }, [lead, open, reset]);

  // Reset comboId if it no longer belongs to the filtered combo list
  // (e.g., user changes product and previous combo doesn't belong to new product)
  // Skip if productId is unset (then combos API would be disabled -> empty filteredCombos is expected)
  useEffect(() => {
    if (!watchedComboId || watchedComboId.trim() === "") return;
    if (!watchedProductId || watchedProductId.trim() === "") return;
    if (combosLoading) return;
    const exists = filteredCombos.some((c) => c._id === watchedComboId);
    if (!exists && filteredCombos.length > 0) {
      resetField("comboId");
    }
  }, [filteredCombos, watchedComboId, watchedProductId, combosLoading, resetField]);

  const handleClose = () => {
    reset(defaultLeadForm);
    onClose();
  };

  return (
    <DrawerForm
      open={open}
      title={isEdit ? editTitle : createTitle}
      width={560}
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

        <FormField label="Trang Facebook (Sprint 8.6)" error={errors.facebookPageId?.message}>
          <Controller
            name="facebookPageId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                style={{ width: "100%" }}
                allowClear
                loading={pagesLoading}
                options={facebookPageOptions}
                placeholder={pagesLoading ? "Đang tải..." : "Chọn trang Facebook (không bắt buộc)"}
                showSearch
                optionFilterProp="label"
                notFoundContent={pagesLoading ? null : "Chưa có trang Facebook nào"}
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
                disabled={isEdit}
              />
            )}
          />
        </FormField>

        <FormField label="Sản phẩm" error={errors.productId?.message}>
          <Controller
            name="productId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                style={{ width: "100%" }}
                allowClear
                loading={productsLoading}
                options={productOptions}
                placeholder={productsLoading ? "Đang tải..." : "Chọn sản phẩm (không bắt buộc)"}
                showSearch
                optionFilterProp="label"
                notFoundContent={productsLoading ? null : "Chưa có sản phẩm nào"}
              />
            )}
          />
        </FormField>

        <FormField label="Combo sản phẩm" error={errors.comboId?.message}>
          <Controller
            name="comboId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                style={{ width: "100%" }}
                allowClear
                loading={combosLoading}
                options={comboOptions}
                placeholder={combosLoading ? "Đang tải..." : "Chọn combo (không bắt buộc)"}
                showSearch
                optionFilterProp="label"
                notFoundContent={combosLoading ? null : "Chưa có combo nào"}
              />
            )}
          />
        </FormField>
      </FormSection>

      <FormSection title="Thời gian đơn hàng (Sprint 8.x)">
        <FormField label="Thời gian đơn hàng" error={errors.orderDate?.message}>
          <Controller
            name="orderDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                style={{ width: "100%" }}
                showTime
                classNames={{ popup: { root: "picker-with-time" } }}
                value={field.value ? dayjs(field.value) : null}
                onChange={(date) => field.onChange(date?.toISOString() ?? "")}
                placeholder="Chọn ngày giờ đặt hàng"
                format="DD/MM/YYYY HH:mm"
                getPopupContainer={(trigger) => trigger.parentElement as HTMLElement}
              />
            )}
          />
        </FormField>

        <FormField label="Thời gian nhận đơn" error={errors.receivedDate?.message}>
          <Controller
            name="receivedDate"
            control={control}
            render={({ field }) => (
              <div style={{ position: "relative" }}>
                <DatePicker
                  style={{ width: "100%" }}
                  showTime
                  classNames={{ popup: { root: "picker-with-time" } }}
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(date) => field.onChange(date?.toISOString() ?? "")}
                  placeholder="Chọn thời gian Marketing nhận đơn"
                  format="DD/MM/YYYY HH:mm"
                  getPopupContainer={(trigger) => trigger.parentElement as HTMLElement}
                />
              </div>
            )}
          />
        </FormField>
      </FormSection>

      <FormSection title="Địa chỉ">
        <FormField label="Địa chỉ" error={errors.address?.message}>
          <Controller
            name="address"
            control={control}
            render={({ field }) => (
              <TextArea
                {...field}
                placeholder="Nhập địa chỉ (Mông Cổ / các nước khác không phân cấp)"
                rows={2}
                autoSize={{ minRows: 2, maxRows: 4 }}
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

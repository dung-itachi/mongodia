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
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

const { TextArea } = Input;

const DEFAULT_CREATE_TITLE = "Thêm Lead";
const DEFAULT_EDIT_TITLE = "Sửa Lead";
const DEFAULT_SUBMIT_TEXT = "Lưu";

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
  createTitle = DEFAULT_CREATE_TITLE,
  editTitle = DEFAULT_EDIT_TITLE,
}: LeadDrawerProps) {
  const lang = useLanguageStore((s) => s.language);
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
      title={isEdit ? t(editTitle, lang) : t(createTitle, lang)}
      width={560}
      loading={loading}
      onClose={handleClose}
      onSubmit={handleSubmit(onSubmit)}
      submitText={t(DEFAULT_SUBMIT_TEXT, lang)}
    >
      <FormSection title={t("Thông tin khách hàng", lang)}>
        <FormField label={t("Tên khách hàng", lang)} required error={errors.customerName?.message}>
          <Controller
            name="customerName"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder={t("Nhập tên khách hàng", lang)} status={errors.customerName ? "error" : undefined} />
            )}
          />
        </FormField>

        <FormField label={t("Số điện thoại", lang)} required error={errors.phone?.message}>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder={t("Nhập số điện thoại", lang)} status={errors.phone ? "error" : undefined} />
            )}
          />
        </FormField>

        <FormField label={t("Email", lang)} error={errors.email?.message}>
          <Controller
            name="email"
            control={control}
            render={({ field }) => <Input {...field} placeholder={t("Nhập email (không bắt buộc)", lang)} />}
          />
        </FormField>
      </FormSection>

      <FormSection title={t("Nguồn & Trạng thái", lang)}>
        <FormField label={t("Nguồn", lang)} required error={errors.source?.message}>
          <Controller
            name="source"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                style={{ width: "100%" }}
                options={LEAD_SOURCE_OPTIONS as SelectProps["options"]}
                placeholder={t("Chọn nguồn", lang)}
                status={errors.source ? "error" : undefined}
              />
            )}
          />
        </FormField>

        <FormField label={`${t("Trang Facebook (Sprint 8.6)", lang)}`} error={errors.facebookPageId?.message}>
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
                placeholder={pagesLoading ? t("Đang tải...", lang) : t("Chọn trang Facebook (không bắt buộc)", lang)}
                showSearch
                optionFilterProp="label"
                notFoundContent={pagesLoading ? null : t("Chưa có trang Facebook nào", lang)}
              />
            )}
          />
        </FormField>

        <FormField label={t("Trạng thái", lang)} required error={errors.status?.message}>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                style={{ width: "100%" }}
                options={LEAD_STATUS_OPTIONS as SelectProps["options"]}
                placeholder={t("Chọn trạng thái", lang)}
                status={errors.status ? "error" : undefined}
                disabled={isEdit}
              />
            )}
          />
        </FormField>

        <FormField label={t("Sản phẩm", lang)} error={errors.productId?.message}>
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
                placeholder={productsLoading ? t("Đang tải...", lang) : t("Chọn sản phẩm (không bắt buộc)", lang)}
                showSearch
                optionFilterProp="label"
                notFoundContent={productsLoading ? null : t("Chưa có sản phẩm nào", lang)}
              />
            )}
          />
        </FormField>

        <FormField label={t("Combo sản phẩm", lang)} error={errors.comboId?.message}>
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
                placeholder={combosLoading ? t("Đang tải...", lang) : t("Chọn combo (không bắt buộc)", lang)}
                showSearch
                optionFilterProp="label"
                notFoundContent={combosLoading ? null : t("Chưa có combo nào", lang)}
              />
            )}
          />
        </FormField>
      </FormSection>

      <FormSection title={t("Thời gian đơn hàng (Sprint 8.x)", lang)}>
        <FormField label={t("Thời gian đơn hàng", lang)} error={errors.orderDate?.message}>
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
                placeholder={t("Chọn ngày giờ đặt hàng", lang)}
                format="DD/MM/YYYY HH:mm"
                getPopupContainer={(trigger) => trigger.parentElement as HTMLElement}
              />
            )}
          />
        </FormField>

        <FormField label={t("Thời gian nhận đơn", lang)} error={errors.receivedDate?.message}>
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
                  placeholder={t("Chọn thời gian Marketing nhận đơn", lang)}
                  format="DD/MM/YYYY HH:mm"
                  getPopupContainer={(trigger) => trigger.parentElement as HTMLElement}
                />
              </div>
            )}
          />
        </FormField>
      </FormSection>

      <FormSection title={t("Địa chỉ", lang)}>
        <FormField label={t("Địa chỉ", lang)} error={errors.address?.message}>
          <Controller
            name="address"
            control={control}
            render={({ field }) => (
              <TextArea
                {...field}
                placeholder={t("Nhập địa chỉ (Mông Cổ / các nước khác không phân cấp)", lang)}
                rows={2}
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            )}
          />
        </FormField>
      </FormSection>

      <FormSection title={t("Ghi chú", lang)}>
        <FormField label={t("Ghi chú", lang)} error={errors.note?.message}>
          <Controller
            name="note"
            control={control}
            render={({ field }) => <TextArea {...field} placeholder={t("Nhập ghi chú", lang)} rows={3} />}
          />
        </FormField>
      </FormSection>
    </DrawerForm>
  );
}

const LeadDrawer = memo(LeadDrawerInner);
export default LeadDrawer;

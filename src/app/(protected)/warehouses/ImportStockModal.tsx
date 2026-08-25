/**
 * ImportStockModal Component
 *
 * Modal "Nhập" theo `mongolia-crm (7).html` — nhập thêm SL cho 1 sản phẩm
 * (variant) trong kho.
 *
 *   Nhập — {productCode} · {productName}
 *   [ Variant dropdown (SKU) ]
 *   [ SL (number) ]
 *   [ Ghi chú ]
 *   [Huỷ] [Nhập]
 *
 * Nhập theo VARIANT (productVariantId) — không phải combo. Mỗi sản phẩm có
 * thể có nhiều variant, người dùng chọn variant cụ thể rồi nhập SL.
 */

import { useEffect, useState } from "react";
import { Modal, Select, Input, InputNumber, Form, Alert, App } from "antd";
import type { WarehouseOverviewItem } from "@/hooks/useWarehouseInventoryOverview";
import { useWarehouseProductVariantOptions } from "@/hooks/useWarehouseProductVariantOptions";
import { useImportProductStock } from "@/hooks/useImportProductStock";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export type ImportStockModalProps = {
  open: boolean;
  product: WarehouseOverviewItem | null;
  onClose: () => void;
  onSuccess?: () => void;
};

type FormValues = {
  productVariantId: string;
  quantity: number;
  note?: string;
};

export default function ImportStockModal({
  open,
  product,
  onClose,
  onSuccess,
}: ImportStockModalProps) {
  const lang = useLanguageStore((s) => s.language);
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const { variants, loading: variantsLoading } = useWarehouseProductVariantOptions(
    open && product ? product.productId : null
  );
  const { mutateAsync, isPending, reset } = useImportProductStock();
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      const id = window.setTimeout(() => {
        form.resetFields();
        reset();
        setSubmitError(null);
      }, 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open, form, reset]);

  const variantOptions = variants.map((v) => ({
    value: v._id,
    label: v.sku,
  }));

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitError(null);
      const result = await mutateAsync({
        productVariantId: values.productVariantId,
        quantity: values.quantity,
        note: values.note ?? "",
      });
      message.success(
        t("Đã nhập {qty} vào {count} kho", lang)
          .replace("{qty}", String(result.totalChange))
          .replace("{count}", String(result.updatedWarehouses))
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        (err as Error)?.message ||
        t("Không thể nhập kho. Vui lòng thử lại.", lang);
      setSubmitError(msg);
    }
  };

  const title = product
    ? t("Nhập — {code} · {name}", lang)
        .replace("{code}", product.productCode)
        .replace("{name}", product.productName)
    : t("Nhập", lang);

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={isPending}
      okText={t("Nhập", lang)}
      cancelText={t("Hủy", lang)}
      destroyOnHidden
      mask={{ closable: !isPending }}
      okButtonProps={{ disabled: isPending }}
      cancelButtonProps={{ disabled: isPending }}
    >
      {submitError && (
        <Alert
          type="error"
          title={submitError}
          style={{ marginBottom: 12 }}
          closable
          onClose={() => setSubmitError(null)}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        initialValues={{ quantity: 1, note: "" }}
      >
        <Form.Item
          name="productVariantId"
          label={t("Variant (SKU)", lang)}
          rules={[{ required: true, message: t("Vui lòng chọn variant", lang) }]}
          extra={
            variantsLoading
              ? t("Đang tải danh sách variant...", lang)
              : variants.length === 0
                ? t("Sản phẩm này chưa có variant nào", lang)
                : undefined
          }
        >
          <Select
            showSearch
            placeholder={t("Chọn variant cần nhập", lang)}
            options={variantOptions}
            loading={variantsLoading}
            disabled={isPending || variantOptions.length === 0}
            filterOption={(input, option) =>
              String(option?.label ?? "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          />
        </Form.Item>
        <Form.Item
          name="quantity"
          label={t("Số lượng", lang)}
          rules={[
            { required: true, message: t("Vui lòng nhập số lượng", lang) },
            {
              type: "number",
              min: 1,
              max: 100000,
              message: t("Số lượng phải trong khoảng 1–100,000", lang),
            },
          ]}
        >
          <InputNumber
            min={1}
            max={100000}
            style={{ width: "100%" }}
            placeholder={t("Số lượng nhập", lang)}
          />
        </Form.Item>
        <Form.Item name="note" label={t("Ghi chú", lang)}>
          <Input.TextArea
            rows={2}
            placeholder={t("(tuỳ chọn) Lý do nhập / số PO / NCC...", lang)}
            maxLength={200}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
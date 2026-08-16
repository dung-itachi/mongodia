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
        `Đã nhập ${result.totalChange} vào ${result.updatedWarehouses} kho`
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        (err as Error)?.message ||
        "Không thể nhập kho. Vui lòng thử lại.";
      setSubmitError(msg);
    }
  };

  const title = product
    ? `Nhập — ${product.productCode} · ${product.productName}`
    : "Nhập";

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={isPending}
      okText="Nhập"
      cancelText="Huỷ"
      destroyOnHidden
      mask={{ closable: !isPending }}
      okButtonProps={{ disabled: isPending }}
      cancelButtonProps={{ disabled: isPending }}
    >
      {submitError && (
        <Alert
          type="error"
          message={submitError}
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
          label="Variant (SKU)"
          rules={[{ required: true, message: "Vui lòng chọn variant" }]}
          extra={
            variantsLoading
              ? "Đang tải danh sách variant..."
              : variants.length === 0
                ? "Sản phẩm này chưa có variant nào"
                : undefined
          }
        >
          <Select
            showSearch
            placeholder="Chọn variant cần nhập"
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
          label="Số lượng"
          rules={[
            { required: true, message: "Vui lòng nhập số lượng" },
            {
              type: "number",
              min: 1,
              max: 100000,
              message: "Số lượng phải trong khoảng 1–100,000",
            },
          ]}
        >
          <InputNumber
            min={1}
            max={100000}
            style={{ width: "100%" }}
            placeholder="Số lượng nhập"
          />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea
            rows={2}
            placeholder="(tuỳ chọn) Lý do nhập / số PO / NCC..."
            maxLength={200}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
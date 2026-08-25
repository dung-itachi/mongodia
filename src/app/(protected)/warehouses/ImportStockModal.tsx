/**
 * ImportStockModal Component
 *
 * Modal "Nhập" theo `mongolia-crm (7).html` — nhập thêm SL cho 1 sản phẩm
 * (variant) trong đúng 1 kho.
 *
 *   Nhập — {productCode} · {productName}
 *   [ Kho đích ]                     ← chọn KHO1 (kho trung gian)
 *   [ Variant dropdown (SKU) ]
 *   [ SL (number) ]
 *   [ Ghi chú ]
 *   [Huỷ] [Nhập]
 *
 * Business rule:
 *   IMPORT phải đi vào đúng 1 kho. Theo luồng hợp lệ, IMPORT từ nhà sản
 *   xuất phải vào KHO1 (kho trung gian). Nếu muốn KHO2 (kho chính bán
 *   hàng) tăng tồn, tạo WarehouseTransfer KHO1 → KHO2.
 *
 * Path dữ liệu: WarehouseInventory + WarehouseStockMovement (IMPORT)
 * qua POST /api/warehouse/imports.
 */

import { useEffect, useMemo, useState } from "react";
import { Modal, Select, Input, InputNumber, Form, Alert, App } from "antd";
import type { WarehouseOverviewItem } from "@/hooks/useWarehouseInventoryOverview";
import { useWarehouseProductVariantOptions } from "@/hooks/useWarehouseProductVariantOptions";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useImportProductStock } from "@/hooks/useImportProductStock";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export type ImportStockModalProps = {
  open: boolean;
  product: WarehouseOverviewItem | null;
  /** Kho đích mặc định từ filter overview (nếu user đã chọn kho) */
  warehouseId?: string;
  onClose: () => void;
  onSuccess?: () => void;
};

type FormValues = {
  warehouseId: string;
  productVariantId: string;
  quantity: number;
  note?: string;
};

export default function ImportStockModal({
  open,
  product,
  warehouseId,
  onClose,
  onSuccess,
}: ImportStockModalProps) {
  const lang = useLanguageStore((s) => s.language);
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const { variants, loading: variantsLoading } = useWarehouseProductVariantOptions(
    open && product ? product.productId : null
  );
  const { warehouses: allWarehouses } = useWarehouses();
  const { mutateAsync, isPending, reset } = useImportProductStock();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const warehouseOptions = useMemo(
    () =>
      allWarehouses
        .filter((w) => w.isActive)
        .map((w) => ({ value: w._id, label: `${w.code} · ${w.name}` })),
    [allWarehouses]
  );

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
      if (!values.warehouseId) {
        setSubmitError("Vui lòng chọn kho đích IMPORT");
        return;
      }
      setSubmitError(null);
      const result = await mutateAsync({
        warehouseId: values.warehouseId,
        productVariantId: values.productVariantId,
        quantity: values.quantity,
        note: values.note ?? "",
      });
      message.success(
        t("Đã nhập {qty} vào kho ({code})", lang)
          .replace("{qty}", String(result.movements[0]?.afterQuantity ?? values.quantity))
          .replace(
            "{code}",
            warehouseOptions.find((w) => w.value === values.warehouseId)?.label ?? values.warehouseId
          )
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
        initialValues={{
          quantity: 1,
          note: "",
          warehouseId: warehouseId ?? undefined,
        }}
      >
        <Form.Item
          name="warehouseId"
          label={t("Kho đích IMPORT", lang)}
          rules={[{ required: true, message: t("Vui lòng chọn kho", lang) }]}
          extra={t(
            "Nhập từ nhà sản xuất phải vào KHO1 (kho trung gian). Muốn KHO2 tăng tồn, tạo WarehouseTransfer.",
            lang
          )}
        >
          <Select
            showSearch
            placeholder={t("Chọn kho đích", lang)}
            options={warehouseOptions}
            disabled={isPending || warehouseOptions.length === 0}
            filterOption={(input, option) =>
              String(option?.label ?? "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          />
        </Form.Item>
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
            placeholder={t("(tuỳ biến) Lý do nhập / số PO / NCC...", lang)}
            maxLength={200}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
/**
 * Variant Option Form Component (Sprint 8.4.1)
 *
 * Form for creating and editing Variant Options.
 * Supports quick-add of initial values via a textarea (one value per line).
 */

"use client";

import { useEffect, useState } from "react";
import { Form, Input, InputNumber, Switch, message } from "antd";
import DrawerForm from "@/components/common/forms/DrawerForm";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import type {
  VariantOptionItem,
  VariantValueItem,
  CreateVariantOptionInput,
  UpdateVariantOptionInput,
} from "@/hooks/useVariants";

interface VariantOptionFormProps {
  open: boolean;
  editingItem?: VariantOptionItem | null;
  loading?: boolean;
  selectedProductId?: string | null;
  products?: Array<{ _id: string; name: string }>;
  onClose: () => void;
  onSubmit: (
    values: CreateVariantOptionInput | UpdateVariantOptionInput,
    options?: { quickValues?: string[]; createdOption?: VariantOptionItem }
  ) => void;
}

// Helper function to generate code from Vietnamese name
function generateCodeFromName(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove diacritics

  const asciiCode = normalized
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 20);

  // Random suffix for uniqueness
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return asciiCode.length >= 4
    ? asciiCode + suffix
    : `${asciiCode}${suffix}`;
}

export default function VariantOptionForm({
  open,
  editingItem,
  loading,
  selectedProductId,
  products = [],
  onClose,
  onSubmit,
}: VariantOptionFormProps) {
  const [form] = Form.useForm();
  const lang = useLanguageStore((s) => s.language);
  const isEditing = !!editingItem;
  const [quickValuesText, setQuickValuesText] = useState("");

  // Get selected product name
  const selectedProductName = selectedProductId
    ? products.find((p) => p._id === selectedProductId)?.name || selectedProductId
    : null;

  // Reset form when drawer opens/closes or editingItem changes
  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.setFieldsValue({
          code: editingItem.code,
          name: editingItem.name,
          sortOrder: editingItem.sortOrder ?? 0,
          isActive: editingItem.isActive ?? true,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          sortOrder: 0,
          isActive: true,
        });
      }
      setQuickValuesText("");
    }
  }, [open, editingItem, form]);

  const handleSubmit = () => {
    void form.validateFields().then((values) => {
      // Generate code from name if not provided (only for new items)
      if (!isEditing && !values.code && values.name) {
        values.code = generateCodeFromName(values.name);
      }

      // Include productId for new items
      const submitValues = { ...values } as CreateVariantOptionInput;
      if (!isEditing && selectedProductId) {
        submitValues.productId = selectedProductId;
      }

      // Parse quick values (one per line, skip empty)
      const quickValues = quickValuesText
        .split(/\r?\n/)
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      onSubmit(submitValues, { quickValues });
    });
  };

  // Handle name change to suggest code (only for new items)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing) {
      const name = e.target.value;
      form.setFieldValue("name", name);
      if (name) {
        form.setFieldValue("code", generateCodeFromName(name));
      }
    }
  };

  return (
    <DrawerForm
      open={open}
      title={isEditing ? t("Sửa thuộc tính", lang) : t("Thêm thuộc tính", lang)}
      loading={loading}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={isEditing ? t("Cập nhật", lang) : t("Tạo mới", lang)}
      width={520}
    >
      {selectedProductName && (
        <div
          style={{
            marginBottom: 16,
            padding: "8px 12px",
            background: "#e6f7ff",
            borderRadius: 6,
            color: "#1890ff",
          }}
        >
          {t("Thuộc tính cho sản phẩm:", lang)} <strong>{selectedProductName}</strong>
        </div>
      )}
      <Form
        form={form}
        layout="vertical"
        initialValues={
          editingItem
            ? {
                code: editingItem.code,
                name: editingItem.name,
                sortOrder: editingItem.sortOrder ?? 0,
                isActive: editingItem.isActive ?? true,
              }
            : {
                sortOrder: 0,
                isActive: true,
              }
        }
      >
        <Form.Item
          name="name"
          label={t("Tên thuộc tính", lang)}
          rules={[
            { required: true, message: t("Vui lòng nhập tên thuộc tính", lang) },
            { min: 2, message: t("Tên tối thiểu 2 ký tự", lang) },
            { max: 100, message: t("Tên tối đa 100 ký tự", lang) },
          ]}
        >
          <Input
            placeholder={t("VD: Kích thước, Màu sắc, Hộp", lang)}
            onChange={handleNameChange}
          />
        </Form.Item>

        <Form.Item
          name="code"
          label={t("Mã thuộc tính (tự động tạo)", lang)}
          tooltip={t("Sẽ tự động tạo từ tên nếu để trống", lang)}
        >
          <Input
            placeholder={t("VD: KICHTHUOC01 - Sẽ tự sinh nếu để trống", lang)}
            disabled={isEditing}
          />
        </Form.Item>

        {!isEditing && (
          <Form.Item label={t("Thêm nhanh giá trị (tùy chọn)", lang)}>
            <Input.TextArea
              value={quickValuesText}
              onChange={(e) => setQuickValuesText(e.target.value)}
              placeholder={t("Mỗi dòng là một giá trị. VD:\nS\nM\nL", lang)}
              rows={4}
              maxLength={2000}
              showCount
            />
            <div
              style={{
                color: "#8c8c8c",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              {t(
                "Mỗi dòng sẽ được tạo thành một giá trị của thuộc tính này. Mã giá trị sẽ tự sinh từ tên.",
                lang
              )}
            </div>
          </Form.Item>
        )}

        <Form.Item name="sortOrder" label={t("Thứ tự hiển thị", lang)}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>

        {isEditing && (
          <Form.Item
            name="isActive"
            label={t("Kích hoạt", lang)}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        )}
      </Form>
    </DrawerForm>
  );
}
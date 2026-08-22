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
      title={isEditing ? "Sửa thuộc tính" : "Thêm thuộc tính"}
      loading={loading}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={isEditing ? "Cập nhật" : "Tạo mới"}
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
          Thuộc tính cho sản phẩm: <strong>{selectedProductName}</strong>
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
          label="Tên thuộc tính"
          rules={[
            { required: true, message: "Vui lòng nhập tên thuộc tính" },
            { min: 2, message: "Tên tối thiểu 2 ký tự" },
            { max: 100, message: "Tên tối đa 100 ký tự" },
          ]}
        >
          <Input
            placeholder="VD: Kích thước, Màu sắc, Hộp"
            onChange={handleNameChange}
          />
        </Form.Item>

        <Form.Item
          name="code"
          label="Mã thuộc tính (tự động tạo)"
          tooltip="Sẽ tự động tạo từ tên nếu để trống"
        >
          <Input
            placeholder="VD: KICHTHUOC01 - Sẽ tự sinh nếu để trống"
            disabled={isEditing}
          />
        </Form.Item>

        {!isEditing && (
          <Form.Item label="Thêm nhanh giá trị (tùy chọn)">
            <Input.TextArea
              value={quickValuesText}
              onChange={(e) => setQuickValuesText(e.target.value)}
              placeholder="Mỗi dòng là một giá trị. VD:&#10;S&#10;M&#10;L"
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
              Mỗi dòng sẽ được tạo thành một giá trị của thuộc tính này. Mã giá
              trị sẽ tự sinh từ tên.
            </div>
          </Form.Item>
        )}

        <Form.Item name="sortOrder" label="Thứ tự hiển thị">
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>

        {isEditing && (
          <Form.Item
            name="isActive"
            label="Kích hoạt"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        )}
      </Form>
    </DrawerForm>
  );
}

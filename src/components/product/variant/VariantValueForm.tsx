/**
 * Variant Value Form Component (Sprint 8.4.1)
 *
 * Form for creating and editing Variant Values.
 */

"use client";

import { useEffect } from "react";
import { Form, Input, InputNumber, Select, Switch } from "antd";
import DrawerForm from "@/components/common/forms/DrawerForm";
import type {
  VariantValueItem,
  VariantOptionItem,
  CreateVariantValueInput,
  UpdateVariantValueInput,
} from "@/hooks/useVariants";

interface VariantValueFormProps {
  open: boolean;
  editingItem?: VariantValueItem | null;
  prefilledOption?: VariantOptionItem | null;
  variantOptions: VariantOptionItem[];
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: CreateVariantValueInput | UpdateVariantValueInput) => void;
}

// Auto-generate code from Vietnamese name (uppercase, ASCII only).
// Appends a short random suffix to avoid collisions with existing values
// (backend still rejects duplicates, but uniqueness check is much less
// likely to trigger for the user).
function generateCodeFromName(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const base = normalized
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 12);

  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const combined = base ? `${base}${suffix}` : suffix;
  return combined.substring(0, 20);
}

export default function VariantValueForm({
  open,
  editingItem,
  prefilledOption,
  variantOptions,
  loading,
  onClose,
  onSubmit,
}: VariantValueFormProps) {
  const [form] = Form.useForm();
  const isEditing = !!editingItem;

  const getOptionId = (variantOptionId: VariantValueItem["variantOptionId"]) => {
    if (typeof variantOptionId === "object" && variantOptionId !== null) {
      return (variantOptionId as { _id: string })._id;
    }
    return "";
  };

  // Reset form whenever the drawer opens with new context
  useEffect(() => {
    if (!open) return;
    if (editingItem) {
      form.setFieldsValue({
        code: editingItem.code,
        name: editingItem.name,
        variantOptionId: getOptionId(editingItem.variantOptionId),
        sortOrder: editingItem.sortOrder ?? 0,
        isActive: editingItem.isActive ?? true,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        sortOrder: 0,
        isActive: true,
        variantOptionId: prefilledOption?._id,
      });
    }
  }, [open, editingItem, prefilledOption, form]);

  // Suggest code from name while user types (only when creating new value).
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isEditing) return;
    const name = e.target.value;
    const generated = generateCodeFromName(name);
    if (generated) {
      form.setFieldValue("code", generated);
    }
  };

  const handleSubmit = () => {
    void form.validateFields().then((values) => {
      // If code is still empty (e.g. user pasted a name with no ASCII chars),
      // fill it from the name as a final fallback.
      if (!isEditing && !values.code && values.name) {
        values.code = generateCodeFromName(values.name);
      }
      onSubmit(values as CreateVariantValueInput | UpdateVariantValueInput);
    });
  };

  return (
    <DrawerForm
      open={open}
      title={isEditing ? "Sửa giá trị" : "Thêm giá trị"}
      loading={loading}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={isEditing ? "Cập nhật" : "Tạo mới"}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={
          editingItem
            ? {
                code: editingItem.code,
                name: editingItem.name,
                variantOptionId: getOptionId(editingItem.variantOptionId),
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
          name="code"
          label="Mã giá trị"
          tooltip={
            isEditing
              ? undefined
              : "Để trống sẽ tự động sinh từ tên (chỉ gồm chữ cái và số, viết hoa)"
          }
          rules={[
            { required: true, message: "Vui lòng nhập mã giá trị" },
            { min: 2, message: "Mã tối thiểu 2 ký tự" },
            { max: 50, message: "Mã tối đa 50 ký tự" },
          ]}
        >
          <Input
            placeholder={
              isEditing
                ? "VD: 500ML, 1KG, RED"
                : "Tự sinh từ tên - có thể chỉnh"
            }
            disabled={isEditing}
          />
        </Form.Item>

        <Form.Item
          name="name"
          label="Tên giá trị"
          rules={[
            { required: true, message: "Vui lòng nhập tên giá trị" },
            { min: 2, message: "Tên tối thiểu 2 ký tự" },
            { max: 100, message: "Tên tối đa 100 ký tự" },
          ]}
        >
          <Input
            placeholder="VD: 500ml, 1kg, Đỏ"
            onChange={handleNameChange}
          />
        </Form.Item>

        <Form.Item
          name="variantOptionId"
          label="Thuộc tính"
          rules={[{ required: true, message: "Vui lòng chọn thuộc tính" }]}
        >
          <Select
            placeholder="Chọn thuộc tính"
            showSearch
            optionFilterProp="label"
            options={variantOptions.map((o) => ({
              label: `${o.code} - ${o.name}`,
              value: o._id,
            }))}
          />
        </Form.Item>

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
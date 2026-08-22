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
      form.setFieldsValue({
        sortOrder: 0,
        isActive: true,
        variantOptionId: prefilledOption?._id,
      });
    }
  }, [open, editingItem, prefilledOption, form]);

  const handleSubmit = () => {
    void form.validateFields().then((values) => {
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
          rules={[
            { required: true, message: "Vui lòng nhập mã giá trị" },
            { min: 2, message: "Mã tối thiểu 2 ký tự" },
            { max: 50, message: "Mã tối đa 50 ký tự" },
          ]}
        >
          <Input placeholder="VD: 500ML, 1KG, RED" disabled={isEditing} />
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
          <Input placeholder="VD: 500ml, 1kg, Đỏ" />
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

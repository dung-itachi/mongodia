/**
 * Variant Option Form Component (Sprint 8.4.1)
 *
 * Form for creating and editing Variant Options.
 */

"use client";

import { Form, Input, InputNumber, Switch } from "antd";
import DrawerForm from "@/components/common/forms/DrawerForm";
import type {
  VariantOptionItem,
  CreateVariantOptionInput,
  UpdateVariantOptionInput,
} from "@/hooks/useVariants";

interface VariantOptionFormProps {
  open: boolean;
  editingItem?: VariantOptionItem | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: CreateVariantOptionInput | UpdateVariantOptionInput) => void;
}

export default function VariantOptionForm({
  open,
  editingItem,
  loading,
  onClose,
  onSubmit,
}: VariantOptionFormProps) {
  const [form] = Form.useForm();
  const isEditing = !!editingItem;

  const handleSubmit = () => {
    void form.validateFields().then((values) => {
      onSubmit(values as CreateVariantOptionInput | UpdateVariantOptionInput);
    });
  };

  return (
    <DrawerForm
      open={open}
      title={isEditing ? "Sửa thuộc tính" : "Thêm thuộc tính"}
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
          label="Mã thuộc tính"
          rules={[
            { required: true, message: "Vui lòng nhập mã thuộc tính" },
            { min: 2, message: "Mã tối thiểu 2 ký tự" },
            { max: 50, message: "Mã tối đa 50 ký tự" },
          ]}
        >
          <Input placeholder="VD: SIZE, COLOR" disabled={isEditing} />
        </Form.Item>

        <Form.Item
          name="name"
          label="Tên thuộc tính"
          rules={[
            { required: true, message: "Vui lòng nhập tên thuộc tính" },
            { min: 2, message: "Tên tối thiểu 2 ký tự" },
            { max: 100, message: "Tên tối đa 100 ký tự" },
          ]}
        >
          <Input placeholder="VD: Kích thước, Màu sắc" />
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

/**
 * Category Form Component (Sprint 8.4.1)
 *
 * Form for creating and editing Categories.
 */

"use client";

import { Form, Input, InputNumber, Switch } from "antd";
import DrawerForm from "@/components/common/forms/DrawerForm";
import type { CategoryListItem, CreateCategoryInput, UpdateCategoryInput } from "@/hooks/useCategories";

const { TextArea } = Input;

interface CategoryFormProps {
  open: boolean;
  editingItem?: CategoryListItem | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: CreateCategoryInput | UpdateCategoryInput) => void;
}

export default function CategoryForm({
  open,
  editingItem,
  loading,
  onClose,
  onSubmit,
}: CategoryFormProps) {
  const [form] = Form.useForm();
  const isEditing = !!editingItem;

  const handleSubmit = () => {
    void form.validateFields().then((values) => {
      onSubmit(values as CreateCategoryInput | UpdateCategoryInput);
    });
  };

  return (
    <DrawerForm
      open={open}
      title={isEditing ? "Sửa danh mục" : "Thêm danh mục"}
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
                description: editingItem.description ?? "",
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
          label="Mã danh mục"
          rules={[
            { required: true, message: "Vui lòng nhập mã danh mục" },
            { min: 2, message: "Mã tối thiểu 2 ký tự" },
            { max: 20, message: "Mã tối đa 20 ký tự" },
          ]}
        >
          <Input placeholder="VD: FOOD, DRINK" disabled={isEditing} />
        </Form.Item>

        <Form.Item
          name="name"
          label="Tên danh mục"
          rules={[
            { required: true, message: "Vui lòng nhập tên danh mục" },
            { min: 2, message: "Tên tối thiểu 2 ký tự" },
            { max: 100, message: "Tên tối đa 100 ký tự" },
          ]}
        >
          <Input placeholder="VD: Đồ ăn, Nước uống" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Mô tả"
          rules={[{ max: 500, message: "Mô tả tối đa 500 ký tự" }]}
        >
          <TextArea rows={3} placeholder="Mô tả danh mục (tùy chọn)" />
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

/**
 * Product Form Component (Sprint 8.x)
 *
 * Form tạo/sửa sản phẩm.
 * Combo giờ quản lý ở trang /products/[productId]/combos, không còn inline trong form.
 */

"use client";

import { Form, Input, Select, Switch } from "antd";
import DrawerForm from "@/components/common/forms/DrawerForm";
import type { ProductListItem, CreateProductInput, UpdateProductInput } from "@/hooks/useProductCrud";
import type { CategoryListItem } from "@/hooks/useCategories";

const { TextArea } = Input;

interface ProductFormProps {
  open: boolean;
  editingItem?: ProductListItem | null;
  categories: CategoryListItem[];
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: CreateProductInput | UpdateProductInput) => void;
}

export default function ProductForm({
  open,
  editingItem,
  categories,
  loading,
  onClose,
  onSubmit,
}: ProductFormProps) {
  const [form] = Form.useForm();
  const isEditing = !!editingItem;

  const getCategoryCode = (category: ProductListItem["category"]) => {
    if (typeof category === "object" && category !== null) {
      return (category as { code: string }).code;
    }
    return "";
  };

  const handleSubmit = () => {
    void form.validateFields().then((values) => {
      onSubmit(values as CreateProductInput | UpdateProductInput);
    });
  };

  return (
    <DrawerForm
      open={open}
      title={isEditing ? "Sửa sản phẩm" : "Thêm sản phẩm"}
      loading={loading}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={isEditing ? "Cập nhật" : "Tạo mới"}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={
          editingItem
            ? {
                code: editingItem.code,
                name: editingItem.name,
                categoryCode: getCategoryCode(editingItem.category),
                image: editingItem.image ?? "",
                description: editingItem.description ?? "",
                isActive: editingItem.isActive ?? true,
              }
            : {
                image: "",
                description: "",
                isActive: true,
              }
        }
      >
        <Form.Item
          name="code"
          label="Mã sản phẩm"
          rules={[
            { required: true, message: "Vui lòng nhập mã sản phẩm" },
            { min: 2, message: "Mã tối thiểu 2 ký tự" },
            { max: 50, message: "Mã tối đa 50 ký tự" },
          ]}
        >
          <Input placeholder="VD: SP001" disabled={isEditing} />
        </Form.Item>

        <Form.Item
          name="name"
          label="Tên sản phẩm"
          rules={[
            { required: true, message: "Vui lòng nhập tên sản phẩm" },
            { min: 2, message: "Tên tối thiểu 2 ký tự" },
            { max: 200, message: "Tên tối đa 200 ký tự" },
          ]}
        >
          <Input placeholder="VD: Bánh Oreo" />
        </Form.Item>

        <Form.Item
          name="categoryCode"
          label="Danh mục"
          rules={[{ required: true, message: "Vui lòng chọn danh mục" }]}
        >
          <Select
            placeholder="Chọn danh mục"
            showSearch
            optionFilterProp="label"
            options={categories.map((c) => ({
              label: `${c.code} - ${c.name}`,
              value: c.code,
            }))}
          />
        </Form.Item>

        <Form.Item name="image" label="URL hình ảnh">
          <Input placeholder="https://example.com/image.jpg" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Mô tả"
          rules={[{ max: 500, message: "Mô tả tối đa 500 ký tự" }]}
        >
          <TextArea rows={3} placeholder="Mô tả sản phẩm (tùy chọn)" />
        </Form.Item>

        {isEditing && (
          <Form.Item name="isActive" label="Kích hoạt" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </DrawerForm>
  );
}
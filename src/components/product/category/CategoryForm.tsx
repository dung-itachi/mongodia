/**
 * Category Form Component (Sprint 8.4.1)
 *
 * Form for creating and editing Categories.
 */

"use client";

import { Form, Input, InputNumber, Switch } from "antd";
import DrawerForm from "@/components/common/forms/DrawerForm";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
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
  const lang = useLanguageStore((s) => s.language);
  const isEditing = !!editingItem;

  const handleSubmit = () => {
    void form.validateFields().then((values) => {
      onSubmit(values as CreateCategoryInput | UpdateCategoryInput);
    });
  };

  return (
    <DrawerForm
      open={open}
      title={isEditing ? t("Sửa danh mục", lang) : t("Thêm danh mục", lang)}
      loading={loading}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={isEditing ? t("Cập nhật", lang) : t("Tạo mới", lang)}
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
          label={t("Mã danh mục", lang)}
          rules={[
            { required: true, message: t("Vui lòng nhập mã danh mục", lang) },
            { min: 2, message: t("Mã tối thiểu 2 ký tự", lang) },
            { max: 20, message: t("Mã tối đa 20 ký tự", lang) },
          ]}
        >
          <Input placeholder={t("VD: FOOD, DRINK", lang)} disabled={isEditing} />
        </Form.Item>

        <Form.Item
          name="name"
          label={t("Tên danh mục", lang)}
          rules={[
            { required: true, message: t("Vui lòng nhập tên danh mục", lang) },
            { min: 2, message: t("Tên tối thiểu 2 ký tự", lang) },
            { max: 100, message: t("Tên tối đa 100 ký tự", lang) },
          ]}
        >
          <Input placeholder={t("VD: Đồ ăn, Nước uống", lang)} />
        </Form.Item>

        <Form.Item
          name="description"
          label={t("Mô tả", lang)}
          rules={[{ max: 500, message: t("Mô tả tối đa 500 ký tự", lang) }]}
        >
          <TextArea rows={3} placeholder={t("Mô tả danh mục (tùy chọn)", lang)} />
        </Form.Item>

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

/**
 * Product Form Component (Sprint 8.x)
 *
 * Form tạo/sửa sản phẩm.
 * - Mã sản phẩm không bắt buộc, sẽ tự sinh nếu không nhập.
 * - Có thể thêm danh mục mới ngay trong form.
 */

"use client";

import { useState, useCallback } from "react";
import { Form, Input, Select, Switch, Button, Space, Divider, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import DrawerForm from "@/components/common/forms/DrawerForm";
import type { ProductListItem, CreateProductInput, UpdateProductInput } from "@/hooks/useProductCrud";
import type { CategoryListItem } from "@/hooks/useCategories";
import api from "@/lib/axios";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

const { TextArea } = Input;

function getTranslated(key: string): string {
  const language = useLanguageStore.getState().language;
  return t(key, language);
}

interface ProductFormProps {
  open: boolean;
  editingItem?: ProductListItem | null;
  categories: CategoryListItem[];
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: CreateProductInput | UpdateProductInput) => void;
  onCategoriesChange?: (categories: CategoryListItem[]) => void;
}

export default function ProductForm({
  open,
  editingItem,
  categories,
  loading,
  onClose,
  onSubmit,
  onCategoriesChange,
}: ProductFormProps) {
  const [form] = Form.useForm();
  const isEditing = !!editingItem;

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryCode, setNewCategoryCode] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const getCategoryCode = (category: ProductListItem["category"]) => {
    if (typeof category === "object" && category !== null) {
      return (category as { code: string }).code;
    }
    return "";
  };

  const handleSubmit = useCallback(() => {
    void form.validateFields().then((values) => {
      // Nếu code trống thì không gửi lên (backend sẽ tự sinh)
      const submitValues = { ...values };
      if (!submitValues.code || submitValues.code.trim() === "") {
        delete submitValues.code;
      }
      onSubmit(submitValues as CreateProductInput | UpdateProductInput);
    });
  }, [form, onSubmit]);

  const handleCreateCategory = useCallback(async () => {
    if (!newCategoryName.trim() || !newCategoryCode.trim()) {
      void message.error("Vui lòng nhập đủ mã và tên danh mục");
      return;
    }

    if (newCategoryCode.trim().length < 2) {
      void message.error("Mã danh mục phải có ít nhất 2 ký tự");
      return;
    }

    setCreatingCategory(true);
    try {
      const response = await api.post("/api/categories", {
        code: newCategoryCode.trim().toUpperCase(),
        name: newCategoryName.trim(),
      });

      if (response.data.success) {
        const newCategory: CategoryListItem = {
          _id: response.data.data._id,
          code: newCategoryCode.trim().toUpperCase(),
          name: newCategoryName.trim(),
          description: "",
          isActive: true,
        };

        const updatedCategories = [...categories, newCategory];
        onCategoriesChange?.(updatedCategories);

        // Chọn danh mục vừa tạo
        void form.setFieldValue("categoryCode", newCategory.code);

        setNewCategoryCode("");
        setNewCategoryName("");
        setIsCreatingCategory(false);
        void message.success(getTranslated("Đã tạo danh mục mới"));
      } else {
        void message.error(response.data.message || getTranslated("Không thể tạo danh mục"));
      }
    } catch (error) {
      void message.error(getTranslated("Không thể tạo danh mục"));
    } finally {
      setCreatingCategory(false);
    }
  }, [newCategoryName, newCategoryCode, categories, onCategoriesChange, form]);

  const handleCloseCreateCategory = useCallback(() => {
    setIsCreatingCategory(false);
    setNewCategoryCode("");
    setNewCategoryName("");
  }, []);

  // Reset form khi đóng/mở
  const handleAfterOpenChange = useCallback((visible: boolean) => {
    if (!visible) {
      setIsCreatingCategory(false);
      setNewCategoryCode("");
      setNewCategoryName("");
    }
  }, []);

  return (
    <DrawerForm
      open={open}
      title={isEditing ? getTranslated("Sửa sản phẩm / Thêm sản phẩm") : getTranslated("Sửa sản phẩm / Thêm sản phẩm")}
      loading={loading}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={isEditing ? getTranslated("Cập nhật / Tạo mới") : getTranslated("Cập nhật / Tạo mới")}
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
                code: "",
                image: "",
                description: "",
                isActive: true,
              }
        }
      >
        <Form.Item
          name="code"
          label={getTranslated("Mã sản phẩm")}
          tooltip={getTranslated("Để trống để tự sinh mã theo tên sản phẩm")}
        >
          <Input
            placeholder={getTranslated("Để trống sẽ tự tạo mã")}
            disabled={isEditing}
            allowClear={!isEditing}
          />
        </Form.Item>

        <Form.Item
          name="name"
          label={getTranslated("Tên sản phẩm")}
          rules={[
            { required: true, message: getTranslated("Vui lòng nhập tên sản phẩm") },
            { min: 2, message: getTranslated("Tên tối thiểu 2 ký tự") },
            { max: 200, message: getTranslated("Tên tối đa 200 ký tự") },
          ]}
        >
          <Input placeholder={getTranslated("VD: Bánh Oreo")} />
        </Form.Item>

        <Form.Item
          name="categoryCode"
          label={getTranslated("Danh mục")}
          rules={[{ required: true, message: getTranslated("Vui lòng chọn danh mục") }]}
        >
          <Select
            placeholder={getTranslated("Chọn danh mục")}
            showSearch
            optionFilterProp="label"
            popupRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: "8px 0" }} />
                {isCreatingCategory ? (
                  <div style={{ padding: "8px 12px" }}>
                    <Space orientation="vertical" style={{ width: "100%" }} size="small">
                      <Input
                        placeholder={getTranslated("Mã danh mục (VD: FOOD)")}
                        value={newCategoryCode}
                        onChange={(e) => setNewCategoryCode(e.target.value.toUpperCase())}
                        maxLength={20}
                        autoFocus
                      />
                      <Input
                        placeholder={getTranslated("Tên danh mục (VD: Đồ ăn)")}
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        maxLength={100}
                      />
                      <Space>
                        <Button
                          type="primary"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={handleCreateCategory}
                          loading={creatingCategory}
                        >
                          {getTranslated("Tạo")}
                        </Button>
                        <Button size="small" onClick={handleCloseCreateCategory}>
                          {getTranslated("Hủy")}
                        </Button>
                      </Space>
                    </Space>
                  </div>
                ) : (
                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={() => setIsCreatingCategory(true)}
                    style={{ margin: "8px 12px" }}
                  >
                    {getTranslated("Thêm danh mục mới")}
                  </Button>
                )}
              </>
            )}
            options={categories.map((c) => ({
              label: `${c.code} - ${c.name}`,
              value: c.code,
            }))}
          />
        </Form.Item>

        <Form.Item name="image" label={getTranslated("URL hình ảnh")}>
          <Input placeholder="https://example.com/image.jpg" />
        </Form.Item>

        <Form.Item
          name="description"
          label={getTranslated("Mô tả")}
          rules={[{ max: 500, message: getTranslated("Mô tả tối đa 500 ký tự") }]}
        >
          <TextArea rows={3} placeholder={getTranslated("Mô tả sản phẩm (tùy chọn)")} />
        </Form.Item>

        {isEditing && (
          <Form.Item name="isActive" label={getTranslated("Kích hoạt")} valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </DrawerForm>
  );
}

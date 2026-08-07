/**
 * Combo Form Component (Sprint 8.4.1)
 *
 * Form for creating and editing Combos.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { Form, Input, InputNumber, Select, Switch, Button, Space, Divider, Alert } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import DrawerForm from "@/components/common/forms/DrawerForm";
import type { ComboListItem, ComboDetail, CreateComboInput, UpdateComboInput } from "@/hooks/useCombos";
import type { ProductVariantListItem } from "@/hooks/useVariants";

const { TextArea } = Input;

interface ComboFormProps {
  open: boolean;
  editingItem?: ComboListItem | ComboDetail | null;
  products: { _id: string; code: string; name: string }[];
  variants: ProductVariantListItem[];
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: CreateComboInput | UpdateComboInput) => void;
}

export default function ComboForm({
  open,
  editingItem,
  products,
  variants,
  loading,
  onClose,
  onSubmit,
}: ComboFormProps) {
  const [form] = Form.useForm();
  const isEditing = !!editingItem;

  // Track selected product code for variant filtering
  const [selectedProductCode, setSelectedProductCode] = useState<string>("");

  // Filter variants by selected product - simplified
  const filteredVariants = useMemo(() => {
    if (!selectedProductCode) return variants;
    return variants;
  }, [variants, selectedProductCode]);

  // Category options - placeholder
  const categoryOptions: { label: string; value: string }[] = [];

  // Handle submit
  const handleSubmit = () => {
    void form.validateFields().then((values) => {
      onSubmit(values as CreateComboInput | UpdateComboInput);
    });
  };

  // Reset/initialize form when drawer opens
  useEffect(() => {
    if (open) {
      if (editingItem) {
        const getProductCodeFromItem = (product: ComboListItem["product"]) => {
          if (typeof product === "object" && product !== null) {
            return (product as { code: string }).code;
          }
          return "";
        };
        const getCategoryCodeFromItem = (category: ComboListItem["category"]) => {
          if (typeof category === "object" && category !== null) {
            return (category as { code: string }).code;
          }
          return "";
        };

        const productCode = getProductCodeFromItem(editingItem.product);
        setSelectedProductCode(productCode);

        form.setFieldsValue({
          code: editingItem.code,
          name: editingItem.name,
          productCode,
          categoryCode: getCategoryCodeFromItem(editingItem.category),
          sellingPrice: editingItem.sellingPrice,
          packageSize: editingItem.packageSize,
          displayOrder: editingItem.displayOrder ?? 0,
          image: editingItem.image ?? "",
          description: (editingItem as ComboDetail).description ?? "",
          isActive: editingItem.isActive ?? true,
        });
      } else {
        setSelectedProductCode("");
        form.resetFields();
        form.setFieldsValue({
          sellingPrice: 0,
          packageSize: 1,
          displayOrder: 0,
          isActive: true,
          comboItems: [],
        });
      }
    }
  }, [open, editingItem, form]);

  // Handle product selection change - auto-fill category
  const handleProductChange = (productCode: string) => {
    setSelectedProductCode(productCode);
    // Clear combo items when product changes
    form.setFieldValue("comboItems", []);
  };

  return (
    <DrawerForm
      open={open}
      title={isEditing ? "Sửa combo" : "Thêm combo"}
      loading={loading}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={isEditing ? "Cập nhật" : "Tạo mới"}
      width={700}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="code"
          label="Mã combo"
          rules={[
            { required: true, message: "Vui lòng nhập mã combo" },
            { min: 1, message: "Mã tối thiểu 1 ký tự" },
          ]}
        >
          <Input placeholder="VD: COMBO001" disabled={isEditing} />
        </Form.Item>

        <Form.Item
          name="name"
          label="Tên combo"
          rules={[
            { required: true, message: "Vui lòng nhập tên combo" },
            { min: 1, message: "Tên tối thiểu 1 ký tự" },
          ]}
        >
          <Input placeholder="VD: Combo 1pc - 45,000₮" />
        </Form.Item>

        <Form.Item
          name="productCode"
          label="Sản phẩm"
          rules={[{ required: true, message: "Vui lòng chọn sản phẩm" }]}
        >
          <Select
            placeholder="Chọn sản phẩm"
            showSearch
            optionFilterProp="label"
            disabled={isEditing}
            onChange={handleProductChange}
            options={products.map((p) => ({
              label: `${p.code} - ${p.name}`,
              value: p.code,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="categoryCode"
          label="Danh mục"
          rules={[{ required: true, message: "Vui lòng chọn danh mục" }]}
        >
          <Select
            placeholder="Tự động theo sản phẩm hoặc chọn thủ công"
            showSearch
            optionFilterProp="label"
            disabled={isEditing}
            options={categoryOptions}
          />
        </Form.Item>

        <Divider style={{ margin: "12px 0" }} />

        <Form.Item
          label={
            <span>
              Biến thể trong combo
              {selectedProductCode && (
                <span style={{ fontWeight: 400, color: "#8c8c8c", marginLeft: 8 }}>
                  (đang lọc theo: {selectedProductCode})
                </span>
              )}
              {!selectedProductCode && !isEditing && (
                <span style={{ fontWeight: 400, color: "#ff4d4f", marginLeft: 8 }}>
                  ← Chọn sản phẩm trước
                </span>
              )}
            </span>
          }
        >
          <Form.List name="comboItems">
            {(fields, { add, remove }) => (
              <>
                {fields.length === 0 && (
                  <Alert
                    message="Chưa có biến thể nào. Nhấn 'Thêm biến thể' để bắt đầu."
                    type="info"
                    showIcon
                    style={{ marginBottom: 12 }}
                  />
                )}
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: "flex", marginBottom: 8 }} align="start">
                    <Form.Item
                      {...restField}
                      name={[name, "productVariantId"]}
                      rules={[{ required: true, message: "Chọn biến thể" }]}
                      style={{ marginBottom: 0, width: 220 }}
                    >
                      <Select
                        placeholder="Chọn biến thể"
                        showSearch
                        optionFilterProp="label"
                        options={filteredVariants.map((v) => {
                          let sku = v.sku;
                          let productName = "";
                          let variantNames: string[] = [];

                          if (typeof v.productId === "object" && v.productId !== null) {
                            const vp = v.productId as {
                              name: string;
                              categoryId?: { code: string };
                            };
                            productName = vp.name;
                            if (vp.categoryId) {
                              productName = `[${vp.categoryId.code}] ${vp.name}`;
                            }
                          }
                          if (Array.isArray(v.variantValues)) {
                            v.variantValues.forEach((vv) => {
                              if (typeof vv === "object" && vv !== null) {
                                variantNames.push((vv as { name: string }).name);
                              }
                            });
                          }
                          const variantLabel =
                            variantNames.length > 0
                              ? `${sku} (${variantNames.join(", ")})`
                              : sku;
                          return {
                            label: `${variantLabel} - ${productName}`,
                            value: v._id,
                          };
                        })}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "quantity"]}
                      rules={[{ required: true, message: "SL" }]}
                      initialValue={1}
                      style={{ marginBottom: 0, width: 70 }}
                    >
                      <InputNumber min={1} placeholder="SL" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "isGift"]}
                      valuePropName="checked"
                      initialValue={false}
                      style={{ marginBottom: 0 }}
                    >
                      <Switch checkedChildren="Tặng" unCheckedChildren="" />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => void remove(name)}
                    />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => {
                    void add({ productVariantId: "", quantity: 1, isGift: false });
                  }}
                  block
                  icon={<PlusOutlined />}
                  disabled={!selectedProductCode && !isEditing}
                >
                  Thêm biến thể
                </Button>
              </>
            )}
          </Form.List>
        </Form.Item>

        <Divider style={{ margin: "12px 0" }} />

        <Form.Item
          name="sellingPrice"
          label="Giá bán (₮)"
          rules={[{ required: true, message: "Vui lòng nhập giá bán" }]}
        >
          <InputNumber
            min={0}
            style={{ width: "100%" }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(value) => Number(value?.replace(/,/g, "") || 0) as 0}
          />
        </Form.Item>

        <Form.Item
          name="packageSize"
          label="Số lượng trong combo"
          rules={[{ required: true, message: "Vui lòng nhập số lượng" }]}
        >
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item name="displayOrder" label="Thứ tự hiển thị">
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item name="image" label="URL hình ảnh">
          <Input placeholder="https://example.com/image.jpg" />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <TextArea rows={2} placeholder="Mô tả combo (tùy chọn)" />
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

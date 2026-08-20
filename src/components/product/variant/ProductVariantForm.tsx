/**
 * Product Variant Form Component (Sprint 8.4.1)
 *
 * Form for creating and editing Product Variants.
 * Shows product-specific variant options when product is selected.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { Form, Input, InputNumber, Select, Switch, Checkbox, Alert, Spin, Space } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import DrawerForm from "@/components/common/forms/DrawerForm";
import type {
  ProductVariantListItem,
  ProductVariantDetail,
  CreateProductVariantInput,
  UpdateProductVariantInput,
  ProductVariantOptionWithValues,
} from "@/hooks/useVariants";
import type { ProductListItem } from "@/hooks/useProductCrud";

interface ProductVariantFormProps {
  open: boolean;
  editingItem?: ProductVariantListItem | ProductVariantDetail | null;
  products: ProductListItem[];
  productVariantOptions?: ProductVariantOptionWithValues[];
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: CreateProductVariantInput | UpdateProductVariantInput) => void;
  selectedProductId?: string | null;
}

export default function ProductVariantForm({
  open,
  editingItem,
  products,
  productVariantOptions = [],
  loading,
  onClose,
  onSubmit,
  selectedProductId,
}: ProductVariantFormProps) {
  const [form] = Form.useForm();
  const isEditing = !!editingItem;
  const [currentProductId, setCurrentProductId] = useState<string | null>(null);

  // When creating, use selectedProductId from parent
  // When editing, use the productId from editingItem
  useEffect(() => {
    if (open) {
      if (editingItem) {
        const productId =
          typeof editingItem.productId === "object"
            ? (editingItem.productId as { _id: string })._id
            : String(editingItem.productId);
        setCurrentProductId(productId);
      } else {
        setCurrentProductId(selectedProductId || null);
      }
    }
  }, [open, editingItem, selectedProductId]);

  const getProductId = (productId: ProductVariantListItem["productId"]) => {
    if (typeof productId === "object" && productId !== null) {
      return (productId as { _id: string })._id;
    }
    return "";
  };

  const getVariantValueIds = (variantValues: ProductVariantListItem["variantValues"]) => {
    if (!Array.isArray(variantValues)) return [];
    return variantValues
      .map((vv) => {
        if (typeof vv === "object" && vv !== null) {
          return (vv as { _id: string })._id;
        }
        return String(vv);
      });
  };

  const handleSubmit = () => {
    void form.validateFields().then((values) => {
      onSubmit(values as CreateProductVariantInput | UpdateProductVariantInput);
    });
  };

  const handleProductChange = (productId: string) => {
    setCurrentProductId(productId);
    form.setFieldValue("variantValues", []);
  };

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.setFieldsValue({
          productId: getProductId(editingItem.productId),
          sku: editingItem.sku,
          barcode: editingItem.barcode ?? "",
          image: editingItem.image ?? "",
          variantValues: getVariantValueIds(editingItem.variantValues),
          cost: editingItem.cost ?? 0,
          weight: editingItem.weight ?? 0,
          sortOrder: editingItem.sortOrder ?? 0,
          isActive: editingItem.isActive ?? true,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          productId: selectedProductId || undefined,
          cost: 0,
          weight: 0,
          sortOrder: 0,
          isActive: true,
        });
        if (selectedProductId) {
          setCurrentProductId(selectedProductId);
        }
      }
    }
  }, [open, editingItem, form, selectedProductId]);

  // Group variant values by option
  const variantOptionsGrouped = useMemo(() => {
    return productVariantOptions.map((option) => ({
      ...option,
      values: option.values || [],
    }));
  }, [productVariantOptions]);

  // Check if product has any variant options
  const hasVariantOptions = variantOptionsGrouped.length > 0;
  const totalVariantValues = variantOptionsGrouped.reduce(
    (sum, opt) => sum + opt.values.length,
    0
  );

  return (
    <DrawerForm
      open={open}
      title={isEditing ? "Sửa biến thể" : "Thêm biến thể"}
      loading={loading}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={isEditing ? "Cập nhật" : "Tạo mới"}
      width={650}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="productId"
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
              value: p._id,
            }))}
          />
        </Form.Item>

        {/* Show product variant info */}
        {currentProductId && !isEditing && (
          <div
            style={{
              padding: "12px 16px",
              background: "#f6f8fa",
              borderRadius: 8,
              marginBottom: 16,
              border: "1px solid #e8e8e8",
            }}
          >
            {hasVariantOptions ? (
              <>
                <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <InfoCircleOutlined style={{ color: "#1890ff" }} />
                  <strong style={{ color: "#333" }}>Thuộc tính của sản phẩm này:</strong>
                </div>
                <div style={{ paddingLeft: 22 }}>
                  {variantOptionsGrouped.map((option) => (
                    <div key={option._id} style={{ marginBottom: 6 }}>
                      <span style={{ color: "#666", fontWeight: 500 }}>{option.name}:</span>
                      <span style={{ color: "#1890ff", marginLeft: 8 }}>
                        {option.values.map((v) => v.name).join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <InfoCircleOutlined style={{ color: "#faad14" }} />
                <span style={{ color: "#666" }}>
                  Sản phẩm này chưa có thuộc tính biến thể nào. Bạn có thể chọn từ danh sách thuộc tính có sẵn bên dưới.
                </span>
              </div>
            )}
          </div>
        )}

        <Form.Item
          name="sku"
          label="SKU"
          rules={[
            { required: true, message: "Vui lòng nhập SKU" },
            { min: 2, message: "SKU tối thiểu 2 ký tự" },
          ]}
        >
          <Input placeholder="VD: OREO-BLACK-500ML" />
        </Form.Item>

        <Form.Item name="barcode" label="Barcode">
          <Input placeholder="Mã vạch (tùy chọn)" />
        </Form.Item>

        <Form.Item
          name="variantValues"
          label="Giá trị biến thể"
          rules={[
            {
              required: true,
              message: "Vui lòng chọn ít nhất một giá trị biến thể",
            },
          ]}
        >
          <Checkbox.Group style={{ width: "100%" }}>
            {hasVariantOptions ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {variantOptionsGrouped.map((option) => (
                  <div
                    key={option._id}
                    style={{
                      padding: "8px 12px",
                      background: "#fafafa",
                      borderRadius: 6,
                      border: "1px solid #f0f0f0",
                    }}
                  >
                    <div style={{ marginBottom: 6, fontWeight: 500, color: "#333" }}>
                      {option.name}
                    </div>
                    <Checkbox.Group style={{ width: "100%" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {option.values.map((vv) => (
                          <Checkbox
                            key={vv._id}
                            value={vv._id}
                            style={{ marginRight: 0 }}
                          >
                            {vv.name}
                          </Checkbox>
                        ))}
                      </div>
                    </Checkbox.Group>
                  </div>
                ))}
              </div>
            ) : (
              <Alert
                title="Chưa có thuộc tính biến thể"
                description="Vui lòng chọn sản phẩm trước để xem các thuộc tính biến thể có sẵn."
                type="info"
                showIcon
              />
            )}
          </Checkbox.Group>
        </Form.Item>

        {/* Sprint 8.x: Variant KHÔNG có giá bán — giá nằm ở Combo. */}
        <div
          style={{
            padding: "8px 12px",
            marginBottom: 16,
            background: "#fafafa",
            border: "1px dashed #d9d9d9",
            borderRadius: 4,
            color: "#8c8c8c",
            fontSize: 12,
          }}
        >
          💡 Biến thể không có giá bán — giá được cấu hình trong{" "}
          <strong>Combo</strong> theo sản phẩm.
        </div>

        <Form.Item name="cost" label="Giá vốn">
          <InputNumber
            min={0}
            style={{ width: "100%" }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(value) => Number(value?.replace(/,/g, "") || 0) as 0}
          />
        </Form.Item>

        <Form.Item name="weight" label="Trọng lượng">
          <Space.Compact>
            <InputNumber min={0} style={{ width: "100%" }} />
            <Input suffix="g" disabled style={{ width: 60, background: '#f5f5f5' }} />
          </Space.Compact>
        </Form.Item>

        <Form.Item name="sortOrder" label="Thứ tự hiển thị">
          <InputNumber min={0} style={{ width: "100%" }} />
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

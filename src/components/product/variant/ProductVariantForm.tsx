/**
 * Product Variant Form Component (Sprint 8.4.1)
 *
 * Form for creating and editing Product Variants.
 */

"use client";

import { useEffect, useMemo } from "react";
import { Form, Input, InputNumber, Select, Switch, Checkbox } from "antd";
import DrawerForm from "@/components/common/forms/DrawerForm";
import type {
  ProductVariantListItem,
  ProductVariantDetail,
  CreateProductVariantInput,
  UpdateProductVariantInput,
  VariantValueItem,
} from "@/hooks/useVariants";
import type { ProductListItem } from "@/hooks/useProductCrud";

interface ProductVariantFormProps {
  open: boolean;
  editingItem?: ProductVariantListItem | ProductVariantDetail | null;
  products: ProductListItem[];
  variantValues: VariantValueItem[];
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: CreateProductVariantInput | UpdateProductVariantInput) => void;
}

export default function ProductVariantForm({
  open,
  editingItem,
  products,
  variantValues,
  loading,
  onClose,
  onSubmit,
}: ProductVariantFormProps) {
  const [form] = Form.useForm();
  const isEditing = !!editingItem;

  // Group variant values by option
  const variantOptionsGrouped = useMemo(() => {
    const groups: Record<string, VariantValueItem[]> = {};
    variantValues.forEach((vv) => {
      let optionId: string;
      let optionName: string = "";
      if (typeof vv.variantOptionId === "object" && vv.variantOptionId !== null) {
        optionId = (vv.variantOptionId as { _id: string })._id;
        optionName = (vv.variantOptionId as { name: string }).name;
      } else {
        optionId = String(vv.variantOptionId);
      }
      if (!groups[optionId]) {
        groups[optionId] = [];
      }
      groups[optionId].push(vv);
    });
    return groups;
  }, [variantValues]);

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

  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.setFieldsValue({
          productId: getProductId(editingItem.productId),
          sku: editingItem.sku,
          barcode: editingItem.barcode ?? "",
          image: editingItem.image ?? "",
          variantValues: getVariantValueIds(editingItem.variantValues),
          // Sprint 8.x: Variant KHÔNG có giá — giá nằm ở Combo.
          // Giữ nguyên field ẩn để không phá schema; chỉ ẩn khỏi UI.
          cost: editingItem.cost ?? 0,
          weight: editingItem.weight ?? 0,
          sortOrder: editingItem.sortOrder ?? 0,
          isActive: editingItem.isActive ?? true,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          cost: 0,
          weight: 0,
          sortOrder: 0,
          isActive: true,
        });
      }
    }
  }, [open, editingItem, form]);

  return (
    <DrawerForm
      open={open}
      title={isEditing ? "Sửa biến thể" : "Thêm biến thể"}
      loading={loading}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={isEditing ? "Cập nhật" : "Tạo mới"}
      width={600}
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
            options={products.map((p) => ({
              label: `${p.code} - ${p.name}`,
              value: p._id,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="sku"
          label="SKU"
          rules={[
            { required: true, message: "Vui lòng nhập SKU" },
            { min: 2, message: "SKU tối thiểu 2 ký tự" },
          ]}
        >
          <Input placeholder="VD: OREO-500ML" />
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
          <Checkbox.Group>
            {Object.entries(variantOptionsGrouped).map(([optionId, values]) => {
              const optionName =
                values[0] && typeof values[0].variantOptionId === "object"
                  ? (values[0].variantOptionId as { name: string }).name
                  : optionId;
              return (
                <div key={optionId} style={{ marginBottom: 8 }}>
                  <strong>{optionName}:</strong>
                  <div style={{ marginLeft: 16, marginTop: 4 }}>
                    {values.map((vv) => (
                      <Checkbox key={vv._id} value={vv._id} style={{ display: "block" }}>
                        {vv.name}
                      </Checkbox>
                    ))}
                  </div>
                </div>
              );
            })}
          </Checkbox.Group>
        </Form.Item>

        {/* Sprint 8.x: Variant KHÔNG có giá bán — giá nằm ở Combo.
            Field price vẫn tồn tại trong schema (luôn = 0) để không phá
            dữ liệu cũ; backend tự gán 0 khi tạo/sửa. */}
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
          <InputNumber min={0} style={{ width: "100%" }} addonAfter="g" />
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

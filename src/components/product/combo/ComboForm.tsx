/**
 * Combo Form Component (Sprint 8.x)
 *
 * Refactor: Combo theo Product, không chọn variant trong combo.
 * - Product là dữ liệu cha, chọn trước.
 * - Category lấy từ Product, hiển thị READONLY.
 * - Combo chỉ có: code, name, packageQuantity, sellingPrice, giftQuantity.
 * - Mã combo có thể tự sinh nếu không nhập.
 */

"use client";

import { useEffect, useMemo, useCallback } from "react";
import { Form, Input, InputNumber, Select, Switch, Alert } from "antd";
import DrawerForm from "@/components/common/forms/DrawerForm";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import type {
  ComboListItem,
  ComboDetail,
  CreateComboInput,
  UpdateComboInput,
} from "@/hooks/useCombos";

const { TextArea } = Input;

/**
 * Convert any string to a safe uppercase code (alphanumeric only).
 * Handles Vietnamese, Chinese, Japanese, Korean, and other languages.
 */
function toSafeCode(input: string): string {
  if (!input) return "";
  // Remove diacritics and normalize
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .trim()
    .split(/\s+/)
    .map((word) => word.substring(0, 4))
    .join("")
    .toUpperCase();
}

/**
 * Generate combo code from product code and combo name.
 * Format: {PRODUCT_CODE}C{number}
 */
function generateComboCode(productCode: string, existingCodes: string[], index: number): string {
  const productPrefix = toSafeCode(productCode);
  // Try incremental suffix: 01, 02, 03...
  const suffix = String(index + 1).padStart(2, "0");
  const candidate = `${productPrefix}C${suffix}`;
  if (!existingCodes.includes(candidate)) {
    return candidate;
  }
  // If exists, try different suffixes
  for (let i = index + 2; i <= 99; i++) {
    const candidate2 = `${productPrefix}C${String(i).padStart(2, "0")}`;
    if (!existingCodes.includes(candidate2)) {
      return candidate2;
    }
  }
  // Fallback: add random suffix
  return `${productPrefix}C${suffix}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
}

export interface ComboFormProductOption {
  _id: string;
  code: string;
  name: string;
  categoryCode?: string;
  categoryName?: string;
  isActive?: boolean;
}

interface ComboFormProps {
  open: boolean;
  editingItem?: ComboListItem | ComboDetail | null;
  /** Khi đang ở trang /products/[productId]/combos, truyền 1 product duy nhất. */
  products: ComboFormProductOption[];
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: CreateComboInput | UpdateComboInput) => void;
  /** Khóa dropdown product (true khi productId đã xác định từ route). */
  lockProductSelection?: boolean;
  /** Product preselected (khi đã biết productId từ route). */
  initialProductId?: string;
  /** Danh sách mã combo hiện có của product (để tránh trùng khi tạo mới). */
  existingCodes?: string[];
}

interface FormValues {
  code?: string;
  name?: string;
  productId?: string;
  packageQuantity?: number;
  sellingPrice?: number;
  giftQuantity?: number;
  displayOrder?: number;
  image?: string;
  description?: string;
  isActive?: boolean;
}

export default function ComboForm({
  open,
  editingItem,
  products,
  loading,
  onClose,
  onSubmit,
  lockProductSelection = false,
  initialProductId,
  existingCodes = [],
}: ComboFormProps) {
  const [form] = Form.useForm<FormValues>();
  const lang = useLanguageStore((s) => s.language);
  const isEditing = !!editingItem;

  const selectedProductId = Form.useWatch("productId", form) as string | undefined;

  const selectedProduct = useMemo(
    () => products.find((p) => p._id === selectedProductId || p.code === selectedProductId),
    [products, selectedProductId]
  );

  // Lấy categoryCode hiển thị (từ selectedProduct hoặc từ editingItem.product)
  const categoryDisplay = useMemo(() => {
    if (selectedProduct?.categoryCode) {
      return {
        code: selectedProduct.categoryCode,
        name: selectedProduct.categoryName ?? selectedProduct.categoryCode,
      };
    }
    if (editingItem && typeof editingItem.product === "object" && editingItem.product !== null) {
      const productRef = editingItem.product as unknown as {
        categoryId?: { code: string; name: string };
      };
      if (productRef.categoryId) {
        return { code: productRef.categoryId.code, name: productRef.categoryId.name };
      }
    }
    return null;
  }, [editingItem, selectedProduct]);

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        label: `${p.code} - ${p.name}${p.isActive === false ? " (inactive)" : ""}`,
        value: p._id,
        disabled: p.isActive === false,
      })),
    [products]
  );

  const handleSubmit = () => {
    void form.validateFields().then((values) => {
      const product = products.find((p) => p._id === values.productId || p.code === values.productId);
      if (!product) {
        return;
      }

      // Auto-generate code if not provided and not editing
      let finalCode = values.code?.trim();
      if (!isEditing && !finalCode && product.code) {
        finalCode = generateComboCode(product.code, existingCodes, 0);
      }

      onSubmit({
        code: finalCode ?? "",
        name: values.name ?? "",
        productId: product._id,
        productCode: product.code,
        packageQuantity: values.packageQuantity ?? 1,
        sellingPrice: values.sellingPrice ?? 0,
        giftQuantity: values.giftQuantity ?? 0,
        displayOrder: values.displayOrder ?? 0,
        image: values.image ?? "",
        description: values.description ?? "",
        ...(isEditing && { isActive: values.isActive ?? true }),
      } as CreateComboInput | UpdateComboInput);
    });
  };

  // Khởi tạo form khi mở
  useEffect(() => {
    if (!open) return;
    if (editingItem) {
      const productRef =
        typeof editingItem.product === "object" && editingItem.product !== null
          ? (editingItem.product as { _id: string; code?: string })
          : null;
      const productId =
        productRef?._id ??
        (typeof editingItem.product === "string" ? editingItem.product : "");
      form.setFieldsValue({
        code: editingItem.code,
        name: editingItem.name,
        productId,
        packageQuantity: editingItem.packageQuantity ?? 1,
        sellingPrice: editingItem.sellingPrice,
        giftQuantity: editingItem.giftQuantity ?? 0,
        displayOrder: editingItem.displayOrder ?? 0,
        image: editingItem.image ?? "",
        description: (editingItem as ComboDetail).description ?? "",
        isActive: editingItem.isActive ?? true,
      });
      return;
    }

    form.resetFields();
    form.setFieldsValue({
      productId: initialProductId ?? products[0]?._id,
      packageQuantity: 1,
      sellingPrice: 0,
      giftQuantity: 0,
      displayOrder: 0,
      isActive: true,
    });
  }, [open, editingItem, form, products, initialProductId]);

  return (
    <DrawerForm
      open={open}
      title={isEditing ? t("Sửa combo", lang) : t("Thêm combo", lang)}
      loading={loading}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={isEditing ? t("Cập nhật", lang) : t("Tạo mới", lang)}
      width={600}
    >
      <Form<FormValues> form={form} layout="vertical">
        <Form.Item
          name="code"
          label={t("Mã combo", lang)}
          extra={`${t("Để trống để tự sinh mã:", lang)} {ProductCode}C01`}
          rules={[
            { min: 1, message: t("Mã tối thiểu 1 ký tự", lang) },
            { max: 50, message: t("Mã tối đa 50 ký tự", lang) },
          ]}
        >
          <Input placeholder={t("VD: SANPHAM001 (để trống để tự sinh)", lang)} disabled={isEditing} />
        </Form.Item>

        <Form.Item
          name="name"
          label={t("Tên combo", lang)}
          rules={[
            { required: true, message: t("Vui lòng nhập tên combo", lang) },
            { min: 1, message: t("Tên tối thiểu 1 ký tự", lang) },
          ]}
        >
          <Input placeholder={t("VD: Combo 3 hộp - 350.000₮", lang)} />
        </Form.Item>

        <Form.Item
          name="productId"
          label={t("Sản phẩm", lang)}
          rules={[{ required: true, message: t("Vui lòng chọn sản phẩm", lang) }]}
        >
          <Select
            placeholder={t("Chọn sản phẩm", lang)}
            showSearch
            optionFilterProp="label"
            disabled={isEditing || lockProductSelection || products.length === 1}
            options={productOptions}
          />
        </Form.Item>

        <Form.Item label={t("Danh mục", lang)}>
          {categoryDisplay ? (
            <Input value={`${categoryDisplay.code} - ${categoryDisplay.name}`} disabled />
          ) : (
            <Alert
              type="info"
              showIcon
              title={t("Chọn sản phẩm để tự động xác định danh mục", lang)}
            />
          )}
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Form.Item
            name="packageQuantity"
            label={t("Số lượng sản phẩm / combo", lang)}
            rules={[
              { required: true, message: t("Vui lòng nhập số lượng", lang) },
              { type: "number", min: 1, message: t("Số lượng phải > 0", lang) },
            ]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="giftQuantity"
            label={t("Số lượng quà / combo", lang)}
            rules={[{ type: "number", min: 0, message: t("Số quà phải >= 0", lang) }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} placeholder={t("0 = không có quà", lang)} />
          </Form.Item>
        </div>

        <Form.Item
          name="sellingPrice"
          label={t("Giá bán (₮)", lang)}
          rules={[
            { required: true, message: t("Vui lòng nhập giá bán", lang) },
            { type: "number", min: 0, message: t("Giá bán phải >= 0", lang) },
          ]}
        >
          <InputNumber
            min={0}
            style={{ width: "100%" }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(value) => Number((value ?? "").replace(/,/g, "") || 0) as 0}
            placeholder={t("Nhập giá bán", lang)}
          />
        </Form.Item>

        <Form.Item name="displayOrder" label={t("Thứ tự hiển thị", lang)}>
          <InputNumber min={0} style={{ width: "100%" }} placeholder="0" />
        </Form.Item>

        <Form.Item name="image" label={t("URL hình ảnh", lang)}>
          <Input placeholder="https://example.com/image.jpg" />
        </Form.Item>

        <Form.Item name="description" label={t("Mô tả", lang)}>
          <TextArea rows={2} placeholder={t("Mô tả combo (tùy chọn)", lang)} />
        </Form.Item>

        {isEditing && (
          <Form.Item name="isActive" label={t("Kích hoạt", lang)} valuePropName="checked">
            <Switch />
          </Form.Item>
        )}

        <Alert
          type="info"
          showIcon
          title={t("Combo không lưu phân loại sản phẩm và quà cụ thể. Phân loại sản phẩm sẽ được Sale chọn khi chốt đơn.", lang)}
          style={{ marginTop: 8 }}
        />
      </Form>
    </DrawerForm>
  );
}
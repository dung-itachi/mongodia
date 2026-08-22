/**
 * Product Variant Form Component (Sprint 8.4.1)
 *
 * Form for creating and editing Product Variants.
 * Shows product-specific variant options when product is selected.
 * SKU is auto-generated if not provided.
 * Attributes must be selected before values can be chosen.
 */

"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Space,
  Divider,
  message,
  Tag,
  Checkbox,
} from "antd";
import {
  InfoCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import DrawerForm from "@/components/common/forms/DrawerForm";
import type {
  ProductVariantListItem,
  ProductVariantDetail,
  CreateProductVariantInput,
  UpdateProductVariantInput,
  ProductVariantOptionWithValues,
  VariantOptionItem,
  VariantValueItem,
} from "@/hooks/useVariants";
import type { ProductListItem } from "@/hooks/useProductCrud";

// Generate random string for SKU suffix
function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

interface ProductVariantFormProps {
  open: boolean;
  editingItem?: ProductVariantListItem | ProductVariantDetail | null;
  products: ProductListItem[];
  productVariantOptions?: ProductVariantOptionWithValues[];
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: CreateProductVariantInput | UpdateProductVariantInput) => void;
  selectedProductId?: string | null;
  // Callbacks for quick-add
  onAddOption?: (name: string) => Promise<VariantOptionItem>;
  onAddValue?: (optionId: string, name: string) => Promise<VariantValueItem>;
  // All available options (for quick-add and assignment)
  allOptions?: VariantOptionItem[];
  // Callback when options need to be refetched
  onRefetchProductOptions?: () => void;
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
  onAddOption,
  onAddValue,
  allOptions = [],
  onRefetchProductOptions,
}: ProductVariantFormProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!editingItem;
  const [currentProductId, setCurrentProductId] = useState<string | null>(null);

  // State for step-by-step attribute selection
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedValueIds, setSelectedValueIds] = useState<string[]>([]);

  // State for selected variant values (separate from form for display purposes)
  const [selectedVariantValues, setSelectedVariantValues] = useState<string[]>([]);

  // Local cache of newly-added options/values so UI updates instantly
  // without waiting for parent refetch (the parent will also refetch).
  const [localOptions, setLocalOptions] = useState<
    Array<{
      _id: string;
      code: string;
      name: string;
      sortOrder?: number;
      isActive?: boolean;
      values: Array<{
        _id: string;
        code: string;
        name: string;
        variantOptionId: string;
        sortOrder?: number;
        isActive?: boolean;
      }>;
    }>
  >([]);

  // State for quick-add
  const [quickAddOptionOpen, setQuickAddOptionOpen] = useState(false);
  const [quickAddOptionName, setQuickAddOptionName] = useState("");
  const [quickAddOptionLoading, setQuickAddOptionLoading] = useState(false);

  const [quickAddValueOpen, setQuickAddValueOpen] = useState(false);
  const [quickAddValueName, setQuickAddValueName] = useState("");
  const [quickAddValueLoading, setQuickAddValueLoading] = useState(false);

  // State for assigning options to product
  const [showOptionAssignment, setShowOptionAssignment] = useState(false);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [assigningOptions, setAssigningOptions] = useState(false);

  // Get option IDs that are already assigned to this product
  const assignedOptionIds = useMemo(() => {
    return productVariantOptions.map((opt) => opt._id);
  }, [productVariantOptions]);

  // Options available for assignment (not yet assigned)
  const availableOptionsForAssignment = useMemo(() => {
    return allOptions.filter((opt) => !assignedOptionIds.includes(opt._id));
  }, [allOptions, assignedOptionIds]);

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
        // Set selected values from editing item
        const variantValueIds = getVariantValueIds(editingItem.variantValues);
        setSelectedVariantValues(variantValueIds);
      } else {
        setCurrentProductId(selectedProductId || null);
        setSelectedVariantValues([]);
      }
      // Reset selection state
      setSelectedOptionId(null);
      setSelectedValueIds([]);
      setShowOptionAssignment(false);
      setSelectedOptionIds([]);
      setLocalOptions([]);
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

  // Auto-generate SKU based on product code + variant values
  const generateSKU = useCallback((productId: string, valueIds: string[]): string => {
    const product = products.find((p) => p._id === productId);
    const productCode = product?.code || "SKU";

    // Get selected values info
    const selectedValues: string[] = [];
    valueIds.forEach((valueId) => {
      for (const option of productVariantOptions) {
        const value = option.values.find((v) => v._id === valueId);
        if (value) {
          selectedValues.push(value.code || value.name.substring(0, 3).toUpperCase());
          break;
        }
      }
    });

    // Generate random suffix for uniqueness
    const randomSuffix = generateRandomString(4);

    // Build SKU: PRODUCTCODE-VALUE1-VALUE2-XXXX
    const parts = [productCode];
    if (selectedValues.length > 0) {
      parts.push(...selectedValues);
    }
    parts.push(randomSuffix);

    return parts.join("-");
  }, [products, productVariantOptions]);

  const handleSubmit = () => {
    // Get values from form first
    const currentSKU = form.getFieldValue("sku");
    const productId = form.getFieldValue("productId");

    // Pre-generate SKU if not provided before validation
    if (!currentSKU || currentSKU.trim() === "") {
      if (productId) {
        const newSKU = generateSKU(productId, selectedVariantValues);
        form.setFieldValue("sku", newSKU);
      }
    }

    // Set variant values from state before submit
    form.setFieldValue("variantValues", selectedVariantValues);

    void form.validateFields().then((values) => {
      // Ensure all numeric fields are actual numbers (InputNumber should already
      // do this, but the API validator will reject strings, so be defensive).
      const toNumber = (v: unknown): number => {
        if (typeof v === "number") return v;
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const finalValues = {
        ...values,
        sku: form.getFieldValue("sku"),
        variantValues: selectedVariantValues,
        cost: toNumber(values.cost),
        weight: toNumber(values.weight),
        sortOrder: toNumber(values.sortOrder),
      };
      onSubmit(finalValues as CreateProductVariantInput | UpdateProductVariantInput);
    });
  };

  const handleProductChange = (productId: string) => {
    setCurrentProductId(productId);
    setSelectedOptionId(null);
    setSelectedValueIds([]);
    setSelectedVariantValues([]);
    // Auto-generate initial SKU
    const initialSKU = generateSKU(productId, []);
    form.setFieldValue("sku", initialSKU);
  };

  // Handle quick-add option
  const handleQuickAddOption = async () => {
    if (!quickAddOptionName.trim() || !onAddOption) return;
    setQuickAddOptionLoading(true);
    try {
      const newOption = await onAddOption(quickAddOptionName.trim());
      message.success(`Đã thêm thuộc tính "${newOption.name}"`);
      setQuickAddOptionName("");
      setQuickAddOptionOpen(false);

      // Update local cache so the option appears immediately in dropdowns.
      setLocalOptions((prev) => {
        const withoutExisting = prev.filter((o) => o._id !== newOption._id);
        return [
          ...withoutExisting,
          {
            _id: newOption._id,
            code: newOption.code,
            name: newOption.name,
            sortOrder: newOption.sortOrder ?? 0,
            isActive: newOption.isActive ?? true,
            values: [],
          },
        ];
      });

      // Auto-select the new option
      setSelectedOptionId(newOption._id);
    } catch (error) {
      const err = error as Error;
      message.error(err.message || "Không thể thêm thuộc tính");
    } finally {
      setQuickAddOptionLoading(false);
    }
  };

  // Handle quick-add value
  const handleQuickAddValue = async () => {
    if (!quickAddValueName.trim() || !selectedOptionId || !onAddValue) return;
    setQuickAddValueLoading(true);
    try {
      const newValue = await onAddValue(selectedOptionId, quickAddValueName.trim());
      message.success(`Đã thêm giá trị "${newValue.name}"`);
      setQuickAddValueName("");
      setQuickAddValueOpen(false);

      // Update local cache for the new value.
      // Make sure the parent option also exists in local cache so the merge
      // shows the value immediately even if the server response hasn't arrived.
      const parentOption = variantOptionsGrouped.find(
        (opt) => opt._id === selectedOptionId
      );

      setLocalOptions((prev) => {
        const existing = prev.find((opt) => opt._id === selectedOptionId);
        const newValueEntry = {
          _id: newValue._id,
          code: newValue.code,
          name: newValue.name,
          variantOptionId: selectedOptionId,
          sortOrder: newValue.sortOrder ?? 0,
          isActive: newValue.isActive ?? true,
        };

        if (!existing && parentOption) {
          // Seed the parent option so we can add the new value under it
          return [
            ...prev,
            {
              _id: parentOption._id,
              code: parentOption.code,
              name: parentOption.name,
              sortOrder: parentOption.sortOrder ?? 0,
              isActive: parentOption.isActive ?? true,
              values: [newValueEntry],
            },
          ];
        }

        if (!existing && !parentOption) {
          return prev;
        }

        return prev.map((opt) => {
          if (opt._id === selectedOptionId) {
            const withoutExisting = opt.values.filter((v) => v._id !== newValue._id);
            return {
              ...opt,
              values: [...withoutExisting, newValueEntry],
            };
          }
          return opt;
        });
      });

      // Auto-select the new value
      setSelectedValueIds((prev) => [...prev, newValue._id]);
    } catch (error) {
      const err = error as Error;
      message.error(err.message || "Không thể thêm giá trị");
    } finally {
      setQuickAddValueLoading(false);
    }
  };

  // Handle assign options to product
  const handleAssignOptions = async () => {
    if (!currentProductId || selectedOptionIds.length === 0) return;
    setAssigningOptions(true);
    try {
      const response = await fetch(`/api/products/${currentProductId}/variant-options`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantOptionIds: [...assignedOptionIds, ...selectedOptionIds] }),
      });
      const result = await response.json();
      if (result.success) {
        message.success("Đã gán thuộc tính cho sản phẩm");
        setSelectedOptionIds([]);
        setShowOptionAssignment(false);
        // Invalidate and refetch queries
        void queryClient.invalidateQueries({ queryKey: ["product-variant-options", currentProductId] });
        onRefetchProductOptions?.();
      } else {
        message.error(result.message || "Không thể gán thuộc tính");
      }
    } catch {
      message.error("Không thể gán thuộc tính");
    } finally {
      setAssigningOptions(false);
    }
  };

  // Handle value selection (toggle)
  const handleValueToggle = (valueId: string) => {
    setSelectedValueIds((prev) => {
      if (prev.includes(valueId)) {
        return prev.filter((id) => id !== valueId);
      }
      return [...prev, valueId];
    });
  };

  // Confirm selection and add to form
  const handleConfirmValues = () => {
    if (selectedValueIds.length > 0) {
      const newValues = [...new Set([...selectedVariantValues, ...selectedValueIds])];
      setSelectedVariantValues(newValues);
      // Reset for next selection
      setSelectedOptionId(null);
      setSelectedValueIds([]);
    }
  };

  // Remove a selected value
  const handleRemoveSelectedValue = (valueId: string) => {
    setSelectedVariantValues((prev) => prev.filter((id) => id !== valueId));
  };

  useEffect(() => {
    if (open) {
      if (editingItem) {
        const productId = getProductId(editingItem.productId);
        const variantValueIds = getVariantValueIds(editingItem.variantValues);
        form.setFieldsValue({
          productId,
          sku: editingItem.sku,
          barcode: editingItem.barcode ?? "",
          image: editingItem.image ?? "",
          variantValues: variantValueIds,
          cost: editingItem.cost ?? 0,
          weight: editingItem.weight ?? 0,
          sortOrder: editingItem.sortOrder ?? 0,
          isActive: editingItem.isActive ?? true,
        });
        setCurrentProductId(productId);
        setSelectedVariantValues(variantValueIds);
        setSelectedOptionId(null);
        setSelectedValueIds([]);
      } else {
        form.resetFields();
        const defaultProductId = selectedProductId || undefined;
        form.setFieldsValue({
          productId: defaultProductId,
          cost: 0,
          weight: 0,
          sortOrder: 0,
          isActive: true,
          variantValues: [],
        });
        setSelectedVariantValues([]);
        if (selectedProductId) {
          setCurrentProductId(selectedProductId);
          const initialSKU = generateSKU(selectedProductId, []);
          form.setFieldValue("sku", initialSKU);
        }
        setSelectedOptionId(null);
        setSelectedValueIds([]);
      }
    }
  }, [open, editingItem, form, selectedProductId, generateSKU]);

  // Group variant values by option, merging server data with locally-added options/values
  // so the UI updates immediately after a quick-add (no waiting for parent refetch).
  const variantOptionsGrouped = useMemo(() => {
    const merged = new Map<
      string,
      ProductVariantOptionWithValues & {
        values: Array<{
          _id: string;
          code: string;
          name: string;
          variantOptionId: string;
          sortOrder?: number;
          isActive?: boolean;
        }>;
      }
    >();

    // Seed with server-provided options
    for (const opt of productVariantOptions) {
      merged.set(opt._id, {
        ...opt,
        values: (opt.values || []).map((v) => ({
          _id: v._id,
          code: v.code,
          name: v.name,
          variantOptionId: opt._id,
          sortOrder: v.sortOrder,
          isActive: v.isActive,
        })),
      });
    }

    // Merge locally-added options/values
    for (const localOpt of localOptions) {
      const existing = merged.get(localOpt._id);
      if (!existing) {
        // New option not yet on server side
        merged.set(localOpt._id, {
          _id: localOpt._id,
          code: localOpt.code,
          name: localOpt.name,
          sortOrder: localOpt.sortOrder ?? 0,
          isActive: localOpt.isActive ?? true,
          values: localOpt.values,
        });
      } else {
        // Existing option: merge new values that aren't in server response yet
        const existingValueIds = new Set(existing.values.map((v) => v._id));
        const newValues = localOpt.values.filter((v) => !existingValueIds.has(v._id));
        existing.values = [...existing.values, ...newValues];
      }
    }

    return Array.from(merged.values());
  }, [productVariantOptions, localOptions]);

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
            <div style={{ marginBottom: 8, fontWeight: 500, color: "#333" }}>
              Sản phẩm: <span style={{ color: "#1890ff" }}>{products.find((p) => p._id === currentProductId)?.name || currentProductId}</span>
            </div>
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
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <InfoCircleOutlined style={{ color: "#faad14" }} />
                  <span style={{ color: "#666" }}>
                    Sản phẩm này chưa có thuộc tính biến thể nào.
                  </span>
                </div>
                {!showOptionAssignment && availableOptionsForAssignment.length > 0 && (
                  <Button
                    type="link"
                    onClick={() => setShowOptionAssignment(true)}
                    style={{ padding: 0, marginTop: 8, marginLeft: 22 }}
                  >
                    + Gán thuộc tính từ danh sách có sẵn
                  </Button>
                )}
              </>
            )}

            {/* Option Assignment Section */}
            {showOptionAssignment && (
              <div style={{ marginTop: 12, paddingLeft: 22 }}>
                <div style={{ fontWeight: 500, marginBottom: 8, color: "#333" }}>
                  Chọn thuộc tính để gán cho sản phẩm:
                </div>
                <Checkbox.Group
                  value={selectedOptionIds}
                  onChange={(values) => setSelectedOptionIds(values as string[])}
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {availableOptionsForAssignment.map((opt) => (
                    <Checkbox key={opt._id} value={opt._id}>
                      {opt.name}
                    </Checkbox>
                  ))}
                  {availableOptionsForAssignment.length === 0 && (
                    <div style={{ color: "#999", fontStyle: "italic" }}>
                      Tất cả thuộc tính đã được gán cho sản phẩm này.
                    </div>
                  )}
                </Checkbox.Group>
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <Button
                    type="primary"
                    size="small"
                    onClick={handleAssignOptions}
                    loading={assigningOptions}
                    disabled={selectedOptionIds.length === 0}
                  >
                    Gán {selectedOptionIds.length} thuộc tính đã chọn
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setShowOptionAssignment(false);
                      setSelectedOptionIds([]);
                    }}
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <Form.Item name="sku" label="SKU">
          <Space.Compact style={{ width: "100%" }}>
            <Input
              placeholder="Sẽ tự tạo nếu để trống"
              style={{ flex: 1 }}
            />
            <Button
              onClick={() => {
                const productId = form.getFieldValue("productId");
                if (productId) {
                  const values = form.getFieldValue("variantValues") || [];
                  const newSKU = generateSKU(productId, values);
                  form.setFieldValue("sku", newSKU);
                }
              }}
              disabled={!currentProductId}
            >
              Tạo mới
            </Button>
          </Space.Compact>
        </Form.Item>
        <div style={{ color: "#8c8c8c", fontSize: 12, marginTop: -8, marginBottom: 16 }}>
          Để trống để tự tạo SKU theo quy tắc: Mã sản phẩm - Giá trị biến thể - Mã ngẫu nhiên
        </div>

        <Form.Item name="barcode" label="Barcode">
          <Input placeholder="Mã vạch (tùy chọn)" />
        </Form.Item>

        {/* New step-by-step attribute selection */}
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            background: "#fafafa",
            borderRadius: 8,
            border: "1px solid #e8e8e8",
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 500, color: "#333", marginBottom: 8 }}>
              Chọn thuộc tính và giá trị biến thể
            </div>

            {/* Step 1: Select Attribute */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span
                  style={{
                    background: "#1890ff",
                    color: "white",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                  }}
                >
                  1
                </span>
                <span style={{ fontWeight: 500 }}>Chọn thuộc tính</span>
                {onAddOption && (
                  <Button
                    type="link"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => setQuickAddOptionOpen(true)}
                  >
                    Thêm nhanh
                  </Button>
                )}
              </div>
              <Select
                placeholder="-- Chọn thuộc tính --"
                style={{ width: "100%" }}
                value={selectedOptionId}
                onChange={(value) => {
                  setSelectedOptionId(value);
                  setSelectedValueIds([]);
                }}
                options={variantOptionsGrouped.map((opt) => ({
                  label: opt.name,
                  value: opt._id,
                }))}
              />
            </div>

            {/* Quick Add Option Modal */}
            {quickAddOptionOpen && (
              <div
                style={{
                  padding: "12px",
                  background: "#fff",
                  borderRadius: 6,
                  marginBottom: 12,
                  border: "1px dashed #1890ff",
                }}
              >
                <div style={{ fontSize: 12, color: "#1890ff", marginBottom: 8 }}>
                  Thêm thuộc tính mới
                </div>
                <Space.Compact style={{ width: "100%" }}>
                  <Input
                    placeholder="Tên thuộc tính (VD: Kích thước)"
                    value={quickAddOptionName}
                    onChange={(e) => setQuickAddOptionName(e.target.value)}
                    onPressEnter={handleQuickAddOption}
                  />
                  <Button
                    type="primary"
                    onClick={handleQuickAddOption}
                    loading={quickAddOptionLoading}
                    icon={<CheckOutlined />}
                  >
                    Thêm
                  </Button>
                  <Button onClick={() => setQuickAddOptionOpen(false)}>Hủy</Button>
                </Space.Compact>
              </div>
            )}

            {/* Step 2: Select Values (only show when option is selected) */}
            {selectedOptionId && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span
                    style={{
                      background: "#52c41a",
                      color: "white",
                      borderRadius: "50%",
                      width: 20,
                      height: 20,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                    }}
                  >
                    2
                  </span>
                  <span style={{ fontWeight: 500 }}>Chọn giá trị</span>
                  {onAddValue && (
                    <Button
                      type="link"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => setQuickAddValueOpen(!quickAddValueOpen)}
                    >
                      Thêm nhanh
                    </Button>
                  )}
                </div>

                {/* Quick Add Value Input */}
                {quickAddValueOpen && (
                  <div
                    style={{
                      padding: "12px",
                      background: "#fff",
                      borderRadius: 6,
                      marginBottom: 8,
                      border: "1px dashed #52c41a",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#52c41a", marginBottom: 8 }}>
                      Thêm giá trị mới cho thuộc tính đã chọn
                    </div>
                    <Space.Compact style={{ width: "100%" }}>
                      <Input
                        placeholder="Tên giá trị (VD: Lớn, Đỏ)"
                        value={quickAddValueName}
                        onChange={(e) => setQuickAddValueName(e.target.value)}
                        onPressEnter={handleQuickAddValue}
                      />
                      <Button
                        type="primary"
                        onClick={handleQuickAddValue}
                        loading={quickAddValueLoading}
                        icon={<CheckOutlined />}
                      >
                        Thêm
                      </Button>
                      <Button onClick={() => setQuickAddValueOpen(false)}>Hủy</Button>
                    </Space.Compact>
                  </div>
                )}

                {/* Value selection */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(() => {
                    const selectedOption = variantOptionsGrouped.find(
                      (opt) => opt._id === selectedOptionId
                    );
                    if (!selectedOption) return null;
                    return selectedOption.values.map((vv) => (
                      <Button
                        key={vv._id}
                        type={selectedValueIds.includes(vv._id) ? "primary" : "default"}
                        onClick={() => handleValueToggle(vv._id)}
                        icon={selectedValueIds.includes(vv._id) ? <CheckOutlined /> : undefined}
                      >
                        {vv.name}
                      </Button>
                    ));
                  })()}
                </div>

                {/* Confirm button */}
                {selectedValueIds.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <Button
                      type="primary"
                      onClick={handleConfirmValues}
                      icon={<PlusOutlined />}
                    >
                      Thêm {selectedValueIds.length} giá trị đã chọn
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <Divider style={{ margin: "12px 0" }} />

          {/* Hidden form item to ensure variantValues is included in submission */}
          <Form.Item name="variantValues" hidden>
            <Input />
          </Form.Item>

          {/* Selected values display */}
          <div>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>
              Các giá trị đã chọn ({selectedVariantValues.length})
            </div>
            {selectedVariantValues.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {selectedVariantValues.map((valueId: string) => {
                  let valueName = valueId;
                  let optionName = "";
                  for (const opt of variantOptionsGrouped) {
                    const vv = opt.values.find((v) => v._id === valueId);
                    if (vv) {
                      valueName = vv.name;
                      optionName = opt.name;
                      break;
                    }
                  }
                  return (
                    <Tag
                      key={valueId}
                      closable
                      onClose={() => handleRemoveSelectedValue(valueId)}
                    >
                      {optionName}: {valueName}
                    </Tag>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: "#8c8c8c", fontStyle: "italic" }}>
                Chưa chọn giá trị nào
              </div>
            )}
          </div>
        </div>

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
            formatter={(value) =>
              `${value ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(value) => {
              const num = Number((value ?? "").toString().replace(/,/g, ""));
              return (Number.isFinite(num) ? num : 0) as 0;
            }}
          />
        </Form.Item>

        <Form.Item
          name="weight"
          label={
            <span>
              Trọng lượng{" "}
              <span style={{ color: "#999", fontSize: 12 }}>(gram)</span>
            </span>
          }
        >
          <InputNumber
            min={0}
            style={{ width: "100%" }}
            placeholder="0"
          />
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

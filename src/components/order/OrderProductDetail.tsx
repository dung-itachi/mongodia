/**
 * ==================================================
 * ORDER PRODUCT DETAIL COMPONENT
 * ==================================================
 *
 * Sprint 8.x - Generic Variant Support
 *
 * Component render động chi tiết sản phẩm trong Order.
 * Hỗ trợ:
 * - Product không có VariantOption (CASE 1): Chỉ render số lượng
 * - Product có 1 VariantOption (CASE 2): Render 1 dropdown
 * - Product có nhiều VariantOption (CASE 3): Render nhiều dropdown động
 *
 * Quà tặng:
 * - giftMode = RANDOM: Shop tự chọn quà (mặc định)
 * - giftMode = CUSTOMER_SELECTED: Khách chọn quà cụ thể
 * - Kho mới là nơi quyết định quà thực tế xuất
 *
 * Quy tắc:
 * - OrderItem đại diện cho Combo, không phải Product
 * - comboQuantity = số combo khách mua
 * - packageQuantity = số sản phẩm trong 1 combo
 * - giftQuantity = số quà trong 1 combo (từ Combo)
 * - details luôn tồn tại
 * - giftSelections chỉ cần khi CUSTOMER_SELECTED
 * - variantId resolve 1 lần, dùng mãi mãi
 *
 * Validations:
 * - sum(details.quantity) == comboQuantity * packageQuantity
 * - RANDOM: giftSelections có thể rỗng
 * - CUSTOMER_SELECTED: sum(giftSelections.quantity) == comboQuantity * giftQuantity
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, InputNumber, Button, Space, Tag, Select, Typography, Divider, Alert, Radio } from "antd";
import { PlusOutlined, DeleteOutlined, ShoppingOutlined, GiftOutlined, QuestionOutlined } from "@ant-design/icons";
import type { RadioChangeEvent, SelectProps } from "antd";
import type {
  ProductWithVariants,
  OrderItem,
  ProductVariantSelection,
  ProductAttribute,
  GiftSelection,
  OrderGiftMode,
} from "@/types/variant";
import { resolveVariantId, validateOrderItem } from "@/types/variant";
import { useGiftList, type GiftListItem } from "@/hooks/useGifts";
import { formatMNT } from "@/lib/format";
import { useMessage } from "@/contexts/MessageContext";

const { Text } = Typography;

// ============================================================================
// Types
// ============================================================================

interface OrderProductDetailProps {
  /** Danh sách order items (mỗi item = 1 combo) */
  items: OrderItem[];
  /** Product info để render variant options */
  product?: ProductWithVariants | null;
  /** Loading state */
  loading?: boolean;
  /** Callback khi items thay đổi */
  onChange: (items: OrderItem[]) => void;
  /** Disabled state */
  disabled?: boolean;
}

interface SelectedAttributes {
  [optionId: string]: string | undefined;
}

// ============================================================================
// Helpers
// ============================================================================

function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Tạo OrderItem từ Combo đã chọn
 *
 * Quy ước:
 * - giftMode mặc định = RANDOM
 * - giftSelections = [] khi RANDOM
 */
function createOrderItemFromCombo(
  combo: {
    _id: string;
    code: string;
    name: string;
    packageQuantity: number;
    giftQuantity: number;
    sellingPrice: number;
    productId: string;
  }
): OrderItem {
  // Tạo details mặc định: 1 dòng với tất cả sản phẩm, không có variant
  const defaultDetail: ProductVariantSelection = {
    quantity: combo.packageQuantity,
    attributes: [],
  };

  return {
    _tempId: generateTempId(),
    comboId: combo._id,
    productId: combo.productId,
    comboName: combo.name,
    comboCode: combo.code,
    comboQuantity: 1,
    packageQuantity: combo.packageQuantity,
    giftQuantity: combo.giftQuantity,
    giftMode: "RANDOM",
    giftSelections: [],
    sellingPrice: combo.sellingPrice,
    discount: 0,
    subtotal: combo.sellingPrice,
    details: [defaultDetail],
  };
}

function getVariantDisplayString(
  product: ProductWithVariants,
  attributes: ProductAttribute[]
): string {
  if (!product.variantOptions || attributes.length === 0) return "";

  return attributes
    .map((attr) => {
      const option = product.variantOptions?.find(
        (o) => o._id === attr.optionId
      );
      const value = option?.values.find((v) => v._id === attr.valueId);
      return value?.name || "";
    })
    .filter(Boolean)
    .join(" / ");
}

function sumDetailsQuantity(details: ProductVariantSelection[]): number {
  return details.reduce((sum, d) => sum + d.quantity, 0);
}

function sumGiftSelectionsQuantity(selections: GiftSelection[]): number {
  return selections.reduce((sum, g) => sum + g.quantity, 0);
}

// ============================================================================
// Variant Detail Row Component
// ============================================================================

interface VariantDetailRowProps {
  detail: ProductVariantSelection;
  detailIndex: number;
  product: ProductWithVariants | null;
  onUpdate: (detail: ProductVariantSelection) => void;
  onDelete: () => void;
  disabled?: boolean;
  canDelete?: boolean;
}

function VariantDetailRow({
  detail,
  detailIndex,
  product,
  onUpdate,
  onDelete,
  disabled,
  canDelete = true,
}: VariantDetailRowProps) {
  const variantOptions = product?.variantOptions || [];
  const hasVariants = variantOptions.length > 0;

  const [selectedAttributes, setSelectedAttributes] = useState<SelectedAttributes>(() => {
    const initial: SelectedAttributes = {};
    detail.attributes.forEach((attr) => {
      initial[attr.optionId] = attr.valueId;
    });
    return initial;
  });

  const displayString = useMemo(
    () => (product ? getVariantDisplayString(product, detail.attributes) : ""),
    [product, detail.attributes]
  );

  const handleAttributeChange = useCallback(
    (optionId: string, valueId: string) => {
      const newAttributes = [...detail.attributes];
      const existingIndex = newAttributes.findIndex((a) => a.optionId === optionId);

      if (existingIndex >= 0) {
        newAttributes[existingIndex] = { optionId, valueId };
      } else {
        newAttributes.push({ optionId, valueId });
      }

      if (product?.variantOptions) {
        newAttributes.sort((a, b) => {
          const optA = product.variantOptions?.find((o) => o._id === a.optionId);
          const optB = product.variantOptions?.find((o) => o._id === b.optionId);
          return (optA?.sortOrder || 0) - (optB?.sortOrder || 0);
        });
      }

      const variants = product?.variants || [];
      const variantId = resolveVariantId(variants, newAttributes);

      onUpdate({ ...detail, attributes: newAttributes, variantId: variantId || undefined });
    },
    [detail, product, onUpdate]
  );

  const handleQuantityChange = useCallback(
    (qty: number | null) => {
      onUpdate({ ...detail, quantity: qty || 1 });
    },
    [detail, onUpdate]
  );

  const selectOptionsByOption: Record<string, SelectProps["options"]> = useMemo(() => {
    const options: Record<string, SelectProps["options"]> = {};
    variantOptions.forEach((opt) => {
      options[opt._id] = opt.values.map((val) => ({
        label: val.name,
        value: val._id,
      }));
    });
    return options;
  }, [variantOptions]);

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        padding: "8px 12px",
        background: "#fafafa",
        borderRadius: 4,
        marginBottom: 8,
        flexWrap: "wrap",
      }}
    >
      <Text type="secondary" style={{ minWidth: 24 }}>
        #{detailIndex + 1}
      </Text>

      {hasVariants && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {variantOptions.map((option) => (
            <div key={option._id} style={{ minWidth: 100 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {option.name}
              </Text>
              <Select
                placeholder={`Chọn ${option.name}`}
                value={selectedAttributes[option._id]}
                onChange={(value) => {
                  setSelectedAttributes((prev) => ({
                    ...prev,
                    [option._id]: value,
                  }));
                  handleAttributeChange(option._id, value);
                }}
                options={selectOptionsByOption[option._id]}
                style={{ width: "100%" }}
                size="small"
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      )}

      {displayString && (
        <Tag color="blue" style={{ margin: 0 }}>
          {displayString}
        </Tag>
      )}

      {detail.variantId && (
        <Tag color="green" style={{ fontSize: 10 }}>
          SKU resolved
        </Tag>
      )}

      <div style={{ minWidth: 80 }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          SL
        </Text>
        <InputNumber
          min={1}
          value={detail.quantity}
          onChange={handleQuantityChange}
          style={{ width: "100%" }}
          size="small"
          disabled={disabled}
        />
      </div>

      {!disabled && canDelete && (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={onDelete}
          size="small"
        />
      )}
    </div>
  );
}

// ============================================================================
// Gift Selection Component (Sprint 8.x)
// ============================================================================

interface GiftSelectionSectionProps {
  giftMode: OrderGiftMode;
  giftSelections: GiftSelection[];
  totalGiftRequired: number;
  onModeChange: (mode: OrderGiftMode) => void;
  onSelectionsChange: (selections: GiftSelection[]) => void;
  disabled?: boolean;
}

/**
 * Quà tặng:
 * - RANDOM (mặc định): Shop tự chọn
 * - CUSTOMER_SELECTED: Khách đã chọn, kho phải xuất đúng
 */
function GiftSelectionSection({
  giftMode,
  giftSelections,
  totalGiftRequired,
  onModeChange,
  onSelectionsChange,
  disabled,
}: GiftSelectionSectionProps) {
  // Fetch danh sách quà active từ Gift API
  const { data: giftsData, isLoading: isLoadingGifts } = useGiftList({
    isActive: true,
  });
  const gifts: GiftListItem[] = giftsData?.items ?? [];

  const giftOptions = useMemo(
    () =>
      gifts.map((g) => ({
        label: `${g.name} - Tồn kho: ${g.stockQuantity}`,
        value: g._id,
        giftName: g.name,
      })),
    [gifts]
  );

  const handleModeChange = useCallback(
    (e: RadioChangeEvent) => {
      const mode = e.target.value as OrderGiftMode;
      onModeChange(mode);

      if (mode === "RANDOM") {
        // Reset selections khi chuyển về RANDOM
        onSelectionsChange([]);
      }
    },
    [onModeChange, onSelectionsChange]
  );

  const handleAddGift = useCallback(() => {
    onSelectionsChange([
      ...giftSelections,
      { giftProductId: "", giftProductName: "", quantity: 1 },
    ]);
  }, [giftSelections, onSelectionsChange]);

  const handleUpdateGift = useCallback(
    (index: number, gift: GiftSelection) => {
      const newSelections = [...giftSelections];
      newSelections[index] = gift;
      onSelectionsChange(newSelections);
    },
    [giftSelections, onSelectionsChange]
  );

  const handleDeleteGift = useCallback(
    (index: number) => {
      onSelectionsChange(giftSelections.filter((_, i) => i !== index));
    },
    [giftSelections, onSelectionsChange]
  );

  if (totalGiftRequired === 0) {
    return (
      <div style={{ textAlign: "center", padding: 16, color: "#999" }}>
        Combo này không có quà tặng
      </div>
    );
  }

  // Tính tổng selections để validate
  const currentTotal = sumGiftSelectionsQuantity(giftSelections);
  const isValidSelections = currentTotal === totalGiftRequired;

  return (
    <div style={{ padding: "12px", background: "#fffbf0", borderRadius: 8 }}>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <Space>
          <Text strong>Quà tặng ({totalGiftRequired})</Text>
          {giftMode === "CUSTOMER_SELECTED" && (
            <Tag color={isValidSelections ? "green" : "red"}>
              {currentTotal} / {totalGiftRequired}
            </Tag>
          )}
          {giftMode === "RANDOM" && (
            <Tag color="purple">Shop tự chọn</Tag>
          )}
        </Space>
      </div>

      {/* Validation Alert - chỉ cho CUSTOMER_SELECTED */}
      {giftMode === "CUSTOMER_SELECTED" && !isValidSelections && (
        <Alert
          type="warning"
          message={`Chi tiết quà phải đủ ${totalGiftRequired} quà.`}
          style={{ marginBottom: 12 }}
          showIcon
        />
      )}

      {/* Mode Selection */}
      <Radio.Group
        value={giftMode}
        onChange={handleModeChange}
        style={{ marginBottom: 16 }}
        disabled={disabled}
      >
        <Space orientation="vertical">
          <Radio value="RANDOM">
            <Space>
              <QuestionOutlined />
              <Text>Để shop chọn ngẫu nhiên</Text>
            </Space>
          </Radio>
          <Radio value="CUSTOMER_SELECTED">
            <Space>
              <GiftOutlined />
              <Text>Khách chọn</Text>
            </Space>
          </Radio>
        </Space>
      </Radio.Group>

      {/* RANDOM: Hiển thị thông báo */}
      {giftMode === "RANDOM" && (
        <Alert
          type="info"
          message={`Kho sẽ tự chọn ${totalGiftRequired} quà ngẫu nhiên theo quy tắc công ty`}
          showIcon
        />
      )}

      {/* CUSTOMER_SELECTED: Hiển thị danh sách yêu cầu */}
      {giftMode === "CUSTOMER_SELECTED" && (
        <>
          {giftSelections.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "12px",
                border: "1px dashed #fa8c16",
                borderRadius: 4,
              }}
            >
              <Text type="secondary">Chưa có quà nào được chọn</Text>
              {!disabled && (
                <Button
                  type="link"
                  onClick={handleAddGift}
                  icon={<PlusOutlined />}
                >
                  Thêm quà
                </Button>
              )}
            </div>
          ) : (
            <>
              {giftSelections.map((gift, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "#fff",
                    borderRadius: 4,
                    marginBottom: 8,
                    border: "1px solid #ffe7ba",
                  }}
                >
                  <GiftOutlined style={{ color: "#fa8c16" }} />
                  <Select
                    placeholder={isLoadingGifts ? "Đang tải..." : "Chọn sản phẩm"}
                    value={gift.giftProductId || undefined}
                    onChange={(value, option) => {
                      handleUpdateGift(index, {
                        giftProductId: value as string,
                        giftProductName: (option as { giftName?: string })?.giftName,
                        quantity: gift.quantity,
                      });
                    }}
                    options={giftOptions}
                    style={{ minWidth: 180 }}
                    size="small"
                    disabled={disabled || isLoadingGifts}
                    showSearch
                    optionFilterProp="label"
                  />
                  <div style={{ minWidth: 70 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      SL
                    </Text>
                    <InputNumber
                      min={1}
                      value={gift.quantity}
                      onChange={(qty) => {
                        handleUpdateGift(index, {
                          ...gift,
                          quantity: qty || 1,
                        });
                      }}
                      style={{ width: "100%" }}
                      size="small"
                      disabled={disabled}
                    />
                  </div>
                  {!disabled && (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteGift(index)}
                      size="small"
                    />
                  )}
                </div>
              ))}

              {!disabled && (
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={handleAddGift}
                  block
                  style={{ borderColor: "#fa8c16", color: "#fa8c16" }}
                >
                  Thêm yêu cầu quà
                </Button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// Order Item Row Component
// ============================================================================

interface OrderItemRowProps {
  item: OrderItem;
  product: ProductWithVariants | null;
  onUpdate: (item: OrderItem) => void;
  onDelete: () => void;
  disabled?: boolean;
}

function OrderItemRow({
  item,
  product,
  onUpdate,
  onDelete,
  disabled,
}: OrderItemRowProps) {
  const variantOptions = product?.variantOptions || [];
  const hasVariants = variantOptions.length > 0;
  const message = useMessage();

  // Tính tổng yêu cầu
  const totalProductsRequired = item.comboQuantity * item.packageQuantity;
  const totalGiftsRequired = item.comboQuantity * item.giftQuantity;

  // Validation tổng
  const validation = useMemo(() => validateOrderItem(item), [item]);
  const totalDetailsQuantity = sumDetailsQuantity(item.details);

  // Add new detail
  const handleAddDetail = useCallback(() => {
    const newDetail: ProductVariantSelection = {
      quantity: 1,
      attributes: [],
    };
    onUpdate({ ...item, details: [...item.details, newDetail] });
  }, [item, onUpdate]);

  const handleUpdateDetail = useCallback(
    (index: number, detail: ProductVariantSelection) => {
      const combinationKey = detail.attributes.map((attribute) => attribute.valueId).sort().join(":");
      const duplicate = item.details.some((existing, existingIndex) =>
        existingIndex !== index && existing.attributes.map((attribute) => attribute.valueId).sort().join(":") === combinationKey
      );
      if (combinationKey && duplicate) {
        void message.warning("Biến thể này đã tồn tại.");
        return;
      }
      const newDetails = [...item.details];
      newDetails[index] = detail;
      onUpdate({ ...item, details: newDetails });
    },
    [item, onUpdate]
  );

  const handleDeleteDetail = useCallback(
    (index: number) => {
      const newDetails = item.details.filter((_, i) => i !== index);
      onUpdate({ ...item, details: newDetails });
    },
    [item, onUpdate]
  );

  // Gifts handlers
  const handleGiftModeChange = useCallback(
    (mode: OrderGiftMode) => {
      onUpdate({ ...item, giftMode: mode });
    },
    [item, onUpdate]
  );

  const handleGiftSelectionsChange = useCallback(
    (selections: GiftSelection[]) => {
      onUpdate({ ...item, giftSelections: selections });
    },
    [item, onUpdate]
  );

  // Update comboQuantity
  const handleComboQuantityChange = useCallback(
    (qty: number | null) => {
      const q = qty || 1;
      const newSubtotal = item.sellingPrice * q - item.discount;
      onUpdate({ ...item, comboQuantity: q, subtotal: newSubtotal });
    },
    [item, onUpdate]
  );

  const handlePriceChange = useCallback(
    (price: number | null) => {
      const p = price || 0;
      const newSubtotal = p * item.comboQuantity - item.discount;
      onUpdate({ ...item, sellingPrice: p, subtotal: newSubtotal });
    },
    [item, onUpdate]
  );

  const handleDiscountChange = useCallback(
    (discount: number | null) => {
      const d = discount || 0;
      const newSubtotal = item.sellingPrice * item.comboQuantity - d;
      onUpdate({ ...item, discount: d, subtotal: newSubtotal });
    },
    [item, onUpdate]
  );

  return (
    <Card
      size="small"
      style={{ marginBottom: 16 }}
      title={
        <Space>
          <ShoppingOutlined />
          <Text strong>{item.comboName}</Text>
          <Tag color="purple">{item.comboCode}</Tag>
          {hasVariants && (
            <Tag color="orange">{variantOptions.length} thuộc tính</Tag>
          )}
          {!validation.isValid && (
            <Tag color="red">Lỗi validation</Tag>
          )}
        </Space>
      }
      extra={
        !disabled && (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={onDelete}
          />
        )
      }
    >
      {/* Main Info Row */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 100 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Số combo
          </Text>
          <InputNumber
            min={1}
            value={item.comboQuantity}
            onChange={handleComboQuantityChange}
            style={{ width: "100%" }}
            size="small"
            disabled={disabled}
          />
        </div>

        <div style={{ minWidth: 100 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            SP/Combo
          </Text>
          <InputNumber
            min={1}
            value={item.packageQuantity}
            readOnly
            style={{ width: "100%" }}
            size="small"
          />
        </div>

        <div style={{ minWidth: 80 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Quà/Combo
          </Text>
          <InputNumber
            min={0}
            value={item.giftQuantity}
            readOnly
            style={{ width: "100%" }}
            size="small"
          />
        </div>

        <div style={{ minWidth: 120 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Giá combo
          </Text>
          <InputNumber
            min={0}
            value={item.sellingPrice}
            onChange={handlePriceChange}
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(value) => value?.replace(/,/g, "") as unknown as number}
            style={{ width: "100%" }}
            size="small"
            disabled={disabled}
          />
        </div>

        <div style={{ minWidth: 80 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Giảm giá
          </Text>
          <InputNumber
            min={0}
            value={item.discount}
            onChange={handleDiscountChange}
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(value) => value?.replace(/,/g, "") as unknown as number}
            style={{ width: "100%" }}
            size="small"
            disabled={disabled}
          />
        </div>

        <div style={{ minWidth: 120 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Thành tiền
          </Text>
          <Text strong style={{ display: "block", color: "#1890ff", fontSize: 16 }}>
            {formatMNT(item.subtotal)}
          </Text>
        </div>
      </div>

      {/* Variant Details Section */}
      <Divider style={{ margin: "12px 0" }}>
        <Space>
          <Text strong>Chi tiết sản phẩm</Text>
          <Tag color={validation.detailsError ? "red" : "green"}>
            {totalDetailsQuantity} / {totalProductsRequired}
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ({item.comboQuantity} × {item.packageQuantity})
          </Text>
        </Space>
      </Divider>

      {validation.detailsError && (
        <Alert
          type="warning"
          message={validation.detailsError}
          style={{ marginBottom: 8 }}
          showIcon
        />
      )}

      {item.details.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "16px",
            border: "1px dashed #d9d9d9",
            borderRadius: 4,
            color: "#999",
          }}
        >
          Chưa có chi tiết biến thể
          {!disabled && (
            <Button
              type="link"
              onClick={handleAddDetail}
              style={{ marginLeft: 8 }}
            >
              Thêm chi tiết
            </Button>
          )}
        </div>
      ) : (
        <>
          {item.details.map((detail, index) => (
            <VariantDetailRow
              key={`${item._tempId}-detail-${index}`}
              detail={detail}
              detailIndex={index}
              product={product}
              onUpdate={(d) => handleUpdateDetail(index, d)}
              onDelete={() => handleDeleteDetail(index)}
              disabled={disabled}
              canDelete={item.details.length > 1}
            />
          ))}

          {!disabled && (
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddDetail}
              block
              style={{ marginTop: 8 }}
            >
              Thêm dòng biến thể
            </Button>
          )}
        </>
      )}

      {/* Gifts Section */}
      <Divider style={{ margin: "16px 0 12px" }}>
        <Space>
          <GiftOutlined />
          <Text strong>Quà tặng</Text>
          <Tag color="gold">{totalGiftsRequired} quà</Tag>
          {item.giftMode === "RANDOM" ? (
            <Tag color="purple">Shop tự chọn</Tag>
          ) : (
            <Tag color="orange">Khách chọn</Tag>
          )}
        </Space>
      </Divider>

      <GiftSelectionSection
        giftMode={item.giftMode}
        giftSelections={item.giftSelections}
        totalGiftRequired={totalGiftsRequired}
        onModeChange={handleGiftModeChange}
        onSelectionsChange={handleGiftSelectionsChange}
        disabled={disabled}
      />
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function OrderProductDetail({
  items,
  product,
  loading,
  onChange,
  disabled = false,
}: OrderProductDetailProps) {
  const variantOptions = product?.variantOptions || [];
  const hasVariants = variantOptions.length > 0;
  const message = useMessage();

  // Calculate totals
  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => ({
        totalComboCount: acc.totalComboCount + item.comboQuantity,
        totalProducts: acc.totalProducts + item.comboQuantity * item.packageQuantity,
        totalGifts: acc.totalGifts + item.comboQuantity * item.giftQuantity,
        totalSubtotal: acc.totalSubtotal + item.subtotal,
        totalDiscount: acc.totalDiscount + item.discount,
      }),
      { totalComboCount: 0, totalProducts: 0, totalGifts: 0, totalSubtotal: 0, totalDiscount: 0 }
    );
  }, [items]);

  return (
    <div>
      {/* Product Info Card */}
      {product && (
        <Card
          size="small"
          title={
            <Space>
              <ShoppingOutlined />
              <Text strong>{product.name}</Text>
              {hasVariants && (
                <Tag color="orange">
                  {variantOptions.length} thuộc tính:{" "}
                  {variantOptions.map((o) => o.name).join(", ")}
                </Tag>
              )}
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          {hasVariants ? (
            <Text type="secondary">
              Sale nhập chi tiết biến thể cho mỗi sản phẩm
            </Text>
          ) : (
            <Text type="secondary">
              Sản phẩm không có biến thể - Sale nhập số lượng tổng
            </Text>
          )}
        </Card>
      )}

      {/* Order Items List */}
      {items.length === 0 ? (
        <Card>
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "#999",
              border: "1px dashed #d9d9d9",
              borderRadius: 4,
            }}
          >
            <ShoppingOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>Chưa có combo nào</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Chọn combo để thêm vào đơn hàng
            </div>
          </div>
        </Card>
      ) : (
        items.map((item, index) => (
          <OrderItemRow
            key={item._tempId || index}
            item={item}
            product={product ?? null}
            onUpdate={(updated) => {
              const newItems = [...items];
              newItems[index] = updated;
              onChange(newItems);
            }}
            onDelete={() => {
              const newItems = items.filter((_, i) => i !== index);
              onChange(newItems);
            }}
            disabled={disabled}
          />
        ))
      )}

      {/* Grand Totals */}
      {items.length > 0 && (
        <>
          <Divider />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div>
              <Text type="secondary">Tổng combo:</Text>
              <Text strong style={{ marginLeft: 8 }}>
                {totals.totalComboCount}
              </Text>
            </div>
            <div>
              <Text type="secondary">Tổng SP:</Text>
              <Text strong style={{ marginLeft: 8 }}>
                {totals.totalProducts}
              </Text>
            </div>
            <div>
              <Text type="secondary">Tổng quà:</Text>
              <Text strong style={{ marginLeft: 8, color: "#fa8c16" }}>
                {totals.totalGifts}
              </Text>
            </div>
            <div>
              <Text type="secondary">Tổng giảm giá:</Text>
              <Text style={{ marginLeft: 8, color: "#ff4d4f" }}>
                -{formatMNT(totals.totalDiscount)}
              </Text>
            </div>
            <div>
              <Text type="secondary">Tổng cộng:</Text>
              <Text
                strong
                style={{ marginLeft: 8, fontSize: 18, color: "#1890ff" }}
              >
                {formatMNT(totals.totalSubtotal)}
              </Text>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Export helper functions
// ============================================================================

export { createOrderItemFromCombo };
export type {
  OrderItem,
  ProductVariantSelection,
  ProductAttribute,
  GiftSelection,
  OrderGiftMode,
};
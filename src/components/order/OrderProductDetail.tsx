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
 * Quà tặng hỗ trợ:
 * - Random: Shop tự chọn quà (isRandom = true)
 * - Customer chooses: Khách chọn cụ thể (isRandom = false)
 *
 * Quy tắc:
 * - OrderItem đại diện cho Combo, không phải Product
 * - comboQuantity = số combo khách mua
 * - packageQuantity = số sản phẩm trong 1 combo
 * - giftQuantity = số quà trong 1 combo
 * - Validation: sum(details.quantity) == comboQuantity * packageQuantity
 * - Validation: sum(gifts.quantity) == comboQuantity * giftQuantity
 * - details luôn tồn tại (không để details=[])
 * - gifts luôn tồn tại (không để gifts=[])
 * - variantId resolve 1 lần, dùng mãi mãi
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, InputNumber, Button, Space, Tag, Select, Typography, Divider, Alert, Radio, message } from "antd";
import { PlusOutlined, DeleteOutlined, ShoppingOutlined, GiftOutlined, QuestionOutlined } from "@ant-design/icons";
import type { SelectProps } from "antd";
import type {
  ProductWithVariants,
  ProductVariant,
  VariantOptionWithValues,
  OrderItem,
  ProductVariantSelection,
  ProductAttribute,
  OrderGiftSelection,
} from "@/types/variant";
import { resolveVariantId } from "@/types/variant";

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
 */
function createOrderItemFromCombo(
  combo: {
    _id: string;
    code: string;
    name: string;
    packageSize: number;
    giftQuantity: number;
    sellingPrice: number;
    productId: string;
  }
): OrderItem {
  // Tạo details mặc định: 1 dòng với tất cả sản phẩm, không có variant
  const defaultDetail: ProductVariantSelection = {
    quantity: combo.packageSize, // 1 combo = packageSize sản phẩm
    attributes: [],
  };

  // Tạo gifts mặc định: random nếu có giftQuantity
  const defaultGifts: OrderGiftSelection[] = combo.giftQuantity > 0
    ? [{ quantity: combo.giftQuantity, isRandom: true }]
    : [];

  return {
    _tempId: generateTempId(),
    comboId: combo._id,
    productId: combo.productId,
    comboName: combo.name,
    comboCode: combo.code,
    comboQuantity: 1, // Mặc định mua 1 combo
    packageQuantity: combo.packageSize,
    giftQuantity: combo.giftQuantity,
    sellingPrice: combo.sellingPrice,
    discount: 0,
    subtotal: combo.sellingPrice,
    details: [defaultDetail],
    gifts: defaultGifts,
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

function sumGiftsQuantity(gifts: OrderGiftSelection[]): number {
  return gifts.reduce((sum, g) => sum + g.quantity, 0);
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

  // Initialize selected attributes from detail
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

      // Sort attributes by option order
      if (product?.variantOptions) {
        newAttributes.sort((a, b) => {
          const optA = product.variantOptions?.find((o) => o._id === a.optionId);
          const optB = product.variantOptions?.find((o) => o._id === b.optionId);
          return (optA?.sortOrder || 0) - (optB?.sortOrder || 0);
        });
      }

      // Resolve variantId từ attributes
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

  // Build select options for each variant option
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

      {/* Variant Selectors - Chỉ render khi có variants */}
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

      {/* Display string */}
      {displayString && (
        <Tag color="blue" style={{ margin: 0 }}>
          {displayString}
        </Tag>
      )}

      {/* VariantId badge */}
      {detail.variantId && (
        <Tag color="green" style={{ fontSize: 10 }}>
          SKU resolved
        </Tag>
      )}

      {/* Quantity */}
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

      {/* Delete Button */}
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
// Gift Selection Component
// ============================================================================

interface GiftSelectionProps {
  gifts: OrderGiftSelection[];
  totalGiftRequired: number;
  onChange: (gifts: OrderGiftSelection[]) => void;
  disabled?: boolean;
}

function GiftSelection({ gifts, totalGiftRequired, onChange, disabled }: GiftSelectionProps) {
  const [selectionMode, setSelectionMode] = useState<"random" | "choose">(() => {
    // Check if currently in random mode
    if (gifts.length === 1 && gifts[0].isRandom) {
      return "random";
    }
    return "choose";
  });

  const handleModeChange = useCallback((e: any) => {
    const mode = e.target.value;
    setSelectionMode(mode);

    if (mode === "random") {
      // Switch to random mode
      onChange([{ quantity: totalGiftRequired, isRandom: true }]);
    } else {
      // Switch to customer choose mode - initialize with empty selections
      const newGifts: OrderGiftSelection[] = [];
      for (let i = 0; i < totalGiftRequired; i++) {
        newGifts.push({ quantity: 1, isRandom: false });
      }
      onChange(newGifts);
    }
  }, [totalGiftRequired, onChange]);

  const handleAddGift = useCallback(() => {
    onChange([...gifts, { quantity: 1, isRandom: false }]);
  }, [gifts, onChange]);

  const handleUpdateGift = useCallback((index: number, gift: OrderGiftSelection) => {
    const newGifts = [...gifts];
    newGifts[index] = gift;
    onChange(newGifts);
  }, [gifts, onChange]);

  const handleDeleteGift = useCallback((index: number) => {
    const newGifts = gifts.filter((_, i) => i !== index);
    onChange(newGifts);
  }, [gifts, onChange]);

  const handleRandomQuantityChange = useCallback((qty: number | null) => {
    onChange([{ quantity: qty || totalGiftRequired, isRandom: true }]);
  }, [totalGiftRequired, onChange]);

  // Calculate current total
  const currentTotal = sumGiftsQuantity(gifts);
  const isValid = currentTotal === totalGiftRequired;

  if (totalGiftRequired === 0) {
    return (
      <div style={{ textAlign: "center", padding: 16, color: "#999" }}>
        Combo này không có quà tặng
      </div>
    );
  }

  return (
    <div style={{ padding: "12px", background: "#fffbf0", borderRadius: 8 }}>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <Space>
          <Text strong>Quà tặng ({totalGiftRequired})</Text>
          <Tag color={isValid ? "green" : "red"}>
            {currentTotal} / {totalGiftRequired}
          </Tag>
        </Space>
      </div>

      {/* Validation Alert */}
      {!isValid && currentTotal > 0 && (
        <Alert
          type="warning"
          message={`Tổng SL quà (${currentTotal}) phải bằng ${totalGiftRequired}`}
          style={{ marginBottom: 12 }}
          showIcon
        />
      )}

      {/* Mode Selection */}
      <Radio.Group
        value={selectionMode}
        onChange={handleModeChange}
        style={{ marginBottom: 16 }}
        disabled={disabled}
      >
        <Space direction="vertical">
          <Radio value="random">
            <Space>
              <QuestionOutlined />
              <Text>Để shop chọn ngẫu nhiên</Text>
            </Space>
          </Radio>
          <Radio value="choose">
            <Space>
              <GiftOutlined />
              <Text>Khách chọn</Text>
            </Space>
          </Radio>
        </Space>
      </Radio.Group>

      {/* Random Mode */}
      {selectionMode === "random" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Text>Số lượng:</Text>
          <InputNumber
            min={1}
            max={totalGiftRequired}
            value={gifts[0]?.quantity || totalGiftRequired}
            onChange={handleRandomQuantityChange}
            disabled={disabled}
          />
          <Text type="secondary">quà ngẫu nhiên</Text>
        </div>
      )}

      {/* Customer Choose Mode */}
      {selectionMode === "choose" && (
        <>
          {gifts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "12px", border: "1px dashed #fa8c16", borderRadius: 4 }}>
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
              {gifts.map((gift, index) => (
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
                  <Text style={{ minWidth: 100 }}>
                    {gift.giftProductName || `Quà #${index + 1}`}
                  </Text>
                  <Select
                    placeholder="Chọn sản phẩm"
                    value={gift.giftProductId}
                    onChange={(value, option) => {
                      handleUpdateGift(index, {
                        ...gift,
                        giftProductId: value as string,
                        giftProductName: (option as { label?: string })?.label,
                      });
                    }}
                    options={[] as { label: string; value: string }[]}
                    style={{ minWidth: 150 }}
                    size="small"
                    disabled={disabled}
                    allowClear
                  />
                  <div style={{ minWidth: 60 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      SL
                    </Text>
                    <InputNumber
                      min={1}
                      value={gift.quantity}
                      onChange={(qty) => {
                        handleUpdateGift(index, { ...gift, quantity: qty || 1 });
                      }}
                      style={{ width: "100%" }}
                      size="small"
                      disabled={disabled}
                    />
                  </div>
                  {!disabled && gifts.length > 1 && (
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
                  Thêm quà
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

  // Tính tổng số sản phẩm cần có: comboQuantity * packageQuantity
  const totalProductsRequired = item.comboQuantity * item.packageQuantity;

  // Tính tổng số quà cần có: comboQuantity * giftQuantity
  const totalGiftsRequired = item.comboQuantity * item.giftQuantity;

  // Validation: sum(details.quantity) == comboQuantity * packageQuantity
  const totalDetailsQuantity = useMemo(
    () => sumDetailsQuantity(item.details),
    [item.details]
  );

  const isValidDetails = totalDetailsQuantity === 0 || totalDetailsQuantity === totalProductsRequired;

  // Add new detail
  const handleAddDetail = useCallback(() => {
    const newDetail: ProductVariantSelection = {
      quantity: 1,
      attributes: [],
    };
    onUpdate({ ...item, details: [...item.details, newDetail] });
  }, [item, onUpdate]);

  // Update detail
  const handleUpdateDetail = useCallback(
    (index: number, detail: ProductVariantSelection) => {
      const newDetails = [...item.details];
      newDetails[index] = detail;
      onUpdate({ ...item, details: newDetails });
    },
    [item, onUpdate]
  );

  // Delete detail
  const handleDeleteDetail = useCallback(
    (index: number) => {
      const newDetails = item.details.filter((_, i) => i !== index);
      onUpdate({ ...item, details: newDetails });
    },
    [item, onUpdate]
  );

  // Update gifts
  const handleUpdateGifts = useCallback((gifts: OrderGiftSelection[]) => {
    onUpdate({ ...item, gifts });
  }, [item, onUpdate]);

  // Update comboQuantity
  const handleComboQuantityChange = useCallback(
    (qty: number | null) => {
      const q = qty || 1;
      const newSubtotal = item.sellingPrice * q - item.discount;
      onUpdate({ ...item, comboQuantity: q, subtotal: newSubtotal });
    },
    [item, onUpdate]
  );

  // Update sellingPrice
  const handlePriceChange = useCallback(
    (price: number | null) => {
      const p = price || 0;
      const newSubtotal = p * item.comboQuantity - item.discount;
      onUpdate({ ...item, sellingPrice: p, subtotal: newSubtotal });
    },
    [item, onUpdate]
  );

  // Update discount
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
        {/* Combo Quantity */}
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

        {/* Package Quantity (readonly - từ combo) */}
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

        {/* Gift Quantity (readonly - từ combo) */}
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

        {/* Selling Price */}
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

        {/* Discount */}
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

        {/* Subtotal */}
        <div style={{ minWidth: 120 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Thành tiền
          </Text>
          <Text strong style={{ display: "block", color: "#1890ff", fontSize: 16 }}>
            {item.subtotal.toLocaleString("vi-VN")} đ
          </Text>
        </div>
      </div>

      {/* Variant Details Section */}
      <Divider style={{ margin: "12px 0" }}>
        <Space>
          <Text strong>Chi tiết sản phẩm</Text>
          <Tag color={isValidDetails ? "green" : "red"}>
            {totalDetailsQuantity} / {totalProductsRequired}
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ({item.comboQuantity} × {item.packageQuantity})
          </Text>
        </Space>
      </Divider>

      {/* Validation Alert */}
      {!isValidDetails && totalDetailsQuantity > 0 && (
        <Alert
          type="warning"
          message={`Tổng SL chi tiết (${totalDetailsQuantity}) phải bằng tổng sản phẩm (${totalProductsRequired})`}
          style={{ marginBottom: 8 }}
          showIcon
        />
      )}

      {/* Details List */}
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
        </Space>
      </Divider>

      <GiftSelection
        gifts={item.gifts}
        totalGiftRequired={totalGiftsRequired}
        onChange={handleUpdateGifts}
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
                -{totals.totalDiscount.toLocaleString("vi-VN")} đ
              </Text>
            </div>
            <div>
              <Text type="secondary">Tổng cộng:</Text>
              <Text
                strong
                style={{ marginLeft: 8, fontSize: 18, color: "#1890ff" }}
              >
                {totals.totalSubtotal.toLocaleString("vi-VN")} đ
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
  OrderGiftSelection,
};

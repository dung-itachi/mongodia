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
 * - Chọn biến thể từ danh sách biến thể có sẵn của sản phẩm
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

import { useState, useCallback, useMemo, useEffect } from "react";
import { Card, InputNumber, Button, Space, Tag, Select, Typography, Divider, Alert, Radio, Empty, List } from "antd";
import { PlusOutlined, DeleteOutlined, ShoppingOutlined, GiftOutlined, QuestionOutlined, AppstoreOutlined, UnorderedListOutlined } from "@ant-design/icons";
import type { RadioChangeEvent, SelectProps } from "antd";
import type {
  ProductWithVariants,
  OrderItem,
  ProductVariantSelection,
  ProductAttribute,
  GiftSelection,
  OrderGiftMode,
  ProductVariant,
} from "@/types/variant";
import { resolveVariantId, validateOrderItem } from "@/types/variant";
import { useGiftList, type GiftListItem } from "@/hooks/useGifts";
import { formatMNT } from "@/lib/format";
import { useMessage } from "@/contexts/MessageContext";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

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
  /** Callback khi items thay đổi (hỗ trợ functional updater để tránh stale closure) */
  onChange: (items: OrderItem[] | ((prev: OrderItem[]) => OrderItem[])) => void;
  /** Disabled state */
  disabled?: boolean;
}

interface SelectedAttributes {
  [optionId: string]: string | undefined;
}

// ============================================================================
// Variant Selection Mode Enum
// ============================================================================

type VariantSelectionMode = "dropdown" | "preset";

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
    productName?: string;
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

/**
 * Get variant display string from ProductVariant object
 */
function getVariantFromVariantObject(
  product: ProductWithVariants,
  variant: ProductVariant
): string {
  if (!product.variantOptions || !variant.variantValues || variant.variantValues.length === 0) {
    return variant.sku || "Unknown";
  }

  return variant.variantValues
    .map((vv) => {
      const valueId = typeof vv === "string" ? vv : vv._id;
      const valueObj = typeof vv === "string" ? null : vv;

      // Find option and value
      for (const opt of product.variantOptions || []) {
        const foundValue = opt.values.find((v) => v._id === valueId);
        if (foundValue) {
          return `${opt.name}: ${foundValue.name}`;
        }
      }
      return valueObj?.name || valueId;
    })
    .filter(Boolean)
    .join(" | ");
}

/**
 * Convert ProductVariant to attributes array
 */
function variantToAttributes(product: ProductWithVariants, variant: ProductVariant): ProductAttribute[] {
  const attributes: ProductAttribute[] = [];

  if (!product.variantOptions || !variant.variantValues) return attributes;

  for (const vv of variant.variantValues) {
    const valueId = typeof vv === "string" ? vv : vv._id;
    const valueName = typeof vv === "string" ? "" : vv.name;

    for (const opt of product.variantOptions) {
      const foundValue = opt.values.find((v) => v._id === valueId);
      if (foundValue) {
        attributes.push({
          optionId: opt._id,
          valueId: foundValue._id,
          optionName: opt.name,
          valueName: foundValue.name,
        });
        break;
      }
    }
  }

  return attributes;
}

function sumDetailsQuantity(details: ProductVariantSelection[]): number {
  return details.reduce((sum, d) => sum + d.quantity, 0);
}

function sumGiftSelectionsQuantity(selections: GiftSelection[]): number {
  return selections.reduce((sum, g) => sum + g.quantity, 0);
}

// ============================================================================
// Variant Detail Row Component (Enhanced with Preset Variants)
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
  const lang = useLanguageStore((s) => s.language);
  const variantOptions = product?.variantOptions || [];
  const hasVariants = variantOptions.length > 0;
  const hasPresetVariants = (product?.variants || []).length > 0;

  const [selectedAttributes, setSelectedAttributes] = useState<SelectedAttributes>(() => {
    const initial: SelectedAttributes = {};
    detail.attributes.forEach((attr) => {
      initial[attr.optionId] = attr.valueId;
    });
    return initial;
  });

  // Selection mode: dropdown vs preset variant
  const [selectionMode, setSelectionMode] = useState<VariantSelectionMode>(() => {
    // If detail has a variantId, use preset mode
    if (detail.variantId) return "preset";
    // If product has preset variants, default to preset
    if (hasPresetVariants) return "preset";
    return "dropdown";
  });

  const [selectedPresetVariantId, setSelectedPresetVariantId] = useState<string | undefined>(() => {
    // Find matching preset variant from attributes
    if (product?.variants && detail.attributes.length > 0) {
      const resolvedId = resolveVariantId(product.variants, detail.attributes);
      return resolvedId || undefined;
    }
    return detail.variantId;
  });

  const displayString = useMemo(
    () => (product ? getVariantDisplayString(product, detail.attributes) : ""),
    [product, detail.attributes]
  );

  // Auto-select first variant when product has exactly 1 variant and no variant is selected yet
  useEffect(() => {
    if (!product?.variants || product.variants.length !== 1) return;
    if (detail.attributes.length > 0 || detail.variantId) return; // Already has selection

    const firstVariant = product.variants[0];
    const attributes = variantToAttributes(product, firstVariant);
    const resolvedId = resolveVariantId(product.variants, attributes);
    onUpdate({
      ...detail,
      variantId: resolvedId || firstVariant._id,
      attributes,
    });
  }, [product, detail, onUpdate]);

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

  // Preset variant options
  const presetVariantOptions = useMemo(() => {
    if (!product?.variants) return [];
    return product.variants.map((v) => ({
      label: (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontWeight: 500 }}>{v.sku}</span>
          <span style={{ fontSize: 11, color: "#999" }}>
            {getVariantFromVariantObject(product, v)}
          </span>
        </div>
      ),
      value: v._id,
      variant: v,
    }));
  }, [product]);

  const handlePresetVariantChange = useCallback(
    (variantId: string) => {
      setSelectedPresetVariantId(variantId);
      const variant = product?.variants?.find((v) => v._id === variantId);
      if (variant && product) {
        const attributes = variantToAttributes(product, variant);
        const resolvedId = resolveVariantId(product.variants || [], attributes);
        onUpdate({
          ...detail,
          variantId,
          attributes,
        });
      }
    },
    [detail, product, onUpdate]
  );

  // If product has no variants, show simple quantity only
  if (!hasVariants) {
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
        }}
      >
        <Text type="secondary" style={{ minWidth: 24 }}>
          #{detailIndex + 1}
        </Text>
        <Text type="secondary">{t("Sản phẩm không có biến thể", lang)}</Text>
        <div style={{ minWidth: 80, marginLeft: "auto" }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {t("SL", lang)}
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "8px 12px",
        background: "#fafafa",
        borderRadius: 4,
        marginBottom: 8,
        border: "1px solid #e8e8e8",
      }}
    >
      {/* Header Row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Text type="secondary" style={{ minWidth: 24 }}>
          #{detailIndex + 1}
        </Text>

        {/* Selection Mode Toggle */}
        {hasPresetVariants && !disabled && (
          <Radio.Group
            value={selectionMode}
            onChange={(e) => {
              setSelectionMode(e.target.value);
              if (e.target.value === "preset" && presetVariantOptions.length > 0) {
                handlePresetVariantChange(presetVariantOptions[0].value);
              }
            }}
            size="small"
          >
            <Radio.Button value="preset">
              <AppstoreOutlined /> {t("Biến thể có sẵn", lang)}
            </Radio.Button>
            <Radio.Button value="dropdown">
              <UnorderedListOutlined /> {t("Chọn riêng", lang)}
            </Radio.Button>
          </Radio.Group>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {t("SL", lang)}
          </Text>
          <InputNumber
            min={1}
            value={detail.quantity}
            onChange={handleQuantityChange}
            style={{ width: 80 }}
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

      {/* Preset Variant Selection */}
      {selectionMode === "preset" && hasPresetVariants && (
        <div>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: "block" }}>
            {t("Chọn biến thể", lang)}:
          </Text>
          <Select
            placeholder={t("Chọn biến thể", lang)}
            value={selectedPresetVariantId}
            onChange={handlePresetVariantChange}
            options={presetVariantOptions}
            style={{ width: "100%" }}
            size="small"
            disabled={disabled}
            showSearch
            optionFilterProp="label"
          />
          {detail.variantId && (
            <Tag color="green" style={{ marginTop: 4 }}>
              {t("SKU", lang)}: {product?.variants?.find((v) => v._id === detail.variantId)?.sku || detail.variantId}
            </Tag>
          )}
        </div>
      )}

      {/* Dropdown Selection Mode */}
      {selectionMode === "dropdown" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {variantOptions.map((option) => (
            <div key={option._id} style={{ minWidth: 120 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {option.name}
              </Text>
              <Select
                placeholder={`${t("Chọn", lang)} ${option.name}`}
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

      {/* Display Selected Attributes */}
      {displayString && selectionMode === "dropdown" && (
        <Tag color="blue" style={{ alignSelf: "flex-start" }}>
          {displayString}
        </Tag>
      )}

      {/* Variant Resolved Indicator */}
      {detail.variantId && (
        <Tag color="green" style={{ fontSize: 10, alignSelf: "flex-start" }}>
          ✓ {t("Đã resolve SKU", lang)}
        </Tag>
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
 * Quà tặng (collapsible):
 * - Mặc định: hiện header + nút "Thêm quà tặng"
 * - Click expand: hiện form nhập SL + chọn ngẫu nhiên/chi tiết + danh sách chi tiết
 * - RANDOM: Shop tự chọn quà
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
  const lang = useLanguageStore((s) => s.language);

  // Mode cho phần thêm quà chi tiết (mặc định = CUSTOMER_SELECTED)
  const [selectedMode, setSelectedMode] = useState<"RANDOM" | "CUSTOMER_SELECTED">("RANDOM");
  // showDetailRows: chỉ mở phần chọn quà khi chọn "Quà chi tiết"
  const [showDetailRows, setShowDetailRows] = useState(false);
  // Số lượng quà muốn thêm
  const [extraQty, setExtraQty] = useState(1);

  // Sync selectedMode với giftMode (dùng khi combo có quà)
  useEffect(() => {
    setSelectedMode(giftMode);
    if (giftMode === "RANDOM") {
      setShowDetailRows(false);
    }
  }, [giftMode]);

  // showModeSelector: chỉ mở khi click "Thêm quà" hoặc đã có giftSelections hoặc combo có quà
  const [showModeSelector, setShowModeSelector] = useState(false);

  const handleClickAddGift = useCallback(() => {
    setShowModeSelector(true);
    setSelectedMode("RANDOM");
    setShowDetailRows(false);
    onModeChange("RANDOM");
  }, [onModeChange]);

  // Nút "Thêm quà" chỉ hiện khi combo không có quà (totalGiftRequired === 0) và chưa mở selector
  const showAddGiftButton = totalGiftRequired === 0 && !disabled && !showModeSelector;
  // 2 lựa chọn chỉ hiện khi đã click "Thêm quà" hoặc combo có quà
  const showModeSelectorFlag = (showModeSelector || totalGiftRequired > 0) && !disabled;

  useEffect(() => {
    if (!showDetailRows) return;
    if (selectedMode === "CUSTOMER_SELECTED" && giftSelections.length === 0) {
      const required = Math.max(0, totalGiftRequired);
      const padded: GiftSelection[] = [];
      for (let i = 0; i < required; i++) {
        padded.push({ giftProductId: "", giftProductName: "", quantity: 1 });
      }
      onSelectionsChange(padded);
    }
  }, [showDetailRows]);

  const handleModeChange = useCallback(
    (e: RadioChangeEvent) => {
      const mode = e.target.value as OrderGiftMode;
      console.log("[GiftSelectionSection.handleModeChange]", { prev: giftMode, next: mode, totalGiftRequired });
      setSelectedMode(mode);
      onModeChange(mode);
      if (mode === "RANDOM") {
        setShowDetailRows(false);
        onSelectionsChange([]);
      } else {
        setShowDetailRows(true);
        const required = Math.max(0, totalGiftRequired);
        const padded: GiftSelection[] = [];
        for (let i = 0; i < required; i++) {
          padded.push({ giftProductId: "", giftProductName: "", quantity: 1 });
        }
        onSelectionsChange(padded);
      }
    },
    [onModeChange, onSelectionsChange, totalGiftRequired, giftMode]
  );

  const handleAddExtraGift = useCallback(() => {
    onSelectionsChange([
      ...giftSelections,
      { giftProductId: "", giftProductName: "", quantity: extraQty },
    ]);
  }, [giftSelections, extraQty, onSelectionsChange]);

  const handleUpdateGift = useCallback(
    (index: number, gift: GiftSelection) => {
      const newSelections = [...giftSelections];
      newSelections[index] = gift;
      console.log("[GiftSelectionSection.handleUpdateGift]", { index, gift, totalSelections: newSelections.length, allFilled: newSelections.every(g => g.giftProductId) });
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

  // Fetch danh sách quà active từ Gift API
  const { data: giftsData, isLoading: isLoadingGifts } = useGiftList({
    isActive: true,
  });
  const gifts: GiftListItem[] = giftsData?.items ?? [];

  const giftOptions = useMemo(
    () =>
      gifts.map((g) => ({
        label: `${g.name} - ${t("Tồn kho", lang)}: ${g.stockQuantity}`,
        value: g._id,
        giftName: g.name,
      })),
    [gifts, lang]
  );

  const currentTotal = sumGiftSelectionsQuantity(giftSelections);
  const isValidComboGifts = currentTotal >= totalGiftRequired;

  // Label hiển thị trong header tag
  // modeTag: chỉ hiện khi đã thêm ít nhất 1 quà cụ thể
  const showModeTag = giftSelections.some(g => g.giftProductId) && !disabled;

  // Tổng số quà hiển thị: dùng giftQuantity đã bao gồm combo + extra
  // Chỉ cộng thêm khi CUSTOMER_SELECTED để hiển thị số dòng quà đã chọn
  const totalGiftsCount = selectedMode === "CUSTOMER_SELECTED" && giftSelections.length > 0
    ? giftSelections.reduce((sum, g) => sum + g.quantity, 0)
    : totalGiftRequired;

  return (
    <div style={{ padding: "12px", background: "#fffbf0", borderRadius: 8 }}>
      {/* Header */}
      <div style={{ marginBottom: 10 }}>
        <Space>
          <GiftOutlined style={{ color: "#fa8c16" }} />
          <Text strong>{t("Quà tặng", lang)}</Text>
          {/* Chỉ hiện "X quà" khi đã click Thêm quà */}
          {(showModeSelector || totalGiftsCount > 0) && (
            <Tag color="gold">{totalGiftsCount} {t("quà", lang)}</Tag>
          )}
          {showModeTag && (
            <Tag color={selectedMode === "RANDOM" ? "purple" : "blue"}>
              {selectedMode === "RANDOM" ? t("Shop tự chọn", lang) : t("Khách tự chọn", lang)}
            </Tag>
          )}
          {/* Nút "Thêm quà" - chỉ hiện khi combo không có quà và chưa mở selector */}
          {showAddGiftButton && (
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleClickAddGift}
              style={{ padding: "0 4px", height: "auto", color: "#fa8c16" }}
            >
              {t("Thêm quà", lang)}
            </Button>
          )}
        </Space>
      </div>

      {/* 2 lựa chọn: Quà ngẫu nhiên / Quà chi tiết - chỉ hiện khi đã click "Thêm quà" */}
      {showModeSelectorFlag && (
        <Radio.Group
          value={selectedMode}
          onChange={handleModeChange}
          style={{ marginBottom: 8 }}
        >
          <Space orientation="vertical">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Radio value="RANDOM" />
              <Text>{t("Quà ngẫu nhiên", lang)}</Text>
              {selectedMode === "RANDOM" && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{t("SL", lang)}:</Text>
                  <InputNumber
                    min={1}
                    value={extraQty}
                    onChange={(val) => setExtraQty(val ?? 1)}
                    style={{ width: 70 }}
                    size="small"
                  />
                  {extraQty > 1 && (
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={handleAddExtraGift}
                      style={{ background: "#fa8c16", borderColor: "#fa8c16" }}
                    />
                  )}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Radio value="CUSTOMER_SELECTED" />
              <Text>{t("Quà chi tiết", lang)}</Text>
              {selectedMode === "CUSTOMER_SELECTED" && !disabled && (
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleAddExtraGift}
                  style={{ padding: "0 4px", height: "auto", color: "#fa8c16" }}
                >
                  {t("Thêm", lang)}
                </Button>
              )}
            </div>
          </Space>
        </Radio.Group>
      )}

      {/* Chi tiết quà - chỉ hiện khi chọn "Quà chi tiết" */}
      {selectedMode === "CUSTOMER_SELECTED" && giftSelections.length > 0 && (
        <div style={{ marginLeft: 24, marginTop: 8 }}>
          {/* Combo gift detail rows */}
          {giftSelections.map((gift, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                padding: "6px 10px",
                background: "#f9f9f9",
                borderRadius: 4,
                marginBottom: 6,
                border: "1px solid #f0f0f0",
              }}
            >
              <Text type="secondary" style={{ fontSize: 12, minWidth: 16 }}>{idx + 1}.</Text>
              <Select
                placeholder={isLoadingGifts ? t("Đang tải...", lang) : t("Chọn sản phẩm", lang)}
                value={gift.giftProductId || undefined}
                onChange={(value, option) => {
                  handleUpdateGift(idx, {
                    giftProductId: value as string,
                    giftProductName: (option as { giftName?: string })?.giftName,
                    quantity: gift.quantity,
                  });
                }}
                options={giftOptions}
                style={{ minWidth: 160 }}
                size="small"
                disabled={disabled || isLoadingGifts}
                showSearch
                optionFilterProp="label"
              />
              <Text type="secondary" style={{ fontSize: 12 }}>{t("SL", lang)}:</Text>
              <InputNumber
                min={1}
                value={gift.quantity}
                onChange={(qty) => {
                  handleUpdateGift(idx, { ...gift, quantity: qty || 1 });
                }}
                style={{ width: 60 }}
                size="small"
                disabled={disabled}
              />
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => {
                  const newSelections = giftSelections.filter((_, i) => i !== idx);
                  onSelectionsChange(newSelections);
                }}
              />
            </div>
          ))}
        </div>
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
  onUpdate: (updater: (current: OrderItem) => OrderItem) => void;
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
  const lang = useLanguageStore((s) => s.language);
  const variantOptions = product?.variantOptions || [];
  const hasVariants = variantOptions.length > 0;
  const message = useMessage();

  // Tính tổng yêu cầu
  const totalProductsRequired = item.comboQuantity * item.packageQuantity;
  const totalGiftsRequired = item.comboQuantity * item.giftQuantity;

  // Validation tổng
  const validation = useMemo(() => validateOrderItem(item), [item]);
  const totalDetailsQuantity = sumDetailsQuantity(item.details);

  // Get available preset variants for display
  const availableVariants = product?.variants || [];
  const hasPresetVariants = availableVariants.length > 0;

  // Add new detail
  const handleAddDetail = useCallback(() => {
    const newDetail: ProductVariantSelection = {
      quantity: 1,
      attributes: [],
    };
    onUpdate((cur) => ({ ...cur, details: [...cur.details, newDetail] }));
  }, [onUpdate]);

  const handleUpdateDetail = useCallback(
    (index: number, detail: ProductVariantSelection) => {
      const combinationKey = detail.attributes.map((a) => a.valueId).sort().join(":");

      // Nếu không có attributes thì update bình thường
      if (!combinationKey) {
        onUpdate((cur) => {
          const newDetails = [...cur.details];
          newDetails[index] = detail;
          return { ...cur, details: newDetails };
        });
        return;
      }

      // Detect merge trước khi update (để hiện message 1 lần, không gọi side effect
      // bên trong updater — React có thể gọi updater nhiều lần trong Strict Mode/concurrent).
      const currentItem = item;
      const existingIndex = currentItem.details.findIndex(
        (existing, i) => i !== index && existing.attributes.map((a) => a.valueId).sort().join(":") === combinationKey
      );
      const willMerge = existingIndex >= 0;

      onUpdate((cur) => {
        const newDetails = [...cur.details];
        if (willMerge) {
          // Gộp: cộng quantity và xóa dòng hiện tại
          newDetails[existingIndex] = {
            ...newDetails[existingIndex],
            quantity: newDetails[existingIndex].quantity + detail.quantity,
          };
          // Xóa dòng hiện tại
          newDetails.splice(index, 1);
        } else {
          // Không trùng: update bình thường
          newDetails[index] = detail;
        }
        return { ...cur, details: newDetails };
      });

      // Side effect (toast) chạy SAU khi enqueue state update — không nằm trong updater.
      if (willMerge) {
        void message.success(t("Đã gộp với dòng biến thể cùng loại.", lang));
      }
    },
    [onUpdate, message, lang, item]
  );

  const handleDeleteDetail = useCallback(
    (index: number) => {
      onUpdate((cur) => ({
        ...cur,
        details: cur.details.filter((_, i) => i !== index),
      }));
    },
    [onUpdate]
  );

  // Gifts handlers — dùng functional updater (cur) để đọc item mới nhất
  // từ parent state, tránh stale closure khi user chọn
  // giftMode + giftSelections liên tiếp trong cùng 1 tick.
  const handleGiftModeChange = useCallback(
    (mode: OrderGiftMode) => {
      console.log("[OrderItemRow.handleGiftModeChange]", { newMode: mode });
      onUpdate((cur) => ({ ...cur, giftMode: mode }));
    },
    [onUpdate]
  );

  const handleGiftSelectionsChange = useCallback(
    (selections: GiftSelection[]) => {
      console.log("[OrderItemRow.handleGiftSelectionsChange]", { count: selections.length, sample: selections[0] });
      onUpdate((cur) => ({ ...cur, giftSelections: selections }));
    },
    [onUpdate]
  );

  // Update comboQuantity
  const handleComboQuantityChange = useCallback(
    (qty: number | null) => {
      const q = qty || 1;
      onUpdate((cur) => {
        const newSubtotal = cur.sellingPrice * q - cur.discount;
        return { ...cur, comboQuantity: q, subtotal: newSubtotal };
      });
    },
    [onUpdate]
  );

  const handlePriceChange = useCallback(
    (price: number | null) => {
      const p = price || 0;
      onUpdate((cur) => {
        const newSubtotal = p * cur.comboQuantity - cur.discount;
        return { ...cur, sellingPrice: p, subtotal: newSubtotal };
      });
    },
    [onUpdate]
  );

  const handleDiscountChange = useCallback(
    (discount: number | null) => {
      const d = discount || 0;
      onUpdate((cur) => {
        const newSubtotal = cur.sellingPrice * cur.comboQuantity - d;
        return { ...cur, discount: d, subtotal: newSubtotal };
      });
    },
    [onUpdate]
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
            <Tag color="orange">{variantOptions.length} {t("thuộc tính", lang)}</Tag>
          )}
          {!validation.isValid && (
            <Tag color="red">{t("Lỗi validation", lang)}</Tag>
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
            {t("Số combo", lang)}
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
            {t("SP/Combo", lang)}
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
            {t("Quà/Combo", lang)}
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
            {t("Giá combo", lang)}
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
            {t("Giảm giá", lang)}
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
            {t("Thành tiền", lang)}
          </Text>
          <Text strong style={{ display: "block", color: "#1890ff", fontSize: 16 }}>
            {formatMNT(item.subtotal)}
          </Text>
        </div>
      </div>

      {/* Variant Summary - Show available variants */}
      {hasVariants && hasPresetVariants && (
        <div
          style={{
            padding: "8px 12px",
            background: "#f0f9ff",
            borderRadius: 4,
            marginBottom: 12,
            border: "1px solid #91d5ff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Text strong style={{ fontSize: 12, color: "#1890ff" }}>
              {t("Biến thể có sẵn của sản phẩm", lang)}:
            </Text>
            <Tag color="blue">{availableVariants.length} {t("biến thể", lang)}</Tag>
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {availableVariants.slice(0, 6).map((v) => (
              <Tag key={v._id} style={{ fontSize: 11 }}>
                {v.sku}
              </Tag>
            ))}
            {availableVariants.length > 6 && (
              <Tag style={{ fontSize: 11 }}>+{availableVariants.length - 6} {t("nữa", lang)}</Tag>
            )}
          </div>
        </div>
      )}

      {/* Variant Details Section */}
      <Divider style={{ margin: "12px 0" }}>
        <Space>
          <Text strong>{t("Chi tiết sản phẩm", lang)}</Text>
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
          title={t(validation.detailsError, lang)}
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
          {t("Chưa có chi tiết biến thể", lang)}
          {!disabled && (
            <Button
              type="link"
              onClick={handleAddDetail}
              style={{ marginLeft: 8 }}
            >
              {t("Thêm chi tiết", lang)}
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
              {t("Thêm dòng biến thể", lang)}
            </Button>
          )}
        </>
      )}

      {/* Gifts Section */}
      <Divider style={{ margin: "16px 0 12px" }}>
        <Space>
          <GiftOutlined />
          <Text strong>{t("Quà tặng", lang)}</Text>
          <Tag color="gold">{totalGiftsRequired} {t("quà", lang)}</Tag>
          {totalGiftsRequired > 0 && (
            item.giftMode === "RANDOM" ? (
              <Tag color="purple">{t("Shop tự chọn", lang)}</Tag>
            ) : (
              <Tag color="orange">{t("Khách chọn", lang)}</Tag>
            )
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
  const lang = useLanguageStore((s) => s.language);
  const variantOptions = product?.variantOptions || [];
  const hasVariants = variantOptions.length > 0;
  const message = useMessage();

  // Functional updater — cha truyền setItems (hỗ trợ functional updater).
  // Khi OrderItemRow gọi onUpdate(updater), ta gọi setItems(prev => [...prev, idx, updater(prev[idx])])
  // để luôn lấy items mới nhất, tránh stale closure.
  const handleItemChange = useCallback(
    (index: number, updater: (current: OrderItem) => OrderItem) => {
      onChange((prev) => {
        const newItems = [...prev];
        newItems[index] = updater(prev[index]);
        return newItems;
      });
    },
    [onChange]
  );

  // Calculate totals
  // Tổng quà = tổng SL từ giftSelections (CUSTOMER_SELECTED) hoặc giftQuantity (RANDOM)
  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const itemGiftQty = item.giftMode === "CUSTOMER_SELECTED"
          ? (item.giftSelections || []).reduce((sum, g) => sum + (g.quantity || 0), 0)
          : item.comboQuantity * item.giftQuantity;
        return {
          totalComboCount: acc.totalComboCount + item.comboQuantity,
          totalProducts: acc.totalProducts + item.comboQuantity * item.packageQuantity,
          totalGifts: acc.totalGifts + itemGiftQty,
          totalSubtotal: acc.totalSubtotal + item.subtotal,
          totalDiscount: acc.totalDiscount + item.discount,
        };
      },
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
                  {variantOptions.length} {t("thuộc tính", lang)}:{" "}
                  {variantOptions.map((o) => o.name).join(", ")}
                </Tag>
              )}
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          {hasVariants ? (
            <Text type="secondary">
              {t("Sale nhập chi tiết biến thể cho mỗi sản phẩm", lang)}
            </Text>
          ) : (
            <Text type="secondary">
              {t("Sản phẩm không có biến thể - Sale nhập số lượng tổng", lang)}
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
            <div>{t("Chưa có combo nào", lang)}</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              {t("Chọn combo để thêm vào đơn hàng", lang)}
            </div>
          </div>
        </Card>
      ) : (
        items.map((item, index) => (
          <OrderItemRow
            key={item._tempId || index}
            item={item}
            product={product ?? null}
            onUpdate={(updater) => handleItemChange(index, updater)}
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
              <Text type="secondary">{t("Tổng combo", lang)}:</Text>
              <Text strong style={{ marginLeft: 8 }}>
                {totals.totalComboCount}
              </Text>
            </div>
            <div>
              <Text type="secondary">{t("Tổng SP", lang)}:</Text>
              <Text strong style={{ marginLeft: 8 }}>
                {totals.totalProducts}
              </Text>
            </div>
            <div>
              <Text type="secondary">{t("Tổng quà", lang)}:</Text>
              <Text strong style={{ marginLeft: 8, color: "#fa8c16" }}>
                {totals.totalGifts}
              </Text>
            </div>
            <div>
              <Text type="secondary">{t("Tổng giảm giá", lang)}:</Text>
              <Text style={{ marginLeft: 8, color: "#ff4d4f" }}>
                -{formatMNT(totals.totalDiscount)}
              </Text>
            </div>
            <div>
              <Text type="secondary">{t("Tổng cộng", lang)}:</Text>
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
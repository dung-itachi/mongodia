/**
 * ==================================================
 * VARIANT TYPES
 * ==================================================
 *
 * Sprint 8.x - Generic Variant Support
 *
 * Types cho VariantOption, VariantValue và Product Variant.
 * Dùng chung cho Order Form và Product Management.
 */

import type { Types } from "mongoose";

// ============================================================================
// VariantOption
// ============================================================================

export interface VariantOption {
  _id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface VariantOptionListItem extends VariantOption {}

// ============================================================================
// VariantValue
// ============================================================================

export interface VariantValue {
  _id: string;
  code: string;
  name: string;
  variantOptionId: string | VariantOption;
  sortOrder: number;
  isActive: boolean;
}

export interface VariantValueListItem extends VariantValue {}

// ============================================================================
// VariantOption với Values (for UI rendering)
// ============================================================================

export interface VariantOptionWithValues extends VariantOption {
  values: VariantValueListItem[];
}

// ============================================================================
// ProductVariant (reused from existing model)
// ============================================================================

export interface ProductVariant {
  _id: string;
  productId: string | Types.ObjectId;
  sku: string;
  barcode?: string;
  image?: string;
  variantValues: (string | VariantValue)[];
  price: number;
  cost?: number;
  weight?: number;
  sortOrder?: number;
  isActive: boolean;
}

// ============================================================================
// Product với VariantOptions (for UI rendering)
// ============================================================================

export interface ProductWithVariants {
  _id: string;
  code: string;
  name: string;
  categoryId?: string;
  image?: string;
  description?: string;
  isActive: boolean;
  // Variant options với values
  variantOptions?: VariantOptionWithValues[];
  // Cached variants for lookup
  variants?: ProductVariant[];
}

// ============================================================================
// Product Attribute (for Order Item - Sprint 8.x)
// ============================================================================

/**
 * Một thuộc tính của sản phẩm trong đơn hàng.
 * VD: { optionId: "color_id", valueId: "black_id" }
 */
export interface ProductAttribute {
  optionId: string;
  valueId: string;
}

// ============================================================================
// Product Variant Selection (Sprint 8.x)
// ============================================================================

/**
 * Chi tiết variant trong OrderItem.
 * Lưu variantId để không phải query lại khi xuất kho.
 *
 * Ví dụ: Combo "3 Hộp Thuốc Nhuộm Tóc", khách mua 2 combo
 * - comboQuantity = 2
 * - packageQuantity = 3 (mỗi combo có 3 hộng)
 * - totalProducts = 2 * 3 = 6 hộng
 *
 * details:
 * - details[0]: quantity=4, variantId="black_xl_id", attributes=[]
 * - details[1]: quantity=2, variantId="brown_m_id", attributes=[]
 */
export interface ProductVariantSelection {
  /** Số lượng sản phẩm cho combination này */
  quantity: number;
  /** Variant ID đã resolve (resolve 1 lần, dùng mãi mãi) */
  variantId?: string;
  /** Các thuộc tính đã chọn (empty array = không có variant) */
  attributes: ProductAttribute[];
}

// ============================================================================
// Order Gift Selection (Sprint 8.x)
// ============================================================================

/**
 * Chi tiết quà tặng trong OrderItem.
 * Hỗ trợ 2 chế độ:
 * - Random: Shop tự chọn quà (isRandom = true)
 * - Customer chooses: Khách chọn cụ thể (isRandom = false)
 *
 * Ví dụ:
 * - Khách không chọn (để shop quyết định):
 *   [{ quantity: 2, isRandom: true }]
 *
 * - Khách chọn 1 dầu, 1 khăn:
 *   [
 *     { giftProductId: "oil_id", quantity: 1, isRandom: false },
 *     { giftProductId: "towel_id", quantity: 1, isRandom: false }
 *   ]
 *
 * Validation: sum(gifts.quantity) == giftQuantity (từ combo)
 */
export interface OrderGiftSelection {
  /** Product ID của quà (null nếu random) */
  giftProductId?: string;
  /** Tên sản phẩm quà (snapshot) */
  giftProductName?: string;
  /** Số lượng quà */
  quantity: number;
  /** Shop tự chọn ngẫu nhiên */
  isRandom: boolean;
}

// ============================================================================
// Order Item (Sprint 8.x)
// ============================================================================

/**
 * OrderItem đại diện cho một Combo mà khách mua.
 *
 * Ví dụ:
 * - Combo "3 Hộp Thuốc Nhuộm Tóc + 2 Quà"
 * - comboQuantity: 2 (mua 2 combo)
 * - packageQuantity: 3 (mỗi combo có 3 hộng)
 * - giftQuantity: 2 (mỗi combo kèm 2 quà)
 * - totalProducts: 2 * 3 = 6 hộng
 * - totalGifts: 2 * 2 = 4 quà
 * - sellingPrice: 350000 (giá 1 combo)
 * - details: [
 *     { quantity: 4, variantId: "black_id", attributes: [] },
 *     { quantity: 2, variantId: "brown_id", attributes: [] }
 *   ]
 * - gifts: [
 *     { giftProductId: "oil_id", giftProductName: "Dầu Gội", quantity: 1, isRandom: false },
 *     { giftProductId: "towel_id", giftProductName: "Khăn", quantity: 1, isRandom: false }
 *   ]
 *   hoặc
 * - gifts: [
 *     { quantity: 2, isRandom: true }
 *   ]
 *
 * Validation:
 * - sum(details.quantity) == comboQuantity * packageQuantity
 * - sum(gifts.quantity) == comboQuantity * giftQuantity
 */
export interface OrderItem {
  /** ID tạm để identify row trong UI */
  _tempId?: string;
  /** Combo ID */
  comboId: string;
  /** Product ID của combo */
  productId: string;
  /** Tên combo (snapshot) */
  comboName: string;
  /** Mã combo (snapshot) */
  comboCode: string;
  /** Số combo khách mua */
  comboQuantity: number;
  /** Số lượng sản phẩm trong 1 combo */
  packageQuantity: number;
  /** Số lượng quà trong 1 combo */
  giftQuantity: number;
  /** Giá bán 1 combo */
  sellingPrice: number;
  /** Giảm giá */
  discount: number;
  /** Thành tiền = sellingPrice * comboQuantity - discount */
  subtotal: number;
  /** Chi tiết variant - luôn tồn tại */
  details: ProductVariantSelection[];
  /** Chi tiết quà tặng - luôn tồn tại */
  gifts: OrderGiftSelection[];
}

// ============================================================================
// Computed Properties
// ============================================================================

/**
 * Tính tổng số sản phẩm từ comboQuantity và packageQuantity
 */
export function getTotalProducts(item: OrderItem): number {
  return item.comboQuantity * item.packageQuantity;
}

/**
 * Tính tổng số quà tặng từ comboQuantity và giftQuantity
 */
export function getTotalGifts(item: OrderItem): number {
  return item.comboQuantity * item.giftQuantity;
}

/**
 * Tính tổng số lượng từ details
 */
export function getTotalDetailsQuantity(details: ProductVariantSelection[]): number {
  return details.reduce((sum, d) => sum + d.quantity, 0);
}

/**
 * Tính tổng số lượng quà từ gifts
 */
export function getTotalGiftsQuantity(gifts: OrderGiftSelection[]): number {
  return gifts.reduce((sum, g) => sum + g.quantity, 0);
}

// ============================================================================
// Variant Resolution Helpers
// ============================================================================

/**
 * Resolve Variant ID từ attributes đã chọn.
 * Gọi 1 lần khi user chọn xong, lưu lại không phải query lại.
 */
export function resolveVariantId(
  variants: ProductVariant[],
  attributes: ProductAttribute[]
): string | null {
  if (attributes.length === 0 || !variants) return null;

  const selectedValueIds = new Set(attributes.map((a) => a.valueId));

  const matchedVariant = variants.find((variant) => {
    const variantValueIds = variant.variantValues.map((vv) =>
      typeof vv === "string" ? vv : vv._id
    );
    return attributes.every((attr) => variantValueIds.includes(attr.valueId));
  });

  return matchedVariant?._id || null;
}

/**
 * Resolve Variant từ attributes đã chọn.
 */
export function resolveVariant(
  variants: ProductVariant[],
  attributes: ProductAttribute[]
): ProductVariant | null {
  if (attributes.length === 0 || !variants) return null;

  const selectedValueIds = new Set(attributes.map((a) => a.valueId));

  return (
    variants.find((variant) => {
      const variantValueIds = variant.variantValues.map((vv) =>
        typeof vv === "string" ? vv : vv._id
      );
      return attributes.every((attr) => variantValueIds.includes(attr.valueId));
    }) || null
  );
}

/**
 * Resolve Variant từ variantId.
 */
export function getVariantById(
  variants: ProductVariant[],
  variantId: string | undefined
): ProductVariant | null {
  if (!variantId || !variants) return null;
  return variants.find((v) => v._id === variantId) || null;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ProductVariantsResponse {
  variants: ProductVariant[];
  variantOptions: VariantOptionWithValues[];
}

/**
 * Response khi lấy product kèm variant options
 */
export interface ProductDetailWithVariantsResponse {
  product: ProductWithVariants;
  variantOptions: VariantOptionWithValues[];
  variants: ProductVariant[];
}

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
  /** Order-time snapshots keep detail labels readable after catalog changes. */
  optionName?: string;
  valueName?: string;
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
// Order Gift Mode (Sprint 8.x)
// ============================================================================

/**
 * Chế độ quà tặng trong OrderItem.
 *
 * - RANDOM: Khách để shop chọn ngẫu nhiên (Sale không cần chọn quà)
 * - CUSTOMER_SELECTED: Khách đã chọn quà cụ thể, kho phải xuất đúng
 */
export type OrderGiftMode = "RANDOM" | "CUSTOMER_SELECTED";

/**
 * Chi tiết quà khách yêu cầu (khi CUSTOMER_SELECTED).
 *
 * Lưu ý:
 * - Order chỉ lưu YÊU CẦU của khách
 * - Kho mới là nơi quyết định quà thực tế xuất
 * - Nếu kho hết hàng, kho xử lý vấn đề tồn kho/thay thế
 *
 * giftProductId tham chiếu Gift._id (xem src/models/Gift.ts).
 *
 * Ví dụ (CUSTOMER_SELECTED):
 * - giftSelections: [
 *     { giftProductId: "gift_id_1", giftProductName: "Dầu gội", quantity: 1 },
 *     { giftProductId: "gift_id_2", giftProductName: "Lược", quantity: 1 }
 *   ]
 *
 * Ví dụ (RANDOM):
 * - giftSelections: [] (Kho tự chọn)
 */
export interface GiftSelection {
  /** Gift._id (tham chiếu đến collection gifts) */
  giftProductId: string;
  /** Tên sản phẩm quà (snapshot) */
  giftProductName?: string;
  /** Số lượng quà */
  quantity: number;
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
 *
 * Variant Details:
 * - details: [
 *     { quantity: 4, variantId: "black_id", attributes: [] },
 *     { quantity: 2, variantId: "brown_id", attributes: [] }
 *   ]
 *
 * Gifts (tách bạch YÊU CẦU và THỰC TẾ):
 * - giftMode: RANDOM (shop tự chọn)
 *   - giftSelections: [] (không cần)
 *
 * - giftMode: CUSTOMER_SELECTED
 *   - giftSelections: [
 *       { giftProductId: "oil_id", giftProductName: "Dầu Gội", quantity: 1 },
 *       { giftProductId: "comb_id", giftProductName: "Lược", quantity: 1 }
 *     ]
 *
 * Validations:
 * - sum(details.quantity) == comboQuantity * packageQuantity
 * - RANDOM: giftSelections có thể rỗng
 * - CUSTOMER_SELECTED: sum(giftSelections.quantity) == comboQuantity * giftQuantity
 *
 * Lưu ý: Kho mới là nơi quyết định quà thực tế xuất.
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
  /** Chế độ quà tặng */
  giftMode: OrderGiftMode;
  /** Yêu cầu quà của khách (chỉ dùng khi CUSTOMER_SELECTED) */
  giftSelections: GiftSelection[];
  /** Giá bán 1 combo */
  sellingPrice: number;
  /** Giảm giá */
  discount: number;
  /** Thành tiền = sellingPrice * comboQuantity - discount */
  subtotal: number;
  /** Chi tiết variant - luôn tồn tại */
  details: ProductVariantSelection[];
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
 * Tính tổng số lượng quà từ selections
 */
export function getTotalGiftSelectionsQuantity(selections: GiftSelection[]): number {
  return selections.reduce((sum, g) => sum + g.quantity, 0);
}

/**
 * Validate OrderItem
 *
 * Rules:
 * - sum(details.quantity) == comboQuantity * packageQuantity
 * - RANDOM: giftSelections có thể rỗng
 * - CUSTOMER_SELECTED: sum(giftSelections.quantity) == comboQuantity * giftQuantity
 */
export interface OrderItemValidation {
  isValid: boolean;
  detailsError?: string;
  giftsError?: string;
}

export function validateOrderItem(item: OrderItem): OrderItemValidation {
  const totalProductsRequired = item.comboQuantity * item.packageQuantity;
  const totalGiftsRequired = item.comboQuantity * item.giftQuantity;

  const totalDetails = getTotalDetailsQuantity(item.details);
  const detailsError =
    totalDetails !== totalProductsRequired
      ? `Chi tiết sản phẩm phải đủ ${totalProductsRequired} sản phẩm.`
      : undefined;

  let giftsError: string | undefined;

  if (item.giftMode === "CUSTOMER_SELECTED" && totalGiftsRequired > 0) {
    const totalSelections = getTotalGiftSelectionsQuantity(item.giftSelections);
    if (totalSelections !== totalGiftsRequired) {
      giftsError = `Chi tiết quà phải đủ ${totalGiftsRequired} quà.`;
    }
  }

  return {
    isValid: !detailsError && !giftsError,
    detailsError,
    giftsError,
  };
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

  const selectedValueIds = attributes.map((attribute) => attribute.valueId);

  const matchedVariant = variants.find((variant) => {
    const variantValueIds = variant.variantValues.map((vv) =>
      typeof vv === "string" ? vv : vv._id
    );
    return variantValueIds.length === selectedValueIds.length &&
      selectedValueIds.every((valueId) => variantValueIds.includes(valueId));
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

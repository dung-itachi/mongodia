import mongoose from "mongoose";
import Combo from "@/models/Combo";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";
import VariantValue from "@/models/VariantValue";
import Gift from "@/models/Gift";
import type { OrderItem, ProductAttribute } from "@/types/variant";

export interface ValidatedSaleOrderItem {
  comboId: string;
  productId: string;
  comboName: string;
  comboCode: string;
  comboQuantity: number;
  packageQuantity: number;
  giftQuantity: number;
  giftMode: "RANDOM" | "CUSTOMER_SELECTED";
  /**
   * Gift selections as TOTALS for the entire order item.
   *
   * - CUSTOMER_SELECTED: sum(quantity) >= comboQuantity * giftQuantity.
   *   Quantity ở đây là TỔNG số quà thực tế phải ship cho order item này
   *   (KHÔNG nhân thêm comboQuantity). Đây là semantics duy nhất —
   *   mọi layer downstream (Stock Engine, ORDER_OUT, ORDER_RETURN) đều
   *   dùng TOTAL này.
   * - RANDOM: rỗng (kho tự chọn — không reserve/ship từ order data).
   */
  giftSelections: Array<{ giftProductId: string; giftProductName: string; quantity: number }>;
  sellingPrice: number;
  discount: number;
  subtotal: number;
  /**
   * Details đã được resolve variantId.
   *
   * - Product có variant: variantId BẮT BUỘC (đã validate).
   * - Product không variant: variantId = null (đã set rõ ràng — KHÔNG
   *   fallback sang variants[0]).
   *
   * Inventory layer dùng `details[].variantId + details[].quantity` làm
   * source of truth duy nhất cho PRODUCT demand.
   */
  details: Array<{
    quantity: number;
    variantId: string | null;
    attributes: ProductAttribute[];
  }>;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function sameIds(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id) => right.includes(id));
}

export class SaleOrderService {
  async validateItem(input: OrderItem): Promise<ValidatedSaleOrderItem> {
    // DEBUG
    console.log("[validateItem] input.giftMode:", input.giftMode, "| input.giftSelections:", JSON.stringify(input.giftSelections));
    if (!isPositiveInteger(input.comboQuantity)) {
      throw new Error("Số combo phải lớn hơn 0.");
    }
    if (!mongoose.Types.ObjectId.isValid(input.comboId)) {
      throw new Error("Combo không hợp lệ.");
    }

    const combo = await Combo.findOne({ _id: input.comboId, isActive: true }).lean();
    if (!combo) throw new Error("Combo không tồn tại hoặc đã ngừng hoạt động.");

    const product = await Product.findOne({ _id: combo.productId, isActive: true }).lean();
    if (!product) throw new Error("Sản phẩm của combo không tồn tại hoặc đã ngừng hoạt động.");
    if (input.productId !== product._id.toString()) {
      throw new Error("Sản phẩm không thuộc combo đã chọn.");
    }

    const packageQuantity = combo.packageQuantity;
    const giftQuantity = combo.giftQuantity ?? 0;
    const requiredProductQuantity = input.comboQuantity * packageQuantity;
    const detailsQuantity = input.details.reduce((total, detail) => total + detail.quantity, 0);
    if (detailsQuantity !== requiredProductQuantity) {
      throw new Error(`Chi tiết sản phẩm phải đủ ${requiredProductQuantity} sản phẩm.`);
    }

    const variants = await ProductVariant.find({ productId: product._id, isActive: true }).lean();
    const hasVariants = variants.length > 0;
    const variantValueIdsByProduct = new Set(variants.flatMap((variant) => variant.variantValues.map((id) => id.toString())));
    const seenCombinations = new Set<string>();
    const details: ValidatedSaleOrderItem["details"] = [];

    for (const detail of input.details) {
      if (!isPositiveInteger(detail.quantity)) throw new Error("Số lượng chi tiết sản phẩm phải lớn hơn 0.");
      const attributes = detail.attributes ?? [];
      if (!hasVariants) {
        // Product KHÔNG có variant → variantId phải là null rõ ràng.
        // Nếu caller cố tình gửi variantId hoặc attributes → reject.
        if (attributes.length > 0 || detail.variantId) {
          throw new Error("Sản phẩm này không có biến thể — không được chỉ định variantId hoặc attributes.");
        }
        details.push({ quantity: detail.quantity, variantId: null, attributes: [] });
        continue;
      }

      const attributeValueIds = attributes.map((attribute) => attribute.valueId);
      if (attributeValueIds.some((valueId) => !mongoose.Types.ObjectId.isValid(valueId) || !variantValueIdsByProduct.has(valueId))) {
        throw new Error("Thuộc tính biến thể không thuộc sản phẩm.");
      }
      const distinctOptionIds = new Set(attributes.map((attribute) => attribute.optionId));
      if (attributes.length === 0 || distinctOptionIds.size !== attributes.length || new Set(attributeValueIds).size !== attributeValueIds.length) {
        throw new Error("Thuộc tính biến thể không hợp lệ.");
      }

      const optionIds = attributes.map((attribute) => attribute.optionId);
      if (optionIds.some((optionId) => !mongoose.Types.ObjectId.isValid(optionId))) {
        throw new Error("Thuộc tính biến thể không hợp lệ.");
      }
      const values = await VariantValue.find({ _id: { $in: attributeValueIds }, isActive: true }).lean();
      if (values.length !== attributes.length || values.some((value) => !attributes.some((attribute) => attribute.optionId === value.variantOptionId.toString() && attribute.valueId === value._id.toString()))) {
        throw new Error("Thuộc tính biến thể không hợp lệ.");
      }

      const combinationKey = [...attributeValueIds].sort().join(":");
      if (seenCombinations.has(combinationKey)) throw new Error("Biến thể này đã tồn tại.");
      seenCombinations.add(combinationKey);

      // Resolve variant từ attribute combination. KHÔNG fallback về variants[0].
      const variant = variants.find((candidate) => sameIds(candidate.variantValues.map((id) => id.toString()), attributeValueIds));
      if (!variant) {
        throw new Error(
          "Không tìm thấy biến thể phù hợp với attributes đã chọn. " +
            "Không thể suy ra variant từ variant đầu tiên của sản phẩm."
        );
      }

      // Nếu caller gửi variantId riêng → verify khớp với variant resolved từ attributes.
      if (detail.variantId && detail.variantId !== variant._id.toString()) {
        throw new Error("variantId và attributes trỏ tới 2 biến thể khác nhau.");
      }

      details.push({
        quantity: detail.quantity,
        variantId: variant._id.toString(),
        attributes,
      });
    }

    let giftSelections: ValidatedSaleOrderItem["giftSelections"] = [];
    if (input.giftMode === "CUSTOMER_SELECTED") {
      const requiredGiftQuantity = input.comboQuantity * giftQuantity;
      // Cho phép thêm quà ngoài combo: selectionQuantity >= requiredGiftQuantity.
      //
      // Semantics: `selection.quantity` là TỔNG trên toàn order item
      // (đã bao gồm comboQuantity). KHÔNG nhân thêm comboQuantity ở
      // layer nào khác. Đây là invariant duy nhất.
      const selectionQuantity = input.giftSelections.reduce((total, selection) => total + selection.quantity, 0);
      if (selectionQuantity < requiredGiftQuantity) {
        throw new Error(`Chi tiết quà phải đủ ${requiredGiftQuantity} quà.`);
      }
      // Kiểm tra không có giftProductId trùng lặp và không có empty string
      const ids = input.giftSelections.map((selection) => selection.giftProductId);
      if (ids.some(id => !id || id.trim() === "")) {
        throw new Error("Vui lòng chọn đủ quà tặng.");
      }
      if (ids.length !== new Set(ids).size || input.giftSelections.some((selection) => !isPositiveInteger(selection.quantity))) {
        throw new Error("Quà tặng đã chọn không hợp lệ.");
      }
      const gifts = await Gift.find({ _id: { $in: ids }, isActive: true }).lean();
      if (gifts.length !== ids.length) throw new Error("Quà tặng không tồn tại hoặc đã ngừng hoạt động.");
      const giftsById = new Map(gifts.map((gift) => [gift._id.toString(), gift]));
      // Lưu quantity AS-IS (TOTAL trên toàn order item).
      giftSelections = input.giftSelections.map((selection) => ({
        giftProductId: selection.giftProductId,
        giftProductName: giftsById.get(selection.giftProductId)!.name,
        quantity: selection.quantity,
      }));
    } else if (input.giftMode === "RANDOM") {
      // RANDOM: Shop tự chọn quà, không cần kiểm tra giftSelections.
      // giftSelections đã là [] (default).
    } else if (input.giftMode !== undefined && input.giftMode !== null) {
      // giftMode không hợp lệ (không phải CUSTOMER_SELECTED, RANDOM, hoặc undefined)
      throw new Error("Cách nhận quà không hợp lệ.");
    }
    // Nếu giftMode = undefined/null: không có quà tặng, bỏ qua.

    const discount = Number.isFinite(input.discount) && input.discount >= 0 ? input.discount : 0;
    const subtotal = Math.max(0, combo.sellingPrice * input.comboQuantity - discount);
    return {
      comboId: combo._id.toString(), productId: product._id.toString(),
      comboName: combo.name, comboCode: combo.code,
      comboQuantity: input.comboQuantity, packageQuantity, giftQuantity, giftMode: input.giftMode,
      giftSelections, sellingPrice: combo.sellingPrice, discount, subtotal, details,
    };
  }
}

export const saleOrderService = new SaleOrderService();

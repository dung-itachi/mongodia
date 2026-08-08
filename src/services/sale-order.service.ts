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
  giftSelections: Array<{ giftProductId: string; giftProductName: string; quantity: number }>;
  sellingPrice: number;
  discount: number;
  subtotal: number;
  details: Array<{
    quantity: number;
    variantId?: string;
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
        if (attributes.length > 0 || detail.variantId) throw new Error("Sản phẩm này không có biến thể.");
        details.push({ quantity: detail.quantity, attributes: [] });
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

      const variant = variants.find((candidate) => sameIds(candidate.variantValues.map((id) => id.toString()), attributeValueIds));
      if (!variant) throw new Error("Không tìm thấy biến thể phù hợp.");
      details.push({ quantity: detail.quantity, variantId: variant._id.toString(), attributes });
    }

    let giftSelections: ValidatedSaleOrderItem["giftSelections"] = [];
    if (input.giftMode === "CUSTOMER_SELECTED") {
      const requiredGiftQuantity = input.comboQuantity * giftQuantity;
      const selectionQuantity = input.giftSelections.reduce((total, selection) => total + selection.quantity, 0);
      if (selectionQuantity !== requiredGiftQuantity) {
        throw new Error(`Chi tiết quà phải đủ ${requiredGiftQuantity} quà.`);
      }
      const ids = input.giftSelections.map((selection) => selection.giftProductId);
      if (ids.length !== new Set(ids).size || input.giftSelections.some((selection) => !isPositiveInteger(selection.quantity))) {
        throw new Error("Quà tặng đã chọn không hợp lệ.");
      }
      const gifts = await Gift.find({ _id: { $in: ids }, isActive: true }).lean();
      if (gifts.length !== ids.length) throw new Error("Quà tặng không tồn tại hoặc đã ngừng hoạt động.");
      const giftsById = new Map(gifts.map((gift) => [gift._id.toString(), gift]));
      giftSelections = input.giftSelections.map((selection) => ({
        giftProductId: selection.giftProductId,
        giftProductName: giftsById.get(selection.giftProductId)!.name,
        quantity: selection.quantity,
      }));
    } else if (input.giftMode !== "RANDOM") {
      throw new Error("Cách nhận quà không hợp lệ.");
    }

    const discount = Number.isFinite(input.discount) && input.discount >= 0 ? input.discount : 0;
    const subtotal = Math.max(0, combo.sellingPrice * input.comboQuantity - discount);
    return {
      comboId: combo._id.toString(), productId: product._id.toString(), comboName: combo.name, comboCode: combo.code,
      comboQuantity: input.comboQuantity, packageQuantity, giftQuantity, giftMode: input.giftMode,
      giftSelections, sellingPrice: combo.sellingPrice, discount, subtotal, details,
    };
  }
}

export const saleOrderService = new SaleOrderService();

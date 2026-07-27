import { IVariantValue } from "@/models/VariantValue";

export function mapVariantValue(
  variantValue: IVariantValue & { _id: unknown }
) {
  return {
    _id: variantValue._id,

    code: variantValue.code,

    name: variantValue.name,

    variantOptionId: variantValue.variantOptionId,

    sortOrder: variantValue.sortOrder,

    isActive: variantValue.isActive,
  };
}

export function mapVariantValueList(
  variantValue: IVariantValue & { _id: unknown }
) {
  return mapVariantValue(variantValue);
}

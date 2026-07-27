import { IVariantOption } from "@/models/VariantOption";

export function mapVariantOption(
  option: IVariantOption & { _id: unknown }
) {
  return {
    _id: option._id,

    code: option.code,

    name: option.name,

    sortOrder: option.sortOrder,

    isActive: option.isActive,
  };
}

export function mapVariantOptionList(
  option: IVariantOption & { _id: unknown }
) {
  return mapVariantOption(option);
}
/**
 * Combo Mappers
 *
 * Sprint 8.x - Combo theo Product, không lưu variant và categoryId riêng.
 * - productId: ref Product
 * - packageQuantity: số SP / combo
 * - sellingPrice
 * - giftQuantity: số quà / combo
 *
 * Khi trả về client, populate `productId` để lấy code/name; category lấy từ product.
 */

import type { Types } from "mongoose";

type MaybeObjectId = Types.ObjectId | string | { _id: Types.ObjectId | string } | null | undefined;

interface PopulatedProductRef {
  _id: Types.ObjectId | string;
  code: string;
  name: string;
  categoryId?: Types.ObjectId | string | { _id: Types.ObjectId | string; code: string; name: string };
}

function toProductRef(value: MaybeObjectId): unknown {
  if (value && typeof value === "object" && "code" in value) {
    const obj = value as PopulatedProductRef;
    return {
      _id: obj._id,
      code: obj.code,
      name: obj.name,
    };
  }
  return value;
}

export interface MappedComboProduct {
  _id: string;
  code: string;
  name: string;
}

export interface MappedCombo {
  _id: string;
  code: string;
  name: string;
  product: string | MappedComboProduct;
  productId: string;
  packageQuantity: number;
  sellingPrice: number;
  giftQuantity: number;
  displayOrder: number;
  image: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MappedComboListItem extends Omit<MappedCombo, "description" | "createdAt" | "updatedAt"> {}

export function mapCombo(combo: Record<string, unknown>): MappedCombo {
  const productId = combo.productId as MaybeObjectId;
  return {
    _id: String(combo._id),
    code: String(combo.code ?? ""),
    name: String(combo.name ?? ""),
    product: toProductRef(productId) as MappedCombo["product"],
    productId: productId && typeof productId === "object" && "_id" in productId
      ? String((productId as { _id: Types.ObjectId | string })._id)
      : String(productId ?? ""),
    packageQuantity: Number(combo.packageQuantity ?? 1),
    sellingPrice: Number(combo.sellingPrice ?? 0),
    giftQuantity: Number(combo.giftQuantity ?? 0),
    displayOrder: Number(combo.displayOrder ?? 0),
    image: String(combo.image ?? ""),
    description: (combo.description as string | undefined) ?? "",
    isActive: Boolean(combo.isActive),
    createdAt: combo.createdAt ? String(combo.createdAt) : undefined,
    updatedAt: combo.updatedAt ? String(combo.updatedAt) : undefined,
  };
}

export function mapComboList(combo: Record<string, unknown>): MappedComboListItem {
  const mapped = mapCombo(combo);
  const { description, createdAt, updatedAt, ...rest } = mapped;
  void description;
  void createdAt;
  void updatedAt;
  return rest;
}
/**
 * Warehouse Inventory Query Service
 *
 * Separate service for querying inventory with full filtering support.
 * This does NOT modify warehouseWorkflow.service.ts.
 * Business logic (adjustments, transfers, shipments) stays in warehouseWorkflow.service.ts.
 */

import mongoose from "mongoose";
import WarehouseInventory from "@/models/WarehouseInventory";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";
import Gift from "@/models/Gift";
import Warehouse from "@/models/Warehouse";

function oid(value: string, field: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) throw new Error(`${field} không hợp lệ`);
  return new mongoose.Types.ObjectId(value);
}

export interface InventoryQueryFilters {
  warehouseId?: string;
  itemType?: string;
  productId?: string;
  variantId?: string;
  giftId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface InventoryQueryResult {
  items: unknown[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function queryInventory(filters: InventoryQueryFilters): Promise<InventoryQueryResult> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const query: Record<string, unknown> = { isActive: true };

  if (filters.warehouseId) query.warehouseId = oid(filters.warehouseId, "Warehouse ID");
  if (filters.itemType) query.itemType = filters.itemType;
  if (filters.productId) query.productId = oid(filters.productId, "Product ID");
  if (filters.variantId) query.variantId = oid(filters.variantId, "Variant ID");
  if (filters.giftId) query.giftId = oid(filters.giftId, "Gift ID");

  if (filters.search) {
    const searchRegex = new RegExp(filters.search, "i");
    const searchConditions: Record<string, unknown>[] = [];

    // Pre-query all related collections to get matching IDs
    // This ensures search works on ObjectId references BEFORE pagination
    const [matchingProducts, matchingVariants, matchingGifts, matchingWarehouses] = await Promise.all([
      // Product: search by name AND code
      Product.find({
        $or: [{ name: searchRegex }, { code: searchRegex }],
        isActive: true
      }).select("_id").limit(100).lean(),
      // Variant: search by SKU
      ProductVariant.find({ sku: searchRegex, isActive: true }).select("_id").limit(100).lean(),
      // Gift: search by name
      Gift.find({ name: searchRegex, isActive: true }).select("_id").limit(100).lean(),
      // Warehouse: search by name AND code
      Warehouse.find({
        $or: [{ name: searchRegex }, { code: searchRegex }],
        isActive: true
      }).select("_id").limit(100).lean(),
    ]);

    const productIds = matchingProducts.map((p) => p._id);
    const variantIds = matchingVariants.map((v) => v._id);
    const giftIds = matchingGifts.map((g) => g._id);
    const warehouseIds = matchingWarehouses.map((w) => w._id);

    // Search uses OR across product/variant/gift/warehouse fields
    // If user searches "EYELASH", find records where ANY field contains EYELASH
    if (productIds.length) searchConditions.push({ productId: { $in: productIds } });
    if (variantIds.length) searchConditions.push({ variantId: { $in: variantIds } });
    if (giftIds.length) searchConditions.push({ giftId: { $in: giftIds } });
    if (warehouseIds.length) searchConditions.push({ warehouseId: { $in: warehouseIds } });

    if (searchConditions.length > 0) {
      query.$or = searchConditions;
    }
  }

  const [items, total] = await Promise.all([
    WarehouseInventory.find(query)
      .populate("warehouseId", "_id code name")
      .populate("productId", "_id code name")
      .populate("variantId", "_id sku variantValues")
      .populate("giftId", "_id name")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    WarehouseInventory.countDocuments(query),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/**
 * ==================================================
 * WAREHOUSE ADJUSTMENT SERVICE
 * ==================================================
 *
 * Service cho nghiệp vụ ĐIỀU CHỈNH TỒN KHO.
 * Dùng khi kiểm kê thực tế khác hệ thống.
 *
 * Nguyên tắc:
 * - Không cho sửa quantity trực tiếp
 * - Bắt buộc tạo transaction + history
 * - Atomic operation với MongoDB session
 */

import mongoose from "mongoose";
import WarehouseInventory from "@/models/WarehouseInventory";
import WarehouseStockMovement from "@/models/WarehouseStockMovement";
import Gift from "@/models/Gift";
import ProductVariant from "@/models/ProductVariant";
import Product from "@/models/Product";
import Counter from "@/models/Counter";

export type AdjustmentItemInput = {
  productId?: string;
  variantId?: string;
  giftId?: string;
  newQuantity: number;
  reason: string;
  note?: string;
};

export interface AdjustmentResult {
  success: true;
  adjustmentCode: string;
  movements: Array<{
    itemType: string;
    productName?: string;
    giftName?: string;
    beforeQuantity: number;
    afterQuantity: number;
    change: number;
  }>;
}

export interface AdjustmentError {
  success: false;
  error: string;
  insufficientItems?: Array<{
    name: string;
    requested: number;
    available: number;
  }>;
}

function oid(value: string, field: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) throw new Error(`${field} không hợp lệ`);
  return new mongoose.Types.ObjectId(value);
}

async function nextCode(session: mongoose.ClientSession) {
  const date = new Date();
  const key = `adj_${date.toISOString().slice(0, 10).replace(/-/g, "")}`;
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, session }
  );
  return `ADJ${key.slice(-8)}${String(counter?.seq ?? 1).padStart(4, "0")}`;
}

async function getItemInfo(
  item: AdjustmentItemInput
): Promise<{
  itemType: "PRODUCT" | "GIFT";
  productId?: mongoose.Types.ObjectId | null;
  variantId?: mongoose.Types.ObjectId | null;
  giftId?: mongoose.Types.ObjectId | null;
  name: string;
}> {
  if (item.giftId) {
    const giftId = oid(item.giftId, "Gift ID");
    const gift = await Gift.findOne({ _id: giftId, isActive: true }).lean();
    if (!gift) throw new Error("Gift không tồn tại hoặc đã ngừng hoạt động");
    return { itemType: "GIFT", giftId, productId: null, variantId: null, name: gift.name };
  }

  if (item.variantId) {
    const variantId = oid(item.variantId, "Variant ID");
    const variant = await ProductVariant.findOne({ _id: variantId, isActive: true })
      .populate("productId", "code name")
      .lean();
    if (!variant) throw new Error("ProductVariant không tồn tại hoặc đã ngừng hoạt động");
    const product = variant.productId as unknown as { _id: mongoose.Types.ObjectId; code: string; name: string } | mongoose.Types.ObjectId;
    const productId = typeof product === 'object' && '_id' in product ? product._id : product;
    return {
      itemType: "PRODUCT",
      productId: productId,
      variantId,
      giftId: null,
      name: `${(product as { name?: string }).name ?? "N/A"} • ${variant.sku ?? "N/A"}`,
    };
  }

  if (item.productId) {
    const productId = oid(item.productId, "Product ID");
    const product = await Product.findOne({ _id: productId, isActive: true }).lean();
    if (!product) throw new Error("Product không tồn tại hoặc đã ngừng hoạt động");
    return { itemType: "PRODUCT", productId, variantId: null, giftId: null, name: product.name };
  }

  throw new Error("Phải chọn giftId, variantId hoặc productId");
}

export class WarehouseAdjustmentService {
  /**
   * Tạo điều chỉnh tồn kho cho một kho
   *
   * @param warehouseId - ID của kho
   * @param items - Danh sách các mặt hàng cần điều chỉnh
   * @param employeeId - ID nhân viên thực hiện
   * @param note - Ghi chú chung (tùy chọn)
   * @returns Kết quả điều chỉnh
   */
  async createAdjustment(
    warehouseId: string,
    items: AdjustmentItemInput[],
    employeeId: string,
    note?: string
  ): Promise<AdjustmentResult | AdjustmentError> {
    if (!items.length) {
      return { success: false, error: "Danh sách điều chỉnh không được rỗng" };
    }

    if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
      return { success: false, error: "ID kho không hợp lệ" };
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const warehouseObjId = oid(warehouseId, "Warehouse ID");
      const employeeObjId = oid(employeeId, "Employee ID");
      const adjustmentCode = await nextCode(session);

      const movements: AdjustmentResult["movements"] = [];
      const errors: AdjustmentError["insufficientItems"] = [];

      for (const item of items) {
        const itemInfo = await getItemInfo(item);

        // Find current inventory
        const filter = {
          warehouseId: warehouseObjId,
          itemType: itemInfo.itemType,
          productId: itemInfo.productId ?? null,
          variantId: itemInfo.variantId ?? null,
          giftId: itemInfo.giftId ?? null,
          isActive: true,
        };

        const currentInventory = await WarehouseInventory.findOne(filter).session(session);

        if (!currentInventory) {
          // Tạo mới nếu chưa có (chỉ khi newQuantity > 0)
          if (item.newQuantity > 0) {
            await WarehouseInventory.create(
              [{
                ...filter,
                quantity: item.newQuantity,
                availableQuantity: item.newQuantity,
                inTransitQuantity: 0,
                shippedQuantity: 0,
                reservedQuantity: 0,
              }],
              { session }
            );

            // Tạo movement
            await WarehouseStockMovement.create(
              [{
                warehouseId: warehouseObjId,
                itemType: itemInfo.itemType,
                productId: itemInfo.productId,
                variantId: itemInfo.variantId,
                giftId: itemInfo.giftId,
                type: "ADJUSTMENT",
                quantity: item.newQuantity,
                referenceType: "ADJUSTMENT",
                referenceCode: adjustmentCode,
                createdBy: employeeObjId,
                note: note || item.reason,
              }],
              { session }
            );

            movements.push({
              itemType: itemInfo.itemType,
              productName: itemInfo.itemType === "PRODUCT" ? itemInfo.name : undefined,
              giftName: itemInfo.itemType === "GIFT" ? itemInfo.name : undefined,
              beforeQuantity: 0,
              afterQuantity: item.newQuantity,
              change: item.newQuantity,
            });
          } else {
            errors.push({
              name: itemInfo.name,
              requested: item.newQuantity,
              available: 0,
            });
          }
        } else {
          // Update existing inventory
          const beforeQuantity = currentInventory.quantity;
          const change = item.newQuantity - beforeQuantity;

          // Validation: Không cho giảm dưới 0
          if (item.newQuantity < 0) {
            await session.abortTransaction();
            return {
              success: false,
              error: `Số lượng mới không được âm cho ${itemInfo.name}`,
            };
          }

          // Nếu giảm tồn, kiểm tra reserved + in transit
          // shippedQuantity là tracking, KHÔNG khóa tồn kho
          if (change < 0) {
            const lockedQty = currentInventory.inTransitQuantity + currentInventory.reservedQuantity;
            if (item.newQuantity < lockedQty) {
              await session.abortTransaction();
              return {
                success: false,
                error: `Số lượng mới (${item.newQuantity}) không được nhỏ hơn số lượng đang chuyển/đã đặt (${lockedQty}) cho ${itemInfo.name}`,
              };
            }
          }

          // Update inventory - recalculate availableQuantity
          // availableQuantity = quantity - inTransit - reserved
          const newAvailable = item.newQuantity - currentInventory.inTransitQuantity - currentInventory.reservedQuantity;
          await WarehouseInventory.findOneAndUpdate(
            filter,
            {
              $set: {
                quantity: item.newQuantity,
                availableQuantity: Math.max(0, newAvailable),
              },
            },
            { session }
          );

          // Tạo movement
          await WarehouseStockMovement.create(
            [{
              warehouseId: warehouseObjId,
              itemType: itemInfo.itemType,
              productId: itemInfo.productId,
              variantId: itemInfo.variantId,
              giftId: itemInfo.giftId,
              type: "ADJUSTMENT",
              quantity: Math.abs(change),
              referenceType: "ADJUSTMENT",
              referenceCode: adjustmentCode,
              createdBy: employeeObjId,
              note: note || item.reason,
            }],
            { session }
          );

          movements.push({
            itemType: itemInfo.itemType,
            productName: itemInfo.itemType === "PRODUCT" ? itemInfo.name : undefined,
            giftName: itemInfo.itemType === "GIFT" ? itemInfo.name : undefined,
            beforeQuantity,
            afterQuantity: item.newQuantity,
            change,
          });
        }
      }

      if (errors.length > 0 && movements.length === 0) {
        await session.abortTransaction();
        return { success: false, error: "Một số mặt hàng không thể điều chỉnh", insufficientItems: errors };
      }

      await session.commitTransaction();

      return {
        success: true,
        adjustmentCode,
        movements,
      };
    } catch (err) {
      await session.abortTransaction();
      console.error("WarehouseAdjustmentService.createAdjustment error:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Lỗi khi điều chỉnh tồn kho",
      };
    } finally {
      session.endSession();
    }
  }

  /**
   * Lấy danh sách điều chỉnh với phân trang
   */
  async listAdjustments(filters: {
    warehouseId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const query: Record<string, unknown> = {};
    if (filters.warehouseId) {
      query.warehouseId = oid(filters.warehouseId, "Warehouse ID");
    }

    const [items, total] = await Promise.all([
      WarehouseStockMovement.find({ ...query, referenceType: "ADJUSTMENT" })
        .populate("warehouseId", "_id code name")
        .populate("productId", "_id code name")
        .populate("variantId", "_id sku")
        .populate("giftId", "_id name")
        .populate("createdBy", "_id employeeCode fullName")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      WarehouseStockMovement.countDocuments({ ...query, referenceType: "ADJUSTMENT" }),
    ]);

    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }
}

export const warehouseAdjustmentService = new WarehouseAdjustmentService();

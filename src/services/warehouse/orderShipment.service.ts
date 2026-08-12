import mongoose from "mongoose";
import { Order } from "@/models/Order";
import Combo from "@/models/Combo";
import WarehouseInventory from "@/models/WarehouseInventory";
import WarehouseStockMovement from "@/models/WarehouseStockMovement";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";
import Gift from "@/models/Gift";

export type ShipmentItem = {
  itemType: "PRODUCT" | "GIFT";
  productId?: string;
  variantId?: string;
  giftId?: string;
  quantity: number;
};

export type NormalizedShipmentItem = {
  itemType: "PRODUCT" | "GIFT";
  productId: mongoose.Types.ObjectId | null;
  variantId: mongoose.Types.ObjectId | null;
  giftId?: mongoose.Types.ObjectId | null;
};

function oid(value: string, field: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) throw new Error(`${field} không hợp lệ`);
  return new mongoose.Types.ObjectId(value);
}

function positive(value: number, field: string) {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${field} phải là số nguyên > 0`);
  return value;
}

function filter(warehouseId: mongoose.Types.ObjectId, item: NormalizedShipmentItem): Record<string, unknown> {
  return {
    warehouseId,
    itemType: item.itemType,
    productId: item.itemType === "PRODUCT" ? (item.variantId ? null : item.productId) : null,
    variantId: item.itemType === "PRODUCT" ? (item.variantId ?? null) : null,
    giftId: item.itemType === "GIFT" ? (item.giftId ?? null) : null,
    isActive: true,
  };
}

async function resolveProductLine(productId?: string, variantId?: string): Promise<{ productId: mongoose.Types.ObjectId | null; variantId: mongoose.Types.ObjectId | null }> {
  if (variantId) {
    const variant = await ProductVariant.findOne({ _id: oid(variantId, "Variant ID"), isActive: true }).select("productId").lean();
    if (!variant) throw new Error("ProductVariant không tồn tại hoặc đã ngừng hoạt động");
    return { productId: variant.productId, variantId: variant._id };
  }
  if (!productId) throw new Error("Thiếu productId cho mặt hàng không có variant");
  if (!(await Product.exists({ _id: oid(productId, "Product ID"), isActive: true }))) throw new Error("Product không tồn tại hoặc đã ngừng hoạt động");
  return { productId: oid(productId, "Product ID"), variantId: null };
}

async function resolveGift(giftId: string): Promise<mongoose.Types.ObjectId> {
  if (!(await Gift.exists({ _id: oid(giftId, "Gift ID"), isActive: true }))) throw new Error("Gift không tồn tại hoặc đã ngừng hoạt động");
  return oid(giftId, "Gift ID");
}

async function adjustInventoryForShip(warehouseId: mongoose.Types.ObjectId, item: NormalizedShipmentItem, quantity: number, session: mongoose.ClientSession) {
  const where = filter(warehouseId, item);
  // Check availableQuantity (quantity - inTransit - reserved)
  // shippedQuantity là tracking counter, KHÔNG ảnh hưởng available
  const updated = await WarehouseInventory.findOneAndUpdate(
    { ...where, availableQuantity: { $gte: quantity } } as never,
    { $inc: { quantity: -quantity, availableQuantity: -quantity } },
    { new: true, session }
  ).lean();
  if (!updated) throw new Error(`Không đủ tồn kho khả dụng: cần ${quantity}`);
  return updated;
}

async function adjustInventoryForReturn(warehouseId: mongoose.Types.ObjectId, item: NormalizedShipmentItem, quantity: number, session: mongoose.ClientSession) {
  const where = filter(warehouseId, item);
  const updated = await WarehouseInventory.findOneAndUpdate(
    where as never,
    { $inc: { quantity, availableQuantity: quantity }, $setOnInsert: { inTransitQuantity: 0, shippedQuantity: 0, reservedQuantity: 0, isActive: true } },
    { upsert: true, new: true, session }
  ).lean();
  if (!updated) throw new Error("Không thể hoàn hàng vào kho");
  return updated;
}

// Combo giờ chỉ lưu productId + packageQuantity.
// Khi build shipment demand, lấy tất cả active variants của product
// (Sale đã nhập variant chi tiết trong OrderItem.details).
//
// RANDOM gift selection: Uses WarehouseInventory.availableQuantity from the specific warehouse.
// Does NOT use Gift.stockQuantity (global stock) to avoid selecting a gift unavailable in the warehouse.
//
// Parameters:
// - orderId: Order ID
// - warehouseId: Target warehouse ID (from order.warehouseId)
// - session: MongoDB session for transaction consistency
async function buildProductDemands(
  orderId: string,
  warehouseId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
) {
  const order = await Order.findById(orderId).select("orderItems comboId").lean();
  if (!order) throw new Error("Đơn hàng không tồn tại");
  if (!order.orderItems?.length) throw new Error("Đơn hàng chưa có sản phẩm để xuất kho");

  const demand = new Map<string, ShipmentItem>();
  for (const item of order.orderItems) {
    const combos = item.comboId
      ? await Combo.findById(item.comboId).select("productId packageQuantity").lean()
      : null;
    if (combos) {
      // Lấy tất cả variants active của Product để kho có thể xuất
      const productVariants = await ProductVariant.find({
        productId: combos.productId,
        isActive: true,
      })
        .select("_id")
        .lean();
      const fallbackVariantId = productVariants[0]?._id?.toString();
      const productId = combos.productId.toString();
      if (!fallbackVariantId) {
        throw new Error("Sản phẩm của combo chưa có biến thể khả dụng để xuất kho");
      }
      const key = `PRODUCT::${fallbackVariantId}`;
      // Tổng SL lấy theo packageQuantity * comboQuantity (Sale sẽ cụ thể hoá sau).
      const totalQty = combos.packageQuantity * item.comboQuantity;
      demand.set(key, {
        itemType: "PRODUCT",
        productId,
        variantId: fallbackVariantId,
        quantity: (demand.get(key)?.quantity ?? 0) + totalQty,
      });
    } else if (item.productId) {
      const productId = item.productId.toString();
      const variantId = (await ProductVariant.findOne({ productId: oid(productId, "Product ID"), isActive: true }).sort({ createdAt: 1 }).select("_id").lean())?._id.toString();
      if (variantId) {
        const key = `PRODUCT::${variantId}`;
        const quantity = item.quantity;
        demand.set(key, { itemType: "PRODUCT", productId, variantId, quantity: (demand.get(key)?.quantity ?? 0) + quantity });
      } else {
        const key = `PRODUCT::${productId}`;
        const quantity = item.quantity;
        demand.set(key, { itemType: "PRODUCT", productId, quantity: (demand.get(key)?.quantity ?? 0) + quantity });
      }
    }
  }

  const giftDemand: ShipmentItem[] = [];
  for (const item of order.orderItems) {
    const giftQty = (item.giftQuantity ?? 0) * (item.comboQuantity || 1);
    if (giftQty <= 0) continue;
    if (item.giftMode === "CUSTOMER_SELECTED" && item.giftSelections?.length) {
      // CUSTOMER_SELECTED: Use exact gift from order's giftSelections
      for (const sel of item.giftSelections) {
        const giftId = sel.giftProductId.toString();
        const existing = giftDemand.find((g) => g.giftId === giftId);
        if (existing) existing.quantity += sel.quantity;
        else giftDemand.push({ itemType: "GIFT", giftId, quantity: sel.quantity });
      }
    } else if (giftQty > 0) {
      // RANDOM: Select from WarehouseInventory of the current warehouse
      // Uses availableQuantity (not Gift.stockQuantity) to ensure gift exists in this warehouse
      const warehouseGifts = await WarehouseInventory.find({
        warehouseId,
        itemType: "GIFT",
        availableQuantity: { $gte: giftQty },
        isActive: true,
      })
        .populate("giftId", "_id isActive")
        .sort({ availableQuantity: -1 })  // Select gift with highest available quantity
        .session(session)
        .lean();

      // Filter for valid, active gifts
      const validGift = warehouseGifts.find(
        (wg) => {
          if (!wg.giftId) return false;
          const populatedGift = wg.giftId as unknown as { _id: mongoose.Types.ObjectId; isActive: boolean };
          return populatedGift.isActive;
        }
      );

      if (!validGift) {
        throw new Error(`Kho không đủ quà RANDOM cho đơn này`);
      }

      const selectedGiftId = (validGift.giftId as unknown as { _id: mongoose.Types.ObjectId })._id.toString();
      const existing = giftDemand.find((g) => g.giftId === selectedGiftId);
      if (existing) existing.quantity += giftQty;
      else giftDemand.push({ itemType: "GIFT", giftId: selectedGiftId, quantity: giftQty });
    }
  }

  return { order, demands: [...demand.values(), ...giftDemand] };
}

export class OrderShipmentService {
  async shipOrder(input: { orderId: string; employeeId: string; actualShipments?: ShipmentItem[]; note?: string }) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const order = await Order.findById(input.orderId).select("warehouseId status").session(session).lean();
      if (!order) throw new Error("Đơn hàng không tồn tại");
      if (!order.warehouseId) throw new Error("Đơn hàng chưa gán kho xuất");
      const warehouseId = order.warehouseId;
      const demands = input.actualShipments?.length ? input.actualShipments : (await buildProductDemands(input.orderId, warehouseId, session)).demands;
      const employeeId = oid(input.employeeId, "Employee ID");
      const orderCode = (await Order.findById(input.orderId).select("orderCode").lean())?.orderCode ?? "";
      for (const item of demands) {
        positive(item.quantity, "quantity");
        const normalized: NormalizedShipmentItem = item.itemType === "PRODUCT"
          ? { itemType: "PRODUCT", ...(await resolveProductLine(item.productId, item.variantId)) }
          : { itemType: "GIFT", productId: null, variantId: null, giftId: await resolveGift(item.giftId!) };
        await adjustInventoryForShip(warehouseId, normalized, item.quantity, session);
        await WarehouseStockMovement.create([{
          warehouseId,
          itemType: item.itemType,
          productId: normalized.itemType === "PRODUCT" ? normalized.productId : null,
          variantId: normalized.itemType === "PRODUCT" ? normalized.variantId : null,
          giftId: normalized.itemType === "GIFT" ? normalized.giftId : null,
          type: "ORDER_OUT",
          quantity: item.quantity,
          referenceType: "ORDER",
          referenceId: oid(input.orderId, "Order ID"),
          referenceCode: orderCode,
          createdBy: employeeId,
          note: input.note ?? "",
        }], { session });
      }
      await session.commitTransaction();
      return { success: true, shipments: demands };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async returnOrder(input: { orderId: string; employeeId: string; items: ShipmentItem[]; note?: string }) {
    if (!input.items.length) throw new Error("Phải chọn mặt hàng hoàn");
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const order = await Order.findById(input.orderId).select("warehouseId status orderCode").session(session).lean();
      if (!order) throw new Error("Đơn hàng không tồn tại");
      if (!order.warehouseId) throw new Error("Đơn hàng chưa gán kho");
      const warehouseId = order.warehouseId;
      const employeeId = oid(input.employeeId, "Employee ID");
      for (const item of input.items) {
        positive(item.quantity, "quantity");
        const normalized: NormalizedShipmentItem = item.itemType === "PRODUCT"
          ? { itemType: "PRODUCT", ...(await resolveProductLine(item.productId, item.variantId)) }
          : { itemType: "GIFT", productId: null, variantId: null, giftId: await resolveGift(item.giftId!) };
        await adjustInventoryForReturn(warehouseId, normalized, item.quantity, session);
        await WarehouseStockMovement.create([{
          warehouseId,
          itemType: item.itemType,
          productId: normalized.itemType === "PRODUCT" ? normalized.productId : null,
          variantId: normalized.itemType === "PRODUCT" ? normalized.variantId : null,
          giftId: normalized.itemType === "GIFT" ? normalized.giftId : null,
          type: "ORDER_RETURN",
          quantity: item.quantity,
          referenceType: "ORDER",
          referenceId: oid(input.orderId, "Order ID"),
          referenceCode: order.orderCode,
          createdBy: employeeId,
          note: input.note ?? "",
        }], { session });
      }
      await session.commitTransaction();
      return { success: true };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

export const orderShipmentService = new OrderShipmentService();

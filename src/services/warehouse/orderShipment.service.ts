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

// Validate that a gift shipment item belongs to the correct warehouse and has sufficient stock
async function validateGiftShipment(
  warehouseId: mongoose.Types.ObjectId,
  giftId: string,
  quantity: number,
  session: mongoose.ClientSession
): Promise<void> {
  const inventory = await WarehouseInventory.findOne({
    warehouseId,
    itemType: "GIFT",
    giftId: oid(giftId, "Gift ID"),
    isActive: true,
  }).session(session).lean();

  if (!inventory) {
    throw new Error(`Quà không tồn tại trong kho này: ${giftId}`);
  }
  if (inventory.availableQuantity < quantity) {
    throw new Error(`Không đủ tồn kho khả dụng cho quà ${giftId}: cần ${quantity}, có ${inventory.availableQuantity}`);
  }
}

async function adjustInventoryForShip(warehouseId: mongoose.Types.ObjectId, item: NormalizedShipmentItem, quantity: number, session: mongoose.ClientSession) {
  const where = filter(warehouseId, item);

  let updated;
  if (item.itemType === "PRODUCT") {
    // Reserved shipment: consume reserved stock
    // Check reservedQuantity >= qty
    updated = await WarehouseInventory.findOneAndUpdate(
      { ...where, reservedQuantity: { $gte: quantity } } as never,
      { $inc: { quantity: -quantity, reservedQuantity: -quantity } },
      { new: true, session }
    ).lean();
    if (!updated) {
      // Try to get more info for error message
      const current = await WarehouseInventory.findOne(where as never).lean();
      const currentQty = current?.reservedQuantity ?? 0;
      throw new Error(`Không đủ tồn đã giữ chỗ để xuất: cần ${quantity}, đã giữ ${currentQty}`);
    }
  } else {
    // Gift shipment: consume available stock
    // Check availableQuantity >= qty
    updated = await WarehouseInventory.findOneAndUpdate(
      { ...where, availableQuantity: { $gte: quantity } } as never,
      { $inc: { quantity: -quantity, availableQuantity: -quantity } },
      { new: true, session }
    ).lean();
    if (!updated) {
      const current = await WarehouseInventory.findOne(where as never).lean();
      const currentQty = current?.availableQuantity ?? 0;
      throw new Error(`Không đủ tồn kho khả dụng cho quà: cần ${quantity}, có ${currentQty}`);
    }
  }
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

// buildProductDemands builds shipment demands from order data.
// For CUSTOMER_SELECTED gifts: uses giftSelections[] from order
// For RANDOM gifts: requires actualShipments to be provided by caller
//
// RANDOM gifts must be specified in actualShipments with the actual giftId chosen by
// the warehouse employee. This function does NOT auto-select gifts.
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
      // RANDOM gift: caller must provide actualShipments with the exact gift chosen by warehouse.
      // Do NOT auto-select. Throw error if buildProductDemands is called for RANDOM gifts
      // without actualShipments.
      throw new Error("Quà RANDOM cần được chỉ định cụ thể từ kho. Vui lòng gửi actualShipments với giftId đã chọn.");
    }
  }

  return { order, demands: [...demand.values(), ...giftDemand] };
}

export class OrderShipmentService {
  /**
   * Ship an order from warehouse.
   *
   * @param input - Shipment parameters
   * @param options - Optional options including session for transaction propagation
   *
   * Transaction behavior:
   * - If options.session is provided, uses that session (reuses transaction)
   * - If options.session is not provided, creates new session/transaction (root operation)
   *
   * This allows callers like warehouseService.changeStatus() to pass their session,
   * ensuring all operations happen in a single transaction.
   */
  async shipOrder(
    input: { orderId: string; employeeId: string; actualShipments?: ShipmentItem[]; note?: string },
    options: { session?: mongoose.ClientSession } = {}
  ) {
    const ownsSession = !options.session;
    const session = options.session ?? await mongoose.startSession();

    try {
      if (ownsSession) {
        session.startTransaction();
      }
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
        // Validate gift items against warehouse inventory before deduction
        if (item.itemType === "GIFT" && item.giftId) {
          await validateGiftShipment(warehouseId, item.giftId, item.quantity, session);
        }
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
      if (ownsSession) {
        await session.commitTransaction();
      }
      return { success: true, shipments: demands };
    } catch (error) {
      if (ownsSession) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (ownsSession) {
        await session.endSession();
      }
    }
  }

  /**
   * Return order items to warehouse.
   *
   * @param input - Return parameters
   * @param options - Optional options including session for transaction propagation
   *
   * Transaction behavior:
   * - If options.session is provided, uses that session (reuses transaction)
   * - If options.session is not provided, creates new session/transaction (root operation)
   */
  async returnOrder(
    input: { orderId: string; employeeId: string; items: ShipmentItem[]; note?: string },
    options: { session?: mongoose.ClientSession } = {}
  ) {
    if (!input.items.length) throw new Error("Phải chọn mặt hàng hoàn");
    const ownsSession = !options.session;
    const session = options.session ?? await mongoose.startSession();

    try {
      if (ownsSession) {
        session.startTransaction();
      }
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
      if (ownsSession) {
        await session.commitTransaction();
      }
      return { success: true };
    } catch (error) {
      if (ownsSession) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (ownsSession) {
        await session.endSession();
      }
    }
  }
}

export const orderShipmentService = new OrderShipmentService();

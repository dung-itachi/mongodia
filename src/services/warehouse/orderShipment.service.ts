/**
 * ==================================================
 * ORDER SHIPMENT SERVICE
 * ==================================================
 *
 * Phase 4.5 refactor (Inventory Identity Consistency):
 *
 *   SHIP: buildProductDemands() PHẢI dùng cùng identity với reserve.
 *   RETURN: derive identity từ WarehouseStockMovement ORDER_OUT (KHÔNG
 *           để caller tự đoán variant/gift).
 *
 *   - Inventory flow: orderItems[].details[] → StockDemand → StockLineItem.
 *   - KHÔNG dùng ProductVariant.find(...)[0] để chọn variant.
 *   - KHÔNG dùng OrderItem.quantity legacy cho inventory.
 *   - KHÔNG dùng comboId làm inventory identity.
 *
 * ─────────────────────────────────────────────────
 *  Inventory identity (khoá duy nhất)
 * ─────────────────────────────────────────────────
 *
 *   PRODUCT có variant   → (warehouseId, itemType=PRODUCT, variantId)
 *   PRODUCT không variant → (warehouseId, itemType=PRODUCT, productId, variantId=null)
 *   GIFT                  → (warehouseId, itemType=GIFT, giftId)
 *
 * Combo KHÔNG phải inventory identity — combo chỉ là cấu trúc bán hàng.
 *
 * ─────────────────────────────────────────────────
 *  Quy tắc SHIP / RETURN
 * ─────────────────────────────────────────────────
 *
 *   SHIP:
 *     1. Derive demands từ Order.orderItems[].details[] + giftSelections[].
 *     2. Nếu actualShipments được truyền → validate là subset (cùng identity).
 *        Nếu KHÔNG truyền → dùng demands.
 *     3. Atomic deduct inventory + write ORDER_OUT movement.
 *
 *   RETURN:
 *     1. Mặc định derive items từ ORDER_OUT movements (đã ship thực sự).
 *     2. Nếu body.items được truyền → validate là subset (≤ shipped, chưa
 *        return, identity khớp).
 *     3. Atomic credit inventory + write ORDER_RETURN movement.
 */

import mongoose from "mongoose";
import { Order } from "@/models/Order";
import { WarehouseTask } from "@/models/WarehouseTask";
import WarehouseStockMovement from "@/models/WarehouseStockMovement";
import ProductVariant from "@/models/ProductVariant";
import Gift from "@/models/Gift";
import { OrderStatus } from "@/constants/orderStatus";
import { WarehouseStatus } from "@/constants/warehouseStatus";
import { OrderAction } from "@/constants/orderStatus";
import { WarehouseAction } from "@/constants/warehouseStatus";
import { isStatusTransitionAllowed } from "@/configs/order-status.config";
import { validateOrderWarehouse } from "@/config/warehouse-topology.config";
import type { Types } from "mongoose";
import Product from "@/models/Product";
import { resolveCustomerRevenue } from "@/services/order/revenueEngine.service";

import {
  reserveStock,
  releaseReservedStock,
  shipStock,
  returnStock,
} from "./stockEngine.service";
import { InventoryReferenceType } from "@/constants/inventoryStatus";
import {
  type StockDemand,
  giftKey,
  productKey,
  stockDemandKey,
} from "./stockDemand";
import {
  orderItemsToDemands,
  type NormalizedOrderItemShape,
} from "./orderDemand";
import { queryNetReserved } from "../order/orderStockWiring.helper";

// ==================================================
// Public types
// ==================================================

/**
 * Một dòng hàng đã ship / cần ship / cần return.
 *
 * Identity:
 *   - PRODUCT có variant:   variantId bắt buộc.
 *   - PRODUCT không variant: productId bắt buộc, variantId undefined/null.
 *   - GIFT:                  giftId bắt buộc.
 */
export type ShipmentItem = {
  itemType: "PRODUCT" | "GIFT";
  productId?: string;
  variantId?: string | null;
  giftId?: string;
  quantity: number;
};

export type NormalizedShipmentItem = {
  itemType: "PRODUCT" | "GIFT";
  productId: Types.ObjectId | null;
  variantId: Types.ObjectId | null;
  giftId?: Types.ObjectId | null;
};

// ==================================================
// Constants
// ==================================================

// Terminal statuses that cannot be shipped again.
const TERMINAL_ORDER_STATUSES = new Set([OrderStatus.SHIPPING, OrderStatus.DELIVERED, OrderStatus.RETURNED, OrderStatus.RECONCILED, OrderStatus.CANCELLED]);

// The WarehouseTask statuses that mean "already shipped" — idempotency guard.
const SHIPPED_WAREHOUSE_STATUSES = new Set([WarehouseStatus.SHIPPED]);

// ─── Idempotency helpers ─────────────────────────────────────────────────────

function getTerminalStatus(orderStatus: string): string | null {
  if (TERMINAL_ORDER_STATUSES.has(orderStatus as OrderStatus)) {
    return orderStatus;
  }
  return null;
}

function getWarehouseShippedStatus(warehouseStatus: string): string | null {
  if (SHIPPED_WAREHOUSE_STATUSES.has(warehouseStatus as WarehouseStatus)) {
    return warehouseStatus;
  }
  return null;
}

/** Human-readable message for each terminal status. */
export function getTerminalMessage(terminalStatus: string): string {
  switch (terminalStatus) {
    case OrderStatus.CANCELLED:
      return "Đơn đã bị hủy, không thể xuất kho.";
    case OrderStatus.SHIPPING:
      return "Đơn đã được xuất kho trước đó.";
    case OrderStatus.DELIVERED:
      return "Đơn đã giao thành công, không thể xuất kho lại.";
    case OrderStatus.RETURNED:
      return "Đơn đã hoàn trả, không thể xuất kho.";
    case OrderStatus.RECONCILED:
      return "Đơn đã đối soát, không thể xuất kho.";
    default:
      return "Đơn đã ở trạng thái cuối, không thể xuất kho.";
  }
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function oid(value: string | Types.ObjectId, field: string) {
  if (!mongoose.Types.ObjectId.isValid(value as string)) {
    throw new Error(`${field} không hợp lệ`);
  }
  return new mongoose.Types.ObjectId(value as string);
}

function positive(value: number, field: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} phải là số nguyên > 0`);
  }
  return value;
}

// ==================================================
// Helpers — convert ShipmentItem ↔ StockDemand ↔ NormalizedShipmentItem
// ==================================================

/**
 * Build normalized ShipmentItem identity từ StockDemand (đã resolve variantId).
 */
function demandToShipmentItem(d: StockDemand): ShipmentItem {
  if (d.itemType === "GIFT") {
    return {
      itemType: "GIFT",
      giftId: d.giftId?.toString(),
      quantity: d.quantity,
    };
  }
  return {
    itemType: "PRODUCT",
    productId: d.productId?.toString(),
    variantId: (d.variantId ?? null) as string | null | undefined,
    quantity: d.quantity,
  };
}

/**
 * Khoá identity cho ShipmentItem — dùng cho dedupe và so sánh subset.
 *
 *   PRODUCT có variant    → "P:<productId>:<variantId>"
 *   PRODUCT không variant → "P:<productId>:null"
 *   GIFT                  → "G:<giftId>"
 */
function shipmentItemKey(it: ShipmentItem): string {
  if (it.itemType === "GIFT") {
    return giftKey(it.giftId!);
  }
  return productKey(it.productId!, it.variantId ?? null);
}

/**
 * Validate shipment item có đầy đủ identity.
 */
function ensureShipmentItemIdentity(it: ShipmentItem): void {
  if (it.itemType === "GIFT") {
    if (!it.giftId) throw new Error("ShipmentItem GIFT phải có giftId");
    if (it.productId || it.variantId) {
      throw new Error("ShipmentItem GIFT không được có productId/variantId");
    }
  } else if (it.itemType === "PRODUCT") {
    if (!it.productId) throw new Error("ShipmentItem PRODUCT phải có productId");
    if (!it.variantId) {
      // productId only — đại diện cho product không variant
      // (variantId = null/undefined là hợp lệ).
    } else {
      // variantId !== null → phải validate variantId thuộc productId.
      // Validate khi SHIP/RETURN (có session).
    }
  } else {
    throw new Error(`itemType không hợp lệ: ${(it as { itemType: unknown }).itemType}`);
  }
  positive(it.quantity, "quantity");
}

// ==================================================
// Resolve identity: verify variant/product/gift tồn tại
// ==================================================

async function resolveProductLine(
  productId: string,
  variantId: string | null | undefined
): Promise<{ productId: Types.ObjectId | null; variantId: Types.ObjectId | null }> {
  if (variantId) {
    const variant = await ProductVariant.findOne({
      _id: oid(variantId, "Variant ID"),
      isActive: true,
    })
      .select("productId")
      .lean();
    if (!variant) {
      throw new Error("ProductVariant không tồn tại hoặc đã ngừng hoạt động");
    }
    return {
      productId: variant.productId,
      variantId: variant._id as Types.ObjectId,
    };
  }
  if (!productId) throw new Error("Thiếu productId cho mặt hàng không có variant");
  if (!(await Product.exists({ _id: oid(productId, "Product ID"), isActive: true }))) {
    throw new Error("Product không tồn tại hoặc đã ngừng hoạt động");
  }
  return { productId: oid(productId, "Product ID"), variantId: null };
}

async function resolveGift(giftId: string): Promise<Types.ObjectId> {
  if (!(await Gift.exists({ _id: oid(giftId, "Gift ID"), isActive: true }))) {
    throw new Error("Gift không tồn tại hoặc đã ngừng hoạt động");
  }
  return oid(giftId, "Gift ID");
}

// ==================================================
// Helpers — derive shipped items from WarehouseStockMovement
// ==================================================

/**
 * Aggregate `WarehouseStockMovement` (type=ORDER_OUT) cho 1 order và trả
 * về danh sách `ShipmentItem` thực sự đã ship (đã trừ gift kho random).
 *
 * Đây là source of truth cho return identity — không cần đoán từ Order.
 *
 *   Gộp nhiều ORDER_OUT cùng (warehouseId, itemType, productId,
 *   variantId, giftId) thành 1 row với quantity tổng.
 */
export async function getShippedItems(
  orderId: string | Types.ObjectId,
  warehouseId: Types.ObjectId,
  session?: mongoose.ClientSession
): Promise<ShipmentItem[]> {
  const oid_ = oid(orderId, "Order ID");

  type AggRow = {
    _id: {
      itemType: "PRODUCT" | "GIFT";
      productId: Types.ObjectId | null;
      variantId: Types.ObjectId | null;
      giftId: Types.ObjectId | null;
    };
    total: number;
  };

  const rows = await WarehouseStockMovement.aggregate<AggRow>([
    {
      $match: {
        referenceType: "ORDER",
        referenceId: oid_,
        type: "ORDER_OUT",
        warehouseId,
      },
    },
    {
      $group: {
        _id: {
          itemType: "$itemType",
          productId: "$productId",
          variantId: "$variantId",
          giftId: "$giftId",
        },
        total: { $sum: "$quantity" },
      },
    },
  ]).session(session ?? null);

  return rows.map((row) => {
    if (row._id.itemType === "GIFT") {
      return {
        itemType: "GIFT" as const,
        giftId: row._id.giftId!.toString(),
        quantity: row.total,
      };
    }
    return {
      itemType: "PRODUCT" as const,
      productId: row._id.productId?.toString() ?? "",
      variantId: row._id.variantId?.toString() ?? null,
      quantity: row.total,
    };
  });
}

/**
 * Aggregate sum movements theo identity key.
 */
async function sumMovements(
  warehouseId: Types.ObjectId,
  orderObjectId: Types.ObjectId,
  item: ShipmentItem,
  movementType: "ORDER_OUT" | "ORDER_RETURN",
  session: mongoose.ClientSession
): Promise<number> {
  const match: Record<string, unknown> = {
    referenceType: "ORDER",
    referenceId: orderObjectId,
    type: movementType,
    warehouseId,
    itemType: item.itemType,
  };
  if (item.itemType === "PRODUCT") {
    match.productId = item.productId
      ? new mongoose.Types.ObjectId(item.productId)
      : null;
    match.variantId = item.variantId
      ? new mongoose.Types.ObjectId(item.variantId)
      : null;
  } else {
    match.giftId = item.giftId
      ? new mongoose.Types.ObjectId(item.giftId)
      : null;
  }
  const agg = await WarehouseStockMovement.aggregate<{ _id: null; total: number }>([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$quantity" } } },
  ]).session(session);
  return agg[0]?.total ?? 0;
}

// ==================================================
// Demand builder — derive demands từ Order.orderItems
// ==================================================

/**
 * Load Order.orderItems[] và normalize thành `StockDemand[]`.
 *
 * Identity = variantId đã resolve + giftId. KHÔNG dùng comboId.
 * KHÔNG fallback về variants[0].
 */
async function buildProductDemandsFromOrder(
  orderId: string | Types.ObjectId
): Promise<StockDemand[]> {
  const order = await Order.findById(orderId).select("orderItems").lean();
  if (!order) throw new Error("Đơn hàng không tồn tại");
  if (!order.orderItems || order.orderItems.length === 0) {
    throw new Error("Đơn hàng chưa có sản phẩm để xuất kho");
  }
  return orderItemsToDemands(
    order.orderItems as unknown as NormalizedOrderItemShape[]
  );
}

// ==================================================
// Result types
// ==================================================

export type ShipOrderResult =
  | {
      success: true;
      alreadyShipped: boolean;
      terminalStatus?: string;
      shipments: ShipmentItem[];
    }
  | { success: false; error: string };

export type ReturnOrderResult =
  | {
      success: true;
      alreadyReturned: boolean;
      terminalStatus?: string;
      itemsReturned: ShipmentItem[];
    }
  | { success: false; error: string };

export function getReturnGuardMessage(currentStatus: string): string {
  switch (currentStatus) {
    case OrderStatus.WAIT_CONFIRM:
    case OrderStatus.CONFIRMED:
    case OrderStatus.PACKING:
      return "Đơn chưa xuất kho, không có hàng để hoàn về.";
    case OrderStatus.SHIPPING:
      return "Đơn đang giao, cần xác nhận hoàn trả trước khi nhập kho.";
    case OrderStatus.DELIVERED:
      return "Đơn đã giao thành công, không thể nhập hoàn kho.";
    case OrderStatus.RECONCILED:
      return "Đơn đã đối soát, không thể nhập hoàn kho.";
    case OrderStatus.CANCELLED:
      return "Đơn đã bị hủy, không thể nhập hoàn kho.";
    default:
      return "Trạng thái đơn không hợp lệ để nhập hoàn kho.";
  }
}

// ==================================================
// Helpers — convert ShipmentItem[] → StockLineItem[] cho Stock Engine
// ==================================================

function shipmentToStockLineItems(items: ShipmentItem[]) {
  const result: Array<{
    itemType: "PRODUCT" | "GIFT";
    productVariantId?: string;
    productId?: string;
    giftId?: string;
    quantity: number;
  }> = [];
  for (const it of items) {
    if (it.itemType === "GIFT") {
      result.push({
        itemType: "GIFT",
        giftId: it.giftId,
        quantity: it.quantity,
      });
      continue;
    }
    if (it.variantId) {
      result.push({
        itemType: "PRODUCT",
        productVariantId: it.variantId,
        quantity: it.quantity,
      });
    } else {
      result.push({
        itemType: "PRODUCT",
        productId: it.productId,
        quantity: it.quantity,
      });
    }
  }
  return result;
}

// ==================================================
// Service
// ==================================================

export class OrderShipmentService {
  /**
   * Ship an order from warehouse — THE canonical ship operation.
   *
   * In a single MongoDB transaction this method:
   *   1. Validates the order is shippable (terminal-status guard)
   *   2. Builds shipment demands from orderItems[].details[] + giftSelections[]
   *      (or validates caller-provided actualShipments is subset)
   *   3. Deducts inventory (PRODUCT → reservedQuantity, GIFT → availableQuantity)
   *   4. Creates ORDER_OUT stock movements
   *   5. Updates Order.status → SHIPPING
   *   6. Updates WarehouseTask.warehouseStatus → SHIPPED (if a task exists)
   *
   * Idempotency:
   *   - If Order.status is already SHIPPING/DELIVERED/RETURNED/RECONCILED/CANCELLED →
   *     returns { success: true, alreadyShipped: true } without making changes.
   *
   * Identity consistency:
   *   - Reserve/Ship/Return dùng cùng StockDemand (xem validateItem +
   *     orderItemsToDemands).
   *   - KHÔNG dùng comboId cho inventory.
   *   - KHÔNG dùng ProductVariant.find(...)[0] để chọn variant.
   */
  async shipOrder(
    input: {
      orderId: string;
      employeeId: string;
      actualShipments?: ShipmentItem[];
      note?: string;
    },
    options: { session?: mongoose.ClientSession } = {}
  ): Promise<ShipOrderResult> {
    const ownsSession = !options.session;
    const session = options.session ?? (await mongoose.startSession());

    try {
      if (ownsSession) {
        session.startTransaction();
      }

      // ── 1. Fetch order & validate transition ───────────────────────────────
      const order = await Order.findById(input.orderId)
        .select("warehouseId status orderCode customerId")
        .session(session)
        .lean();
      if (!order) throw new Error("Đơn hàng không tồn tại");
      if (!order.warehouseId) throw new Error("Đơn hàng chưa gán kho xuất");

      // ── 1-pre. Topology guard: Order chỉ thao tác trên KHO2 ───────────────
      await validateOrderWarehouse(order.warehouseId, session);

      // ── 1a. Workflow guard: only CONFIRMED → SHIPPING is allowed ──────────
      if (!isStatusTransitionAllowed(order.status, OrderStatus.SHIPPING)) {
        const allowed = Object.entries({
          [OrderStatus.WAIT_CONFIRM]: "Xác nhận",
          [OrderStatus.CONFIRMED]: "Giao hàng",
          [OrderStatus.SHIPPING]: "Giao thành công / Hoàn trả",
          [OrderStatus.DELIVERED]: "Đối soát",
        }).find(([s]) => s === order.status)?.[1] ?? order.status;
        throw new Error(
          `Không thể xuất kho từ trạng thái "${allowed}". Đơn cần ở trạng thái Đã xác nhận (CONFIRMED) để xuất kho.`
        );
      }

      // ── 1b. Terminal-status idempotency guard ──────────────────────────────
      const terminalStatus = getTerminalStatus(order.status);
      if (terminalStatus !== null) {
        await session.abortTransaction();
        return {
          success: true,
          alreadyShipped: true,
          terminalStatus,
          shipments: [],
        };
      }

      // ── 2. Build shipment demands ─────────────────────────────────────────
      //
      // Ưu tiên dùng `actualShipments` (caller đã biết số lượng thực tế cần ship
      // cho random gifts). Nếu KHÔNG có → derive từ orderItems[] (đã resolve
      // variantId từ validateItem).
      //
      // Identity PHẢI khớp với reserve phase (cùng variantId / giftId).
      let shipmentItems: ShipmentItem[];

      if (input.actualShipments && input.actualShipments.length > 0) {
        // Validate actualShipments là subset của demands suy ra từ Order.
        const orderDemands = await buildProductDemandsFromOrder(input.orderId);
        shipmentItems = await this.validateActualShipmentsSubset(
          input.actualShipments,
          orderDemands
        );
      } else {
        // Derive toàn bộ từ Order (identity = cùng reserve phase).
        const demands = await buildProductDemandsFromOrder(input.orderId);
        shipmentItems = demands.map(demandToShipmentItem);
      }

      // Validate mỗi item có identity rõ ràng.
      for (const it of shipmentItems) ensureShipmentItemIdentity(it);

      const employeeId = oid(input.employeeId, "Employee ID");
      const orderCode = order.orderCode ?? "";

      // ── 3. Atomic deduct inventory + write stock movements ──────────────
      // Query netReserved in transaction to check current reserved stock of this order
      const netReservedMap = await queryNetReserved(order._id, session);

      // Product: shipStock trừ quantity + reservedQuantity.
      // Gift:    shipStock trừ quantity + availableQuantity.
      for (const item of shipmentItems) {
        const normalized: NormalizedShipmentItem =
          item.itemType === "PRODUCT"
            ? {
                itemType: "PRODUCT",
                ...(await resolveProductLine(item.productId!, item.variantId)),
              }
            : {
                itemType: "GIFT",
                productId: null,
                variantId: null,
                giftId: await resolveGift(item.giftId!),
              };

        // Dynamic stock reservation if reservedQuantity is less than requested quantity
        if (item.itemType === "PRODUCT") {
          const currentlyReserved = netReservedMap.get(item.variantId ? item.variantId.toString() : "") ?? 0;
          if (currentlyReserved < item.quantity) {
            const neededReserve = item.quantity - currentlyReserved;
            await reserveStock(
              order.warehouseId.toString(),
              [
                {
                  itemType: "PRODUCT",
                  quantity: neededReserve,
                  ...(item.variantId ? { productVariantId: item.variantId } : { productId: item.productId }),
                },
              ],
              {
                actorEmployeeId: employeeId,
                referenceType: InventoryReferenceType.ORDER,
                referenceCode: orderCode,
                orderId: order._id,
                note: `Tự động giữ chỗ bổ sung trước khi xuất kho (cần ${item.quantity}, đã giữ ${currentlyReserved})`,
              },
              { session }
            );
          }
        }

        const lineItems = shipmentToStockLineItems([item]);
        // shipStock có thể chứa 0..1 line item.
        if (lineItems.length > 0) {
          await shipStock(
            order.warehouseId,
            lineItems,
            {
              actorEmployeeId: employeeId,
              referenceType: InventoryReferenceType.ORDER,
              referenceCode: orderCode,
              orderId: order._id,
              note: input.note ?? "",
            },
            { session }
          );
        }

        await WarehouseStockMovement.create(
          [
            {
              warehouseId: order.warehouseId,
              itemType: item.itemType,
              productId:
                normalized.itemType === "PRODUCT" ? normalized.productId : null,
              variantId:
                normalized.itemType === "PRODUCT" ? normalized.variantId : null,
              giftId:
                normalized.itemType === "GIFT" ? normalized.giftId : null,
              type: "ORDER_OUT",
              quantity: item.quantity,
              referenceType: "ORDER",
              referenceId: oid(input.orderId, "Order ID"),
              referenceCode: orderCode,
              createdBy: employeeId,
              note: input.note ?? "",
            },
          ],
          { session }
        );
      }

      // ── 4. Update Order.status → SHIPPING ────────────────────────────────
      await Order.findByIdAndUpdate(
        input.orderId,
        { status: OrderStatus.SHIPPING },
        { returnDocument: "after", session }
      ).session(session);

      await mongoose.model("OrderHistory").create(
        [
          {
            orderId: oid(input.orderId, "Order ID"),
            employeeId,
            action: OrderAction.SHIPPING,
            fieldName: "status",
            oldValue: order.status,
            newValue: OrderStatus.SHIPPING,
            note: input.note ?? "Xuất kho đơn hàng",
          },
        ],
        { session }
      );

      // Recalculate revenue when transitioning to SHIPPING
      await resolveCustomerRevenue(order.customerId.toString(), {
        session,
        actorEmployeeId: employeeId,
      });

      // ── 5. Update WarehouseTask.warehouseStatus → SHIPPED (if exists) ──────
      const existingTask = await WarehouseTask.findOne({
        orderId: oid(input.orderId, "Order ID"),
      })
        .session(session)
        .lean();
      if (
        existingTask &&
        getWarehouseShippedStatus(existingTask.warehouseStatus) === null
      ) {
        await WarehouseTask.findByIdAndUpdate(
          existingTask._id,
          { warehouseStatus: WarehouseStatus.SHIPPED },
          { returnDocument: "after", session }
        ).session(session);

        await mongoose.model("WarehouseHistory").create(
          [
            {
              warehouseTaskId: existingTask._id,
              employeeId,
              action: WarehouseAction.SHIPPED,
              oldValue: existingTask.warehouseStatus,
              newValue: WarehouseStatus.SHIPPED,
              note: input.note ?? "Bàn giao shipper",
            },
          ],
          { session }
        );
      }

      if (ownsSession) {
        await session.commitTransaction();
      }
      return { success: true, alreadyShipped: false, shipments: shipmentItems };
    } catch (error) {
      if (ownsSession) {
        await session.abortTransaction();
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Xuất kho thất bại",
      };
    } finally {
      if (ownsSession) {
        session.endSession();
      }
    }
  }

  /**
   * Validate actualShipments là subset của derived demands.
   *
   *   - Mỗi actualShipment phải có identity (itemType + productId+variantId HOẶC giftId)
   *     khớp với 1 demand trong `derivedDemands`.
   *   - Tổng quantity mỗi identity key ≤ derived demand quantity.
   *   - KHÔNG cho phép identity không tồn tại trong derived demands.
   */
  private async validateActualShipmentsSubset(
    actualShipments: ShipmentItem[],
    derivedDemands: StockDemand[]
  ): Promise<ShipmentItem[]> {
    // Sum derived quantities theo key.
    const derivedMap = new Map<string, number>();
    for (const d of derivedDemands) {
      const key = stockDemandKey(d);
      derivedMap.set(key, (derivedMap.get(key) ?? 0) + d.quantity);
    }

    // Sum actual quantities theo key.
    const actualMap = new Map<string, { qty: number; item: ShipmentItem }>();
    for (const it of actualShipments) {
      ensureShipmentItemIdentity(it);
      const key = shipmentItemKey(it);
      const existing = actualMap.get(key);
      if (existing) {
        existing.qty += it.quantity;
      } else {
        actualMap.set(key, { qty: it.quantity, item: it });
      }
    }

    // Mỗi actual key phải tồn tại trong derived.
    const result: ShipmentItem[] = [];
    for (const [key, { qty, item }] of actualMap) {
      const max = derivedMap.get(key);
      if (max === undefined) {
        throw new Error(
          `Mặt hàng ${item.itemType} (identity=${key}) không tồn tại trong đơn hàng. Không thể ship hàng không có trong orderItems.`
        );
      }
      if (qty > max) {
        throw new Error(
          `Số lượng ship vượt quá yêu cầu: ${item.itemType} (identity=${key}) yêu cầu tối đa ${max}, ship ${qty}.`
        );
      }
      result.push({ ...item, quantity: qty });
    }

    // Phải có ít nhất 1 item (orderItems có derived demands) nhưng caller
    // không ship gì → reject.
    if (result.length === 0 && derivedDemands.length > 0) {
      throw new Error("actualShipments rỗng — không thể ship đơn có yêu cầu.");
    }

    return result;
  }

  /**
   * Return order items to warehouse.
   *
   * Identity PHẢI trùng với ORDER_OUT đã ghi trước đó.
   *
   * Default: derive tất cả items từ ORDER_OUT movements (shipped items).
   *
   * Nếu `input.items` được truyền:
   *   - Validate là subset (≤ shipped, chưa return, identity khớp).
   *   - Reject identity không có trong ORDER_OUT.
   */
  async returnOrder(
    input: {
      orderId: string;
      employeeId: string;
      items: ShipmentItem[];
      note?: string;
    },
    options: { session?: mongoose.ClientSession } = {}
  ): Promise<ReturnOrderResult> {
    if (!input.items.length) {
      return { success: false, error: "Phải chọn mặt hàng hoàn" };
    }

    const ownsSession = !options.session;
    const session = options.session ?? (await mongoose.startSession());

    try {
      if (ownsSession) {
        session.startTransaction();
      }

      // ── 1. Fetch order & status guard ─────────────────────────────────────
      const order = await Order.findById(input.orderId)
        .select("warehouseId status orderCode")
        .session(session)
        .lean();
      if (!order) throw new Error("Đơn hàng không tồn tại");
      if (!order.warehouseId) throw new Error("Đơn hàng chưa gán kho");
      const warehouseId = order.warehouseId;

      // ── 1-pre. Topology guard ─────────────────────────────────────────────
      await validateOrderWarehouse(warehouseId, session);

      const employeeId = oid(input.employeeId, "Employee ID");

      // RECONCILED / CANCELLED: idempotent no-op.
      if (
        order.status === OrderStatus.RECONCILED ||
        order.status === OrderStatus.CANCELLED
      ) {
        await session.abortTransaction();
        return {
          success: true,
          alreadyReturned: true,
          terminalStatus: order.status,
          itemsReturned: [],
        };
      }

      // Only RETURNED orders can have inventory restored.
      if (order.status !== OrderStatus.RETURNED) {
        throw new Error(getReturnGuardMessage(order.status));
      }

      // ── 2. Aggregate requested quantities by identity key ────────────────
      type ItemKey = string;
      const requested = new Map<ItemKey, number>();
      const requestedItems = new Map<ItemKey, ShipmentItem>();
      for (const it of input.items) {
        ensureShipmentItemIdentity(it);
        const k = shipmentItemKey(it);
        requested.set(k, (requested.get(k) ?? 0) + it.quantity);
        if (!requestedItems.has(k)) requestedItems.set(k, it);
      }

      // ── 3. Per-item double-return guard + subset check ───────────────────
      const orderObjectId = oid(input.orderId, "Order ID");

      for (const [k, item] of [...requestedItems]) {
        const shipped = await sumMovements(
          warehouseId,
          orderObjectId,
          item,
          "ORDER_OUT",
          session
        );
        if (shipped === 0) {
          throw new Error(
            `Mặt hàng ${item.itemType} (identity=${k}) chưa từng ORDER_OUT — không thể return.`
          );
        }
        const alreadyReturned = await sumMovements(
          warehouseId,
          orderObjectId,
          item,
          "ORDER_RETURN",
          session
        );
        const remaining = Math.max(0, shipped - alreadyReturned);
        const want = requested.get(k) ?? 0;

        if (remaining === 0) {
          // Already fully returned. Drop from request (idempotent per item).
          requested.delete(k);
          requestedItems.delete(k);
          continue;
        }
        if (want > remaining) {
          throw new Error(
            `Mặt hàng đã hoàn ${alreadyReturned}/${shipped}. Chỉ có thể hoàn thêm tối đa ${remaining}.`
          );
        }
      }

      // If every requested item was already fully returned, no-op.
      if (requested.size === 0) {
        await session.abortTransaction();
        return {
          success: true,
          alreadyReturned: true,
          terminalStatus: OrderStatus.RETURNED,
          itemsReturned: [],
        };
      }

      // ── 4. Apply inventory + write movements + history (atomic) ───────────
      const itemsReturned: ShipmentItem[] = [];
      for (const [k, item] of requestedItems) {
        const qty = requested.get(k)!;
        const normalized: NormalizedShipmentItem =
          item.itemType === "PRODUCT"
            ? {
                itemType: "PRODUCT",
                ...(await resolveProductLine(item.productId!, item.variantId!)),
              }
            : {
                itemType: "GIFT",
                productId: null,
                variantId: null,
                giftId: await resolveGift(item.giftId!),
              };

        const lineItems = shipmentToStockLineItems([item]);
        if (lineItems.length > 0) {
          await returnStock(
            warehouseId,
            lineItems,
            {
              actorEmployeeId: employeeId,
              referenceType: InventoryReferenceType.ORDER,
              referenceCode: order.orderCode ?? "",
              orderId: orderObjectId,
              note: input.note ?? "",
            },
            { session }
          );
        }

        await WarehouseStockMovement.create(
          [
            {
              warehouseId,
              itemType: item.itemType,
              productId:
                normalized.itemType === "PRODUCT" ? normalized.productId : null,
              variantId:
                normalized.itemType === "PRODUCT" ? normalized.variantId : null,
              giftId:
                normalized.itemType === "GIFT" ? normalized.giftId : null,
              type: "ORDER_RETURN",
              quantity: qty,
              referenceType: "ORDER",
              referenceId: orderObjectId,
              referenceCode: order.orderCode ?? "",
              createdBy: employeeId,
              note: input.note ?? "",
            },
          ],
          { session }
        );

        itemsReturned.push({ ...item, quantity: qty });
      }

      await mongoose.model("OrderHistory").create(
        [
          {
            orderId: orderObjectId,
            employeeId,
            action: OrderAction.RETURNED,
            fieldName: "warehouse",
            oldValue: null,
            newValue: "Nhập hoàn kho",
            note:
              input.note ??
              `Nhập hoàn kho ${itemsReturned.length} mặt hàng (${itemsReturned.reduce(
                (s, i) => s + i.quantity,
                0
              )} đơn vị)`,
          },
        ],
        { session }
      );

      // ── 5. Mark order đã được nhập hoàn kho ──────────────────────────────
      // Set `whReturned = true` để UI Overview bucket = "returned" (Đã hoàn
      // kho) thay vì "returning" (Đang hoàn về). Phải làm CUỐI transaction
      // (sau khi returnStock + history đã OK) để rollback nếu có lỗi.
      await Order.findByIdAndUpdate(
        input.orderId,
        {
          whReturned: true,
          returnedToStockAt: new Date(),
          returnedToStockBy: employeeId,
        },
        { session }
      );

      if (ownsSession) {
        await session.commitTransaction();
      }
      return { success: true, alreadyReturned: false, itemsReturned };
    } catch (error) {
      if (ownsSession) {
        await session.abortTransaction();
      }
      const message =
        error instanceof Error ? error.message : "Hoàn kho thất bại";
      const code = (error as { code?: number; codeName?: string } | null)?.code;
      if (
        code === 112 ||
        (error as { codeName?: string } | null)?.codeName === "WriteConflict"
      ) {
        return {
          success: false,
          error:
            "Đơn đang được xử lý bởi thao tác khác. Vui lòng thử lại sau vài giây.",
        };
      }
      return { success: false, error: message };
    } finally {
      if (ownsSession) {
        session.endSession();
      }
    }
  }

  /**
   * Reserve stock cho Order (gọi từ POST /api/orders).
   *
   * Helper public để route layer gọi 1 cách rõ ràng. Identity được derive
   * từ `validatedOrderItems` (đã resolve variantId).
   *
   * Returns: tổng số mặt hàng đã reserve (PRODUCT variant + GIFT).
   */
  async reserveOrderStock(
    input: {
      orderId: string;
      employeeId: string;
      warehouseId: string;
      demands: StockDemand[];
      orderCode: string;
      note?: string;
    },
    options: { session?: mongoose.ClientSession } = {}
  ): Promise<number> {
    if (input.demands.length === 0) return 0;
    const session = options.session;
    const lineItems: Array<{
      itemType: "PRODUCT" | "GIFT";
      productVariantId?: string;
      giftId?: string;
      quantity: number;
    }> = [];
    for (const d of input.demands) {
      if (d.itemType === "GIFT") {
        if (!d.giftId) throw new Error("GIFT demand thiếu giftId");
        lineItems.push({
          itemType: "GIFT",
          giftId: d.giftId.toString(),
          quantity: d.quantity,
        });
        continue;
      }
      if (!d.variantId) {
        // Product không variant — Stock Engine chưa hỗ trợ trực tiếp.
        // Caller (route layer) phải dùng `WarehouseInventory.findOneAndUpdate`
        // cho trường hợp này. Hiện tại skip — reserve sẽ được xử lý qua
        // shipment phase nếu cần.
        continue;
      }
      lineItems.push({
        itemType: "PRODUCT",
        productVariantId: d.variantId.toString(),
        quantity: d.quantity,
      });
    }

    if (lineItems.length === 0) return 0;

    await reserveStock(
      input.warehouseId,
      lineItems,
      {
        actorEmployeeId: input.employeeId,
        referenceType: InventoryReferenceType.ORDER,
        referenceCode: input.orderCode,
        orderId: input.orderId,
        note: input.note ?? "",
      },
      { session }
    );

    return lineItems.length;
  }

  /**
   * Release reserved stock (cancel trước ship).
   */
  async releaseOrderStock(
    input: {
      orderId: string;
      employeeId: string;
      warehouseId: string;
      demands: StockDemand[];
      orderCode: string;
      note?: string;
    },
    options: { session?: mongoose.ClientSession } = {}
  ): Promise<number> {
    if (input.demands.length === 0) return 0;
    const session = options.session;
    const lineItems: Array<{
      itemType: "PRODUCT" | "GIFT";
      productVariantId?: string;
      giftId?: string;
      quantity: number;
    }> = [];
    for (const d of input.demands) {
      if (d.itemType === "GIFT") {
        if (!d.giftId) throw new Error("GIFT demand thiếu giftId");
        lineItems.push({
          itemType: "GIFT",
          giftId: d.giftId.toString(),
          quantity: d.quantity,
        });
        continue;
      }
      if (!d.variantId) continue;
      lineItems.push({
        itemType: "PRODUCT",
        productVariantId: d.variantId.toString(),
        quantity: d.quantity,
      });
    }

    if (lineItems.length === 0) return 0;

    await releaseReservedStock(
      input.warehouseId,
      lineItems,
      {
        actorEmployeeId: input.employeeId,
        referenceType: InventoryReferenceType.ORDER,
        referenceCode: input.orderCode,
        orderId: input.orderId,
        note: input.note ?? "",
      },
      { session }
    );

    return lineItems.length;
  }
}

export const orderShipmentService = new OrderShipmentService();
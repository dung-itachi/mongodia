/**
 * ==================================================
 * POST /api/warehouses/[id]/import-stock
 * ==================================================
 *
 * Manual INBOUND — nhập kho thủ công (Admin / Kho).
 *
 * Body:
 *   {
 *     productVariantId?: string,  // Nhập theo variant cụ thể
 *     comboId?: string,           // Nhập theo combo
 *     quantity: number,           // Số lượng nhập (>0)
 *     note?: string               // Ghi chú
 *   }
 *
 * Cần cung cấp 1 trong 2: comboId hoặc productVariantId.
 * Hiện tại Inventory chỉ track theo `productVariantId`, nên comboId được
 * map sang một Inventory row với productVariantId = comboId (xem note trong code).
 *
 * Logic:
 *  - Insert 1 row InventoryHistory (INBOUND/SUPPLIER_RECEIVED)
 *  - Update Inventory.quantity (+quantity) + Inventory.availableQuantity
 *  - Trả về { beforeQuantity, changeQuantity, afterQuantity, referenceCode }
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Inventory from "@/models/Inventory";
import { InventoryHistory } from "@/models/InventoryHistory";
import Warehouse from "@/models/Warehouse";
import {
  InventoryAction,
  InventoryReason,
  InventoryReferenceType,
  InventorySource,
  InventoryTransactionType,
} from "@/constants/inventoryStatus";
import { success, error as errorResponse } from "@/utils/response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("warehouse.update")) {
      return errorResponse("Bạn không có quyền nhập kho", 403);
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID kho không hợp lệ", 400);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const { comboId, productVariantId, quantity, note } = (body ?? {}) as {
      comboId?: string;
      productVariantId?: string;
      quantity?: number;
      note?: string;
    };

    if (!comboId && !productVariantId) {
      return errorResponse("Cần cung cấp comboId hoặc productVariantId", 400);
    }
    if (comboId && productVariantId) {
      return errorResponse("Chỉ được chọn 1 trong comboId hoặc productVariantId", 400);
    }
    const qty = Math.floor(Number(quantity ?? 0));
    if (!qty || qty <= 0) {
      return errorResponse("Số lượng phải > 0", 400);
    }

    const warehouse = await Warehouse.findById(id).select("_id code name isActive").lean();
    if (!warehouse || !warehouse.isActive) {
      return errorResponse("Kho không tồn tại hoặc đã ngưng hoạt động", 404);
    }

    await connectDB();

    const variantId =
      productVariantId && mongoose.Types.ObjectId.isValid(productVariantId)
        ? new mongoose.Types.ObjectId(productVariantId)
        : undefined;
    const comboObjId =
      comboId && mongoose.Types.ObjectId.isValid(comboId)
        ? new mongoose.Types.ObjectId(comboId)
        : undefined;

    const variantRef: mongoose.Types.ObjectId | undefined =
      variantId ?? comboObjId;
    if (!variantRef) {
      return errorResponse("ID sản phẩm không hợp lệ", 400);
    }
    const query: Record<string, unknown> = {
      warehouseId: warehouse._id,
      productVariantId: variantRef,
      isActive: true,
    };

    let inv = await Inventory.findOne(query);
    if (!inv) {
      inv = await Inventory.create({
        warehouseId: warehouse._id,
        productVariantId: variantRef,
        quantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        isActive: true,
      });
    }

    const beforeQuantity = inv.quantity ?? 0;
    const afterQuantity = beforeQuantity + qty;

    inv.quantity = afterQuantity;
    inv.availableQuantity = (inv.availableQuantity ?? 0) + qty;
    await inv.save();

    const employeeId =
      currentUser.employee && mongoose.Types.ObjectId.isValid(String(currentUser.employee._id))
        ? new mongoose.Types.ObjectId(String(currentUser.employee._id))
        : new mongoose.Types.ObjectId();

    const referenceCode = `WH${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;

    await InventoryHistory.create({
      warehouseId: warehouse._id,
      productVariantId: variantRef,
      comboId: comboObjId ?? undefined,
      employeeId,
      transactionType: InventoryTransactionType.INBOUND,
      action: InventoryAction.INBOUND,
      reason: InventoryReason.SUPPLIER_RECEIVED,
      source: InventorySource.MANUAL,
      referenceType: InventoryReferenceType.PURCHASE,
      referenceCode,
      beforeQuantity,
      changeQuantity: qty,
      afterQuantity,
      reservedChange: 0,
      note: note ?? "",
    });

    return success({
      beforeQuantity,
      changeQuantity: qty,
      afterQuantity,
      referenceCode,
    }, "Nhập kho thành công");
  } catch (err) {
    console.error("Import Stock Error:", err);
    return errorResponse("Không thể nhập kho", 500);
  }
}
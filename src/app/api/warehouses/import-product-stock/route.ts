/**
 * ==================================================
 * POST /api/warehouses/import-product-stock
 * ==================================================
 *
 * Manual INBOUND — "+ Thêm SP kho" theo `mongolia-crm (7).html`:
 * nhập 1 sản phẩm (variant) vào TẤT CẢ kho đang active (kho mặc định).
 *
 * Body:
 *   {
 *     productVariantId: string,  // (bắt buộc) variant cần nhập
 *     quantity: number,          // (bắt buộc) số lượng nhập (>0)
 *     note?: string              // ghi chú
 *   }
 *
 * Logic:
 *  - Tìm TẤT CẢ Warehouse đang active (ít nhất 1).
 *  - Với mỗi warehouse: tạo/cập nhật Inventory row và ghi 1 History row.
 *  - Trả về tổng số lượng đã nhập + số kho đã cập nhật.
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

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("warehouse.update")) {
      return errorResponse("Bạn không có quyền nhập kho", 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const { productVariantId, quantity, note } = (body ?? {}) as {
      productVariantId?: string;
      quantity?: number;
      note?: string;
    };

    if (!productVariantId || !mongoose.Types.ObjectId.isValid(productVariantId)) {
      return errorResponse("productVariantId không hợp lệ", 400);
    }

    const qty = Math.floor(Number(quantity ?? 0));
    if (!qty || qty <= 0) {
      return errorResponse("Số lượng phải > 0", 400);
    }

    await connectDB();

    const warehouses = await Warehouse.find({ isActive: true })
      .select("_id")
      .lean();

    if (warehouses.length === 0) {
      return errorResponse("Chưa có kho nào đang active", 400);
    }

    const variantRef = new mongoose.Types.ObjectId(productVariantId);

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

    let updatedWarehouses = 0;
    let totalChange = 0;

    for (const w of warehouses) {
      const query = {
        warehouseId: w._id,
        productVariantId: variantRef,
        isActive: true,
      };
      let inv = await Inventory.findOne(query);
      if (!inv) {
        inv = await Inventory.create({
          warehouseId: w._id,
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

      await InventoryHistory.create({
        warehouseId: w._id,
        productVariantId: variantRef,
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

      updatedWarehouses += 1;
      totalChange += qty;
    }

    return success({
      updatedWarehouses,
      totalChange,
      referenceCode,
    }, `Đã nhập vào ${updatedWarehouses} kho`);
  } catch (err) {
    console.error("Import Product Stock Error:", err);
    return errorResponse("Không thể nhập sản phẩm vào kho", 500);
  }
}
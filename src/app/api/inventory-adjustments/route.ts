import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Inventory from "@/models/Inventory";
import InventoryAdjustment from "@/models/InventoryAdjustment";
import InventoryTransaction from "@/models/InventoryTransaction";

import {
  mapInventoryAdjustmentList,
  mapInventoryAdjustment,
} from "@/mappers/inventory-adjustment.mapper";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

import {
  createInventoryAdjustmentSchema,
} from "@/utils/validator";

/**
 * ==================================================
 * LEGACY INVENTORY ADJUSTMENT API
 * ==================================================
 *
 * @deprecated
 * This endpoint is DEPRECATED and should not be used.
 *
 * Replacement:
 *   POST /api/warehouse/adjustments
 *   → warehouse-adjustment.service
 *   → WarehouseInventory (SoT)
 *
 * This endpoint writes to the legacy Inventory collection
 * instead of WarehouseInventory (SoT). It is kept for backward
 * compatibility with historical data but should not be used
 * for new adjustments.
 *
 * Audit (Phase 5): No active callers found in codebase.
 * ==================================================
 */

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "inventory-adjustment.view"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xem điều chỉnh tồn kho",
        403
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const inventoryId = searchParams.get("inventoryId") ?? "";
    const employeeId = searchParams.get("employeeId") ?? "";
    const type = searchParams.get("type") ?? "";

    const filter: Record<string, unknown> = {};

    if (inventoryId) {
      filter.inventoryId = inventoryId;
    }

    if (employeeId) {
      filter.employeeId = employeeId;
    }

    if (type) {
      filter.type = type;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InventoryAdjustment.find(filter)
        .populate({
          path: "inventoryId",
          populate: [
            {
              path: "warehouseId",
              select: "_id code name",
            },
            {
              path: "productVariantId",
              populate: [
                {
                  path: "productId",
                  select: "_id code name",
                },
                {
                  path: "variantValues",
                  select: "_id code name",
                },
              ],
              select: "_id sku barcode productId variantValues",
            },
          ],
          select:
            "_id warehouseId productVariantId",
        })
        .populate(
          "employeeId",
          "_id employeeCode fullName"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InventoryAdjustment.countDocuments(filter),
    ]);

    return success({
      items: items.map(mapInventoryAdjustmentList),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error(
      "Inventory Adjustment List Error:",
      error
    );

    return errorResponse(
      "Không thể lấy danh sách điều chỉnh tồn kho",
      500
    );
  }
}

/**
 * @deprecated Use POST /api/warehouse/adjustments instead.
 * This endpoint writes to legacy Inventory collection instead of WarehouseInventory (SoT).
 * Phase 5 Audit: No active callers found.
 */
export async function POST(request: Request) {
  const session = await mongoose.startSession();

  console.warn("[DEPRECATED] POST /api/inventory-adjustments called. Use POST /api/warehouse/adjustments instead.");

  try {
    session.startTransaction();

    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "inventory-adjustment.create"
      )
    ) {
      await session.abortTransaction();
      session.endSession();

      return errorResponse(
        "Bạn không có quyền tạo điều chỉnh tồn kho",
        403
      );
    }

    await connectDB();

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      await session.abortTransaction();
      session.endSession();

      return errorResponse(
        "Dữ liệu không hợp lệ",
        400
      );
    }

    const parsedBody =
      createInventoryAdjustmentSchema.safeParse(body);

    if (!parsedBody.success) {
      await session.abortTransaction();
      session.endSession();

      return errorResponse(
        parsedBody.error.issues[0]?.message ??
          "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    if (
      !mongoose.Types.ObjectId.isValid(data.inventoryId)
    ) {
      await session.abortTransaction();
      session.endSession();

      return errorResponse(
        "ID tồn kho không hợp lệ",
        400
      );
    }

    const inventory = await Inventory.findById(
      data.inventoryId
    ).session(session);

    if (!inventory) {
      await session.abortTransaction();
      session.endSession();

      return errorResponse(
        "Tồn kho không tồn tại",
        404
      );
    }

    if (data.type === "OUT") {
      if (data.quantity > inventory.availableQuantity) {
        await session.abortTransaction();
        session.endSession();

        return errorResponse(
          `Số lượng xuất (${data.quantity}) vượt quá số lượng khả dụng (${inventory.availableQuantity})`,
          400
        );
      }
    }

    let newQuantity = inventory.quantity;
    let newAvailableQuantity = inventory.availableQuantity;

    if (data.type === "IN") {
      newQuantity += data.quantity;
      newAvailableQuantity += data.quantity;
    } else if (data.type === "OUT") {
      newQuantity -= data.quantity;
      newAvailableQuantity -= data.quantity;
    } else if (data.type === "ADJUST") {
      if (data.quantity < inventory.reservedQuantity) {
        await session.abortTransaction();
        session.endSession();

        return errorResponse(
          "Số lượng điều chỉnh không được nhỏ hơn số lượng đã giữ.",
          400
        );
      }

      newQuantity = data.quantity;
      newAvailableQuantity =
        data.quantity - inventory.reservedQuantity;
    }

    // Use type assertion to bypass strict Mongoose typing for model.create with session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adjustmentDoc = await (InventoryAdjustment as any).create(
      [
        {
          inventoryId: data.inventoryId,
          type: data.type,
          quantity: data.quantity,
          reason: data.reason,
          employeeId: currentUser.employee._id,
          note: data.note ?? "",
        },
      ],
      { session }
    );

    await Inventory.updateOne(
      { _id: data.inventoryId },
      {
        $set: {
          quantity: newQuantity,
          availableQuantity: newAvailableQuantity,
        },
      },
      { session }
    );

    const beforeQuantity = inventory.quantity;
    const createdAdjustment = adjustmentDoc[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (InventoryTransaction as any).create(
      [
        {
          inventoryId: inventory._id,
          adjustmentId: createdAdjustment._id,
          type: data.type as "IN" | "OUT" | "ADJUST",
          quantity: data.quantity,
          beforeQuantity,
          afterQuantity: newQuantity,
          employeeId: currentUser.employee._id,
          referenceNo: createdAdjustment._id.toString(),
          note: data.note ?? "",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Fetch populated result
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const populatedAdjustment: any = await InventoryAdjustment.findById(
      createdAdjustment._id
    )
      .populate({
        path: "inventoryId",
        populate: [
          {
            path: "warehouseId",
            select: "_id code name",
          },
          {
            path: "productVariantId",
            populate: [
              {
                path: "productId",
                select: "_id code name",
              },
              {
                path: "variantValues",
                select: "_id code name",
              },
            ],
            select: "_id sku barcode productId variantValues",
          },
        ],
        select: "_id warehouseId productVariantId",
      })
      .populate(
        "employeeId",
        "_id employeeCode fullName"
      )
      .lean();

    return success(
      mapInventoryAdjustment(populatedAdjustment),
      "Tạo điều chỉnh tồn kho thành công"
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error(
      "Create Inventory Adjustment Error:",
      error
    );

    return errorResponse(
      "Không thể tạo điều chỉnh tồn kho",
      500
    );
  }
}

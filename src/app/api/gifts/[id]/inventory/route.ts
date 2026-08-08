import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { mapGift } from "@/mappers/gift.mapper";
import { mapGiftInventoryHistory } from "@/mappers/gift-inventory-history.mapper";
import giftService, { GiftServiceError } from "@/services/gift.service";
import {
  adjustGiftInventorySchema,
  importGiftInventorySchema,
} from "@/utils/validator";
import { error as errorResponse, success } from "@/utils/response";
import { GiftInventoryHistoryType } from "@/models/GiftInventoryHistory";

function getEmployeeId(currentUser: Awaited<ReturnType<typeof getCurrentUser>>) {
  return String(currentUser.employee._id);
}

function serviceErrorResponse(error: unknown) {
  if (error instanceof GiftServiceError) {
    return errorResponse(error.message, error.statusCode);
  }
  throw error;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("gift.view")) {
      return errorResponse("Bạn không có quyền xem lịch sử tồn quà tặng", 403);
    }

    await connectDB();
    const { id } = await params;
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize")) || 20));
    const result = await giftService.getInventoryHistory(id, {
      skip: (page - 1) * pageSize,
      limit: pageSize,
    });

    return success({
      items: result.items.map(mapGiftInventoryHistory),
      total: result.total,
      page,
      pageSize,
    });
  } catch (error) {
    try {
      return serviceErrorResponse(error);
    } catch (unexpectedError) {
      console.error("Gift inventory history error:", unexpectedError);
      return errorResponse("Không thể lấy lịch sử tồn quà tặng", 500);
    }
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("gift.update")) {
      return errorResponse("Bạn không có quyền thay đổi tồn quà tặng", 403);
    }

    await connectDB();
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const operation = (body as { operation?: unknown }).operation;
    if (operation === "IMPORT") {
      const parsed = importGiftInventorySchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", 400);
      }
      const result = await giftService.changeInventory(id, {
        type: GiftInventoryHistoryType.IMPORT,
        quantityChange: parsed.data.quantity,
        note: parsed.data.note,
        createdBy: getEmployeeId(currentUser),
      });
      return success(
        { gift: mapGift(result.gift), history: mapGiftInventoryHistory(result.history) },
        "Nhập tồn quà tặng thành công"
      );
    }

    if (operation === "ADJUSTMENT") {
      const parsed = adjustGiftInventorySchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", 400);
      }
      const quantityChange =
        parsed.data.direction === "DECREASE" ? -parsed.data.quantity : parsed.data.quantity;
      const result = await giftService.changeInventory(id, {
        type: GiftInventoryHistoryType.ADJUSTMENT,
        quantityChange,
        note: parsed.data.note,
        createdBy: getEmployeeId(currentUser),
      });
      return success(
        { gift: mapGift(result.gift), history: mapGiftInventoryHistory(result.history) },
        "Điều chỉnh tồn quà tặng thành công"
      );
    }

    return errorResponse("Loại thay đổi tồn không hợp lệ", 400);
  } catch (error) {
    try {
      return serviceErrorResponse(error);
    } catch (unexpectedError) {
      console.error("Gift inventory change error:", unexpectedError);
      return errorResponse("Không thể thay đổi tồn quà tặng", 500);
    }
  }
}

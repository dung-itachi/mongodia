/**
 * API: /api/gifts/[id]
 *
 * Sprint 8.x - Gift Management
 *
 * GET    : Get gift by id
 * PUT    : Update gift
 * DELETE : Deactivate gift (soft delete)
 */

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import giftService, { GiftServiceError } from "@/services/gift.service";
import { mapGift } from "@/mappers/gift.mapper";
import { error as errorResponse, success } from "@/utils/response";
import { updateGiftSchema } from "@/utils/validator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("gift.view")) {
      return errorResponse("Bạn không có quyền xem quà tặng", 403);
    }

    await connectDB();

    const { id } = await params;
    try {
      const gift = await giftService.getGift(id);
      return success(mapGift(gift));
    } catch (e) {
      if (e instanceof GiftServiceError) {
        return errorResponse(e.message, e.statusCode);
      }
      throw e;
    }
  } catch (error) {
    console.error("Gift Detail Error:", error);
    return errorResponse("Không thể lấy thông tin quà tặng", 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("gift.update")) {
      return errorResponse("Bạn không có quyền cập nhật quà tặng", 403);
    }

    await connectDB();

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const parsed = updateGiftSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        400
      );
    }

    try {
      const gift = await giftService.updateGift(id, parsed.data);
      return success(mapGift(gift), "Cập nhật quà tặng thành công");
    } catch (e) {
      if (e instanceof GiftServiceError) {
        return errorResponse(e.message, e.statusCode);
      }
      throw e;
    }
  } catch (error) {
    console.error("Update Gift Error:", error);
    return errorResponse("Không thể cập nhật quà tặng", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("gift.delete")) {
      return errorResponse("Bạn không có quyền xóa quà tặng", 403);
    }

    await connectDB();

    const { id } = await params;

    try {
      await giftService.deactivateGift(id);
      return success(null, "Xóa quà tặng thành công");
    } catch (e) {
      if (e instanceof GiftServiceError) {
        return errorResponse(e.message, e.statusCode);
      }
      throw e;
    }
  } catch (error) {
    console.error("Delete Gift Error:", error);
    return errorResponse("Không thể xóa quà tặng", 500);
  }
}

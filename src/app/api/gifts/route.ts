/**
 * API: /api/gifts
 *
 * Sprint 8.x - Gift Management
 *
 * GET  : List gifts (filter active/search/pagination)
 * POST : Create gift
 */

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import giftService, { GiftServiceError } from "@/services/gift.service";
import { mapGift } from "@/mappers/gift.mapper";
import { error as errorResponse, success } from "@/utils/response";
import { createGiftSchema } from "@/utils/validator";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("gift.view")) {
      return errorResponse("Bạn không có quyền xem quà tặng", 403);
    }

    await connectDB();

    const url = new URL(request.url);
    const isActiveParam = url.searchParams.get("isActive");
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") ?? "100", 10);

    let isActive: boolean | null = null;
    if (isActiveParam === "true") isActive = true;
    else if (isActiveParam === "false") isActive = false;

    const { items, total } = await giftService.listGifts({
      isActive,
      search,
      skip: (page - 1) * pageSize,
      limit: pageSize,
    });

    return success({
      items: items.map(mapGift),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Gift List Error:", error);
    return errorResponse("Không thể lấy danh sách quà tặng", 500);
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser.permissions.includes("gift.create")) {
      return errorResponse("Bạn không có quyền tạo quà tặng", 403);
    }

    await connectDB();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const parsed = createGiftSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        400
      );
    }

    try {
      const gift = await giftService.createGift(parsed.data);
      return success(mapGift(gift), "Tạo quà tặng thành công");
    } catch (e) {
      if (e instanceof GiftServiceError) {
        return errorResponse(e.message, e.statusCode);
      }
      throw e;
    }
  } catch (error) {
    console.error("Create Gift Error:", error);
    return errorResponse("Không thể tạo quà tặng", 500);
  }
}

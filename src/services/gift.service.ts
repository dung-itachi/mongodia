/**
 * Gift Service (Sprint 8.x - Gift Management)
 *
 * Business logic layer:
 * - Validate uniqueness (case-insensitive)
 * - Orchestrate repository + return shaped data
 */

import giftRepository from "@/repositories/gift.repository";
import type { IGift } from "@/models/Gift";

export class GiftServiceError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
    this.name = "GiftServiceError";
  }
}

const giftService = {
  /**
   * Lấy danh sách Gift với filter.
   */
  async listGifts(params: {
    isActive?: boolean | null;
    search?: string | null;
    skip?: number;
    limit?: number;
  } = {}) {
    return giftRepository.findMany({
      isActive: params.isActive,
      search: params.search,
      skip: params.skip,
      limit: params.limit,
    });
  },

  /**
   * Lấy chi tiết Gift.
   */
  async getGift(id: string) {
    const gift = await giftRepository.findById(id);
    if (!gift) {
      throw new GiftServiceError("Không tìm thấy quà tặng", 404);
    }
    return gift;
  },

  /**
   * Tạo Gift - check trùng tên case-insensitive.
   */
  async createGift(input: {
    name: string;
    stockQuantity?: number;
    isActive?: boolean;
  }): Promise<IGift> {
    const existed = await giftRepository.findByName(input.name);
    if (existed) {
      throw new GiftServiceError("Tên quà tặng đã tồn tại", 400);
    }
    return giftRepository.create({
      name: input.name.trim(),
      stockQuantity: input.stockQuantity ?? 0,
      isActive: input.isActive ?? true,
    });
  },

  /**
   * Update Gift.
   */
  async updateGift(
    id: string,
    input: { name: string; stockQuantity: number; isActive: boolean }
  ): Promise<IGift> {
    const gift = await giftRepository.findById(id);
    if (!gift) {
      throw new GiftServiceError("Không tìm thấy quà tặng", 404);
    }

    // Check trùng tên (loại trừ chính nó)
    const existed = await giftRepository.findByName(input.name);
    if (existed && String((existed as any)._id) !== String(id)) {
      throw new GiftServiceError("Tên quà tặng đã tồn tại", 400);
    }

    const updated = await giftRepository.update(id, {
      name: input.name.trim(),
      stockQuantity: input.stockQuantity,
      isActive: input.isActive,
    });

    if (!updated) {
      throw new GiftServiceError("Không thể cập nhật quà tặng", 500);
    }
    return updated;
  },

  /**
   * Deactivate (soft delete) Gift.
   */
  async deactivateGift(id: string) {
    const gift = await giftRepository.findById(id);
    if (!gift) {
      throw new GiftServiceError("Không tìm thấy quà tặng", 404);
    }
    if (!gift.isActive) {
      throw new GiftServiceError("Quà tặng đã bị vô hiệu hóa", 400);
    }
    return giftRepository.deactivate(id);
  },
};

export default giftService;

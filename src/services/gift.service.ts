/**
 * Gift Service (Sprint 8.x - Gift Management)
 *
 * Business logic layer:
 * - Validate uniqueness (case-insensitive)
 * - Orchestrate repository + return shaped data
 */

import mongoose from "mongoose";
import giftRepository from "@/repositories/gift.repository";
import type { IGift } from "@/models/Gift";
import {
  GiftInventoryHistoryType,
  type IGiftInventoryHistory,
} from "@/models/GiftInventoryHistory";

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
    createdBy: string;
    note?: string;
  }): Promise<IGift> {
    const existed = await giftRepository.findByName(input.name);
    if (existed) {
      throw new GiftServiceError("Tên quà tặng đã tồn tại", 400);
    }

    const initialQuantity =
      input.stockQuantity !== undefined && input.stockQuantity !== null
        ? input.stockQuantity
        : 0;
    const session = await mongoose.startSession();
    try {
      let gift: IGift | undefined;
      await session.withTransaction(async () => {
        const createdGift = await giftRepository.create(
          {
            name: input.name.trim(),
            stockQuantity: initialQuantity,
            isActive: input.isActive ?? true,
          },
          session
        );
        gift = createdGift;

        await giftRepository.createHistory(
          {
            giftId: createdGift._id,
            type: GiftInventoryHistoryType.INITIAL,
            quantityBefore: 0,
            quantityChange: initialQuantity,
            quantityAfter: initialQuantity,
            createdBy: new mongoose.Types.ObjectId(input.createdBy),
            note: input.note?.trim() || "Tạo quà tặng",
          },
          session
        );
      });
      return gift!;
    } finally {
      await session.endSession();
    }
  },

  /**
   * Update Gift.
   */
  async updateGift(
    id: string,
    input: { name: string; isActive: boolean }
  ): Promise<IGift> {
    const gift = await giftRepository.findById(id);
    if (!gift) {
      throw new GiftServiceError("Không tìm thấy quà tặng", 404);
    }

    // Check trùng tên (loại trừ chính nó)
    const existed = await giftRepository.findByName(input.name);
    if (existed && String((existed as IGift & { _id?: unknown })._id) !== String(id)) {
      throw new GiftServiceError("Tên quà tặng đã tồn tại", 400);
    }

    const updated = await giftRepository.updateMetadata(id, {
      name: input.name.trim(),
      isActive: input.isActive,
    });

    if (!updated) {
      throw new GiftServiceError("Không thể cập nhật quà tặng", 500);
    }
    return updated;
  },

  async changeInventory(
    giftId: string,
    input: {
      type: GiftInventoryHistoryType.IMPORT | GiftInventoryHistoryType.ADJUSTMENT;
      quantityChange: number;
      note: string;
      createdBy: string;
    }
  ): Promise<{ gift: IGift; history: IGiftInventoryHistory }> {
    if (!mongoose.isValidObjectId(giftId)) {
      throw new GiftServiceError("ID quà tặng không hợp lệ", 400);
    }

    const session = await mongoose.startSession();
    try {
      let result: { gift: IGift; history: IGiftInventoryHistory } | undefined;
      await session.withTransaction(async () => {
        const gift = await giftRepository.findById(giftId, session);
        if (!gift) throw new GiftServiceError("Không tìm thấy quà tặng", 404);
        if (!gift.isActive) {
          throw new GiftServiceError("Không thể thay đổi tồn của quà tặng đã vô hiệu hóa", 400);
        }

        const updatedGift = await giftRepository.adjustStock(
          giftId,
          input.quantityChange,
          session
        );
        if (!updatedGift) {
          throw new GiftServiceError("Số lượng tồn kho không được âm", 400);
        }

        const history = await giftRepository.createHistory(
          {
            giftId: new mongoose.Types.ObjectId(giftId),
            type: input.type,
            quantityBefore: gift.stockQuantity,
            quantityChange: input.quantityChange,
            quantityAfter: updatedGift.stockQuantity,
            createdBy: new mongoose.Types.ObjectId(input.createdBy),
            note: input.note.trim(),
          },
          session
        );
        result = { gift: updatedGift, history };
      });
      return result!;
    } finally {
      await session.endSession();
    }
  },

  async getInventoryHistory(
    giftId: string,
    options: { skip?: number; limit?: number } = {}
  ) {
    if (!mongoose.isValidObjectId(giftId)) {
      throw new GiftServiceError("ID quà tặng không hợp lệ", 400);
    }
    await this.getGift(giftId);
    return giftRepository.findHistoryByGiftId(giftId, options);
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

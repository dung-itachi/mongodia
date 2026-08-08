/**
 * Gift Repository (Sprint 8.x - Gift Management)
 *
 * Data access layer cho Gift.
 * Pattern giống các repository khác trong project.
 */

import mongoose, { type ClientSession } from "mongoose";
import Gift, { type IGift } from "@/models/Gift";
import GiftInventoryHistory, {
  type IGiftInventoryHistory,
} from "@/models/GiftInventoryHistory";

export interface GiftListFilter {
  isActive?: boolean | null;
  search?: string | null;
  skip?: number;
  limit?: number;
}

export interface GiftListResult {
  items: IGift[];
  total: number;
}

const giftRepository = {
  /**
   * Lấy danh sách Gift theo filter.
   */
  async findMany(filter: GiftListFilter = {}): Promise<GiftListResult> {
    const query: Record<string, unknown> = {};

    if (filter.isActive !== undefined && filter.isActive !== null) {
      query.isActive = filter.isActive;
    }

    if (filter.search && filter.search.trim()) {
      const escaped = filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.name = { $regex: new RegExp(escaped, "i") };
    }

    const skip = filter.skip ?? 0;
    const limit = filter.limit ?? 100;

    const [items, total] = await Promise.all([
      Gift.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean<IGift[]>(),
      Gift.countDocuments(query),
    ]);

    return { items, total };
  },

  /**
   * Lấy tất cả Gift active (cho dropdown).
   */
  async findAllActive(): Promise<IGift[]> {
    return Gift.find({ isActive: true })
      .sort({ name: 1 })
      .lean<IGift[]>();
  },

  /**
   * Lấy Gift theo id.
   */
  async findById(
    id: string,
    session?: ClientSession
  ): Promise<IGift | null> {
    return Gift.findById(id).session(session ?? null).lean<IGift | null>();
  },

  /**
   * Lấy nhiều Gift theo ids (cho Order preview).
   */
  async findByIds(ids: string[]): Promise<IGift[]> {
    if (!ids.length) return [];
    return Gift.find({ _id: { $in: ids }, isActive: true })
      .lean<IGift[]>();
  },

  /**
   * Tìm theo name (case-insensitive).
   */
  async findByName(name: string): Promise<IGift | null> {
    return Gift.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
    }).lean<IGift | null>();
  },

  /**
   * Tạo mới Gift.
   */
  async create(
    data: Partial<IGift>,
    session?: ClientSession
  ): Promise<IGift & { _id: mongoose.Types.ObjectId }> {
    const [doc] = await Gift.create([data], { session });
    return doc.toObject() as IGift & { _id: mongoose.Types.ObjectId };
  },

  /**
   * Soft delete: set isActive = false.
   */
  async deactivate(id: string): Promise<IGift | null> {
    const updated = await Gift.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    ).lean<IGift | null>();
    return updated;
  },

  /**
   * Cập nhật metadata, không bao gồm tồn kho.
   */
  async updateMetadata(
    id: string,
    data: Pick<IGift, "name" | "isActive">
  ): Promise<IGift | null> {
    return Gift.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean<IGift | null>();
  },

  /**
   * Thay đổi tồn theo delta. Caller phải ghi history trong cùng transaction.
   */
  async adjustStock(
    id: string,
    delta: number,
    session: ClientSession
  ): Promise<IGift | null> {
    return Gift.findOneAndUpdate(
      {
        _id: id,
        stockQuantity: { $gte: Math.max(0, -delta) },
      },
      { $inc: { stockQuantity: delta } },
      { new: true, session, runValidators: true }
    ).lean<IGift | null>();
  },

  async createHistory(
    data: Omit<IGiftInventoryHistory, "createdAt">,
    session: ClientSession
  ): Promise<IGiftInventoryHistory> {
    const [history] = await GiftInventoryHistory.create([data], { session });
    return history.toObject() as IGiftInventoryHistory;
  },

  async findHistoryByGiftId(
    giftId: string,
    options: { skip?: number; limit?: number } = {}
  ): Promise<{ items: IGiftInventoryHistory[]; total: number }> {
    const skip = options.skip ?? 0;
    const limit = options.limit ?? 100;
    const objectId = new mongoose.Types.ObjectId(giftId);
    const [items, total] = await Promise.all([
      GiftInventoryHistory.find({ giftId: objectId })
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "employeeCode fullName")
        .lean<IGiftInventoryHistory[]>(),
      GiftInventoryHistory.countDocuments({ giftId: objectId }),
    ]);
    return { items, total };
  },
};

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default giftRepository;

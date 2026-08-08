/**
 * Gift Repository (Sprint 8.x - Gift Management)
 *
 * Data access layer cho Gift.
 * Pattern giống các repository khác trong project.
 */

import Gift, { type IGift } from "@/models/Gift";

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
  async findById(id: string): Promise<IGift | null> {
    return Gift.findById(id).lean<IGift | null>();
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
  async create(data: Partial<IGift>): Promise<IGift> {
    const doc = await Gift.create(data);
    return doc.toObject() as IGift;
  },

  /**
   * Update Gift theo id.
   */
  async update(id: string, data: Partial<IGift>): Promise<IGift | null> {
    const updated = await Gift.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean<IGift | null>();
    return updated;
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
   * Tăng/giảm tồn kho (delta âm = trừ, dương = cộng).
   */
  async adjustStock(id: string, delta: number): Promise<IGift | null> {
    const gift = await Gift.findById(id);
    if (!gift) return null;
    const newStock = Math.max(0, gift.stockQuantity + delta);
    gift.stockQuantity = newStock;
    await gift.save();
    return gift.toObject() as IGift;
  },
};

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default giftRepository;

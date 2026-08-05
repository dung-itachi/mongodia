/**
 * ==================================================
 * CAMPAIGN REPOSITORY
 * ==================================================
 *
 * Sprint 7.4 — Facebook Page & Campaign Management
 *
 * Clean Architecture: Repository layer cho Campaign.
 * CHỈ truy cập MongoDB - KHÔNG có business logic.
 */

import mongoose, { type SortOrder } from "mongoose";
import { Campaign, type ICampaign } from "@/models/Campaign";

// ============================================================================
// Types
// ============================================================================

export interface CreateCampaignData {
  code: string;
  name: string;
  facebookPageId: mongoose.Types.ObjectId;
  objective?: string;
  startDate: Date;
  endDate?: Date | null;
  dailyBudget?: number;
  lifetimeBudget?: number;
  status?: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  marketingEmployeeId?: mongoose.Types.ObjectId | null;
  note?: string;
}

export interface UpdateCampaignData {
  code?: string;
  name?: string;
  facebookPageId?: mongoose.Types.ObjectId;
  objective?: string;
  startDate?: Date;
  endDate?: Date | null;
  dailyBudget?: number;
  lifetimeBudget?: number;
  status?: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  marketingEmployeeId?: mongoose.Types.ObjectId | null;
  note?: string;
  isActive?: boolean;
}

export interface CampaignFilter {
  keyword?: string;
  facebookPageId?: string;
  marketingEmployeeId?: string;
  status?: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// Mapper
// ============================================================================

function mapToCampaign(doc: ICampaign) {
  return {
    _id: doc._id.toString(),
    code: doc.code,
    name: doc.name,
    facebookPageId: doc.facebookPageId.toString(),
    objective: doc.objective ?? "",
    startDate: doc.startDate?.toISOString(),
    endDate: doc.endDate?.toISOString() ?? null,
    dailyBudget: doc.dailyBudget ?? 0,
    lifetimeBudget: doc.lifetimeBudget ?? 0,
    status: doc.status,
    marketingEmployeeId: doc.marketingEmployeeId?.toString() ?? null,
    note: doc.note ?? "",
    isActive: doc.isActive ?? true,
    createdAt: (doc as { createdAt?: Date }).createdAt?.toISOString(),
    updatedAt: (doc as { updatedAt?: Date }).updatedAt?.toISOString(),
  };
}

// ============================================================================
// Filter builder
// ============================================================================

function buildFilter(params: CampaignFilter): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (params.isActive === false) {
    filter.isActive = false;
  } else if (params.isActive === true) {
    filter.isActive = true;
  } else {
    filter.isActive = { $ne: false };
  }

  if (params.keyword && params.keyword.trim().length > 0) {
    filter.$or = [
      { name: { $regex: escapeRegex(params.keyword.trim()), $options: "i" } },
      { code: { $regex: escapeRegex(params.keyword.trim()), $options: "i" } },
    ];
  }

  if (params.facebookPageId) {
    filter.facebookPageId = new mongoose.Types.ObjectId(params.facebookPageId);
  }

  if (params.marketingEmployeeId) {
    filter.marketingEmployeeId = new mongoose.Types.ObjectId(params.marketingEmployeeId);
  }

  if (params.status) {
    filter.status = params.status;
  }

  return filter;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SORT_FIELDS = new Set([
  "code",
  "name",
  "facebookPageId",
  "startDate",
  "endDate",
  "dailyBudget",
  "status",
  "createdAt",
  "updatedAt",
]);

function buildSort(params: CampaignFilter): Record<string, SortOrder> {
  const requested = params.sortField;
  const sortField =
    requested && SORT_FIELDS.has(requested) ? requested : "startDate";
  const sortOrder: SortOrder = params.sortOrder === "asc" ? 1 : -1;
  return { [sortField]: sortOrder };
}

// ============================================================================
// Repository
// ============================================================================

export class CampaignRepository {
  async create(
    data: CreateCampaignData,
    session?: mongoose.ClientSession
  ) {
    const doc = new Campaign({
      ...data,
      status: data.status ?? "ACTIVE",
    });
    const saved = await doc.save({ session });
    return mapToCampaign(saved);
  }

  async findById(id: string) {
    const doc = await Campaign.findOne({
      _id: id,
      isActive: { $ne: false },
    }).lean();
    if (!doc) return null;
    return mapToCampaign(doc as unknown as ICampaign);
  }

  async findByIdWithPopulate(id: string) {
    const doc = await Campaign.findOne({
      _id: id,
      isActive: { $ne: false },
    })
      .populate("facebookPageId", "_id code name")
      .populate("marketingEmployeeId", "_id employeeCode fullName")
      .lean();
    return doc as unknown as ICampaign | null;
  }

  async findByCode(code: string) {
    const doc = await Campaign.findOne({
      code: code.toUpperCase(),
      isActive: { $ne: false },
    }).lean();
    if (!doc) return null;
    return mapToCampaign(doc as unknown as ICampaign);
  }

  async findAll(params: CampaignFilter) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const filter = buildFilter(params);

    const [items, total] = await Promise.all([
      Campaign.find(filter)
        .populate("facebookPageId", "_id code name")
        .populate("marketingEmployeeId", "_id employeeCode fullName")
        .sort(buildSort(params))
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Campaign.countDocuments(filter),
    ]);

    return {
      items: items.map((doc) => mapToCampaign(doc as unknown as ICampaign)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async update(
    id: string,
    data: UpdateCampaignData,
    session?: mongoose.ClientSession
  ) {
    const doc = await Campaign.findByIdAndUpdate(id, data, {
      new: true,
      session,
    }).lean();
    if (!doc) return null;
    return mapToCampaign(doc as unknown as ICampaign);
  }

  async softDelete(
    id: string,
    session?: mongoose.ClientSession
  ) {
    const result = await Campaign.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true, session }
    ).lean();
    return result !== null;
  }

  async delete(id: string, session?: mongoose.ClientSession) {
    const result = await Campaign.findByIdAndDelete(id, { session });
    return result !== null;
  }

  async count(params: Partial<CampaignFilter> = {}) {
    const filter = buildFilter(params as CampaignFilter);
    return Campaign.countDocuments(filter);
  }

  async existsByCode(code: string, excludeId?: string) {
    const filter: Record<string, unknown> = {
      code: code.toUpperCase(),
      isActive: { $ne: false },
    };
    if (excludeId) {
      filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }
    const count = await Campaign.countDocuments(filter);
    return count > 0;
  }

  async existsByPageAndName(
    facebookPageId: string,
    name: string,
    excludeId?: string
  ) {
    const filter: Record<string, unknown> = {
      facebookPageId: new mongoose.Types.ObjectId(facebookPageId),
      name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
      isActive: { $ne: false },
    };
    if (excludeId) {
      filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }
    const count = await Campaign.countDocuments(filter);
    return count > 0;
  }
}

export const campaignRepository = new CampaignRepository();

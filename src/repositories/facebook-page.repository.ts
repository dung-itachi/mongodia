/**
 * ==================================================
 * FACEBOOK PAGE REPOSITORY
 * ==================================================
 *
 * Sprint 7.4 — Facebook Page & Campaign Management
 *
 * Clean Architecture: Repository layer cho FacebookPage.
 * CHỈ truy cập MongoDB - KHÔNG có business logic.
 */

import mongoose, { type SortOrder } from "mongoose";
import { FacebookPage, type IFacebookPage } from "@/models/FacebookPage";

// ============================================================================
// Types
// ============================================================================

export interface CreateFacebookPageData {
  code: string;
  name: string;
  pageUrl?: string;
  facebookPageId?: string;
  description?: string;
  businessManager?: string;
  currency?: string;
  timezone?: string;
  status?: "ACTIVE" | "INACTIVE";
  note?: string;
}

export interface UpdateFacebookPageData {
  code?: string;
  name?: string;
  pageUrl?: string;
  facebookPageId?: string;
  description?: string;
  businessManager?: string;
  currency?: string;
  timezone?: string;
  status?: "ACTIVE" | "INACTIVE";
  note?: string;
  isActive?: boolean;
}

export interface FacebookPageFilter {
  keyword?: string;
  status?: "ACTIVE" | "INACTIVE";
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// Mapper
// ============================================================================

function mapToPage(doc: IFacebookPage) {
  return {
    _id: doc._id.toString(),
    code: doc.code,
    name: doc.name,
    pageUrl: doc.pageUrl ?? "",
    facebookPageId: doc.facebookPageId ?? "",
    description: doc.description ?? "",
    businessManager: doc.businessManager ?? "",
    currency: doc.currency ?? "VND",
    timezone: doc.timezone ?? "Asia/Ho_Chi_Minh",
    status: doc.status,
    note: doc.note ?? "",
    isActive: doc.isActive ?? true,
    createdAt: (doc as { createdAt?: Date }).createdAt?.toISOString(),
    updatedAt: (doc as { updatedAt?: Date }).updatedAt?.toISOString(),
  };
}

// ============================================================================
// Filter builder
// ============================================================================

function buildFilter(params: FacebookPageFilter): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (params.isActive !== undefined) {
    filter.isActive = params.isActive;
  }

  if (params.keyword && params.keyword.trim().length > 0) {
    filter.$or = [
      { name: { $regex: escapeRegex(params.keyword.trim()), $options: "i" } },
      { code: { $regex: escapeRegex(params.keyword.trim()), $options: "i" } },
    ];
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
  "status",
  "createdAt",
  "updatedAt",
]);

function buildSort(params: FacebookPageFilter): Record<string, SortOrder> {
  const requested = params.sortField;
  const sortField =
    requested && SORT_FIELDS.has(requested) ? requested : "name";
  const sortOrder: SortOrder = params.sortOrder === "asc" ? 1 : -1;
  return { [sortField]: sortOrder };
}

// ============================================================================
// Repository
// ============================================================================

export class FacebookPageRepository {
  async create(
    data: CreateFacebookPageData,
    session?: mongoose.ClientSession
  ) {
    const doc = new FacebookPage({
      ...data,
      status: data.status ?? "ACTIVE",
    });
    const saved = await doc.save({ session });
    return mapToPage(saved);
  }

  async findById(id: string) {
    const doc = await FacebookPage.findOne({
      _id: id,
    }).lean();
    if (!doc) return null;
    return mapToPage(doc as unknown as IFacebookPage);
  }

  async findByCode(code: string) {
    const doc = await FacebookPage.findOne({
      code: code.toUpperCase(),
    }).lean();
    if (!doc) return null;
    return mapToPage(doc as unknown as IFacebookPage);
  }

  async findAll(params: FacebookPageFilter) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const filter = buildFilter(params);

    const [items, total] = await Promise.all([
      FacebookPage.find(filter)
        .sort(buildSort(params))
        .skip(skip)
        .limit(pageSize)
        .lean(),
      FacebookPage.countDocuments(filter),
    ]);

    return {
      items: items.map((doc) => mapToPage(doc as unknown as IFacebookPage)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async update(
    id: string,
    data: UpdateFacebookPageData,
    session?: mongoose.ClientSession
  ) {
    const doc = await FacebookPage.findByIdAndUpdate(id, data, {
      new: true,
      session,
    }).lean();
    if (!doc) return null;
    return mapToPage(doc as unknown as IFacebookPage);
  }

  async softDelete(
    id: string,
    session?: mongoose.ClientSession
  ) {
    const result = await FacebookPage.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true, session }
    ).lean();
    return result !== null;
  }

  async delete(id: string, session?: mongoose.ClientSession) {
    const result = await FacebookPage.findByIdAndDelete(id, { session });
    return result !== null;
  }

  async count(params: Partial<FacebookPageFilter> = {}) {
    const filter = buildFilter(params as FacebookPageFilter);
    return FacebookPage.countDocuments(filter);
  }

  async existsByCode(code: string, excludeId?: string) {
    const filter: Record<string, unknown> = {
      code: code.toUpperCase(),
    };
    if (excludeId) {
      filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }
    const count = await FacebookPage.countDocuments(filter);
    return count > 0;
  }
}

export const facebookPageRepository = new FacebookPageRepository();

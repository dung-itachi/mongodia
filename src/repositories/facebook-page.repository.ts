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
import FacebookPageAssignment from "@/models/FacebookPageAssignment";

// ============================================================================
// Types
// ============================================================================

export interface CreateFacebookPageData {
  code: string;
  name: string;
  pageUrl?: string;
  facebookPageId?: string;
  avatarUrl?: string;
  description?: string;
  businessManager?: string;
  currency?: string;
  timezone?: string;
  status?: "ACTIVE" | "INACTIVE";
  note?: string;
  /** Account ID để phân quyền page theo tài khoản */
  accountId?: string;
}

export interface UpdateFacebookPageData {
  code?: string;
  name?: string;
  pageUrl?: string;
  facebookPageId?: string;
  avatarUrl?: string;
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
  /** Account ID để lọc page theo tài khoản (undefined = lấy tất cả) */
  accountId?: string;
}

export interface MarketingEmployeeRef {
  _id: string;
  employeeCode: string;
  fullName: string;
}

export interface CurrentAssignmentRef {
  _id: string;
  marketingEmployeeId: string | null;
  marketingEmployee: MarketingEmployeeRef | null;
  startDate: string;
  endDate: string | null;
}

// ============================================================================
// Mappers
// ============================================================================

function mapToPage(
  doc: IFacebookPage,
  currentAssignment: CurrentAssignmentRef | null = null
) {
  return {
    _id: doc._id.toString(),
    code: doc.code,
    name: doc.name,
    pageUrl: doc.pageUrl ?? "",
    facebookPageId: doc.facebookPageId ?? "",
    avatarUrl: doc.avatarUrl ?? "",
    description: doc.description ?? "",
    businessManager: doc.businessManager ?? "",
    currency: doc.currency ?? "VND",
    timezone: doc.timezone ?? "Asia/Ho_Chi_Minh",
    status: doc.status,
    note: doc.note ?? "",
    isActive: doc.isActive ?? true,
    createdAt: (doc as { createdAt?: Date }).createdAt?.toISOString(),
    updatedAt: (doc as { updatedAt?: Date }).updatedAt?.toISOString(),
    currentAssignment,
  };
}

function resolveAssignment(raw: {
  _id: unknown;
  startDate?: unknown;
  endDate?: unknown;
  marketingEmployeeId?: unknown;
} | null): CurrentAssignmentRef | null {
  if (!raw) return null;

  const employee = raw.marketingEmployeeId as unknown as
    | (MarketingEmployeeRef & { _id: { toString: () => string } })
    | null;

  return {
    _id: String(raw._id),
    marketingEmployeeId: employee
      ? (employee._id.toString?.() ?? String(employee._id))
      : null,
    marketingEmployee: employee
      ? {
          _id: employee._id.toString?.() ?? String(employee._id),
          employeeCode: employee.employeeCode,
          fullName: employee.fullName,
        }
      : null,
    startDate: raw.startDate
      ? new Date(raw.startDate as Date).toISOString()
      : "",
    endDate: raw.endDate ? new Date(raw.endDate as Date).toISOString() : null,
  };
}

async function fetchCurrentAssignmentsByPageIds(
  pageIds: (string | mongoose.Types.ObjectId)[],
  session?: mongoose.ClientSession
): Promise<Map<string, CurrentAssignmentRef>> {
  const map = new Map<string, CurrentAssignmentRef>();
  if (pageIds.length === 0) return map;

  const docs = await FacebookPageAssignment.find({
    facebookPageId: { $in: pageIds },
    isActive: true,
    endDate: null,
  })
    .populate("marketingEmployeeId", "_id employeeCode fullName")
    .session(session ?? null)
    .lean();

  for (const a of docs) {
    const pageId = (a.facebookPageId as { toString: () => string }).toString();
    const assignment = resolveAssignment(a);
    if (assignment) {
      map.set(pageId, assignment);
    }
  }

  return map;
}

async function fetchCurrentAssignmentByPageId(
  pageId: string,
  session?: mongoose.ClientSession
): Promise<CurrentAssignmentRef | null> {
  const doc = await FacebookPageAssignment.findOne({
    facebookPageId: pageId,
    isActive: true,
    endDate: null,
  })
    .populate("marketingEmployeeId", "_id employeeCode fullName")
    .session(session ?? null)
    .lean();

  return resolveAssignment(doc);
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

  // Filter by accountId if provided
  if (params.accountId) {
    filter.accountId = params.accountId;
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
    const currentAssignment = await fetchCurrentAssignmentByPageId(
      doc._id.toString()
    );
    return mapToPage(doc as unknown as IFacebookPage, currentAssignment);
  }

  async findByCode(code: string) {
    const doc = await FacebookPage.findOne({
      code: code.toUpperCase(),
    }).lean();
    if (!doc) return null;
    const currentAssignment = await fetchCurrentAssignmentByPageId(
      doc._id.toString()
    );
    return mapToPage(doc as unknown as IFacebookPage, currentAssignment);
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

    const pageIds = items.map((doc) => doc._id);
    const assignmentsByPageId = await fetchCurrentAssignmentsByPageIds(pageIds);

    return {
      items: items.map((doc) =>
        mapToPage(
          doc as unknown as IFacebookPage,
          assignmentsByPageId.get(doc._id.toString()) ?? null
        )
      ),
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
    const currentAssignment = await fetchCurrentAssignmentByPageId(
      doc._id.toString(),
      session
    );
    return mapToPage(doc as unknown as IFacebookPage, currentAssignment);
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

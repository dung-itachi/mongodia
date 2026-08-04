/**
 * Lead Repository (Sprint 5.2 — Lead Domain Foundation)
 *
 * Clean Architecture: Repository layer cho Lead.
 * Chỉ làm việc với MongoDB - không có business logic.
 */

import mongoose, { type SortOrder } from "mongoose";
import { Lead, type ILead } from "@/models/Lead";
import type {
  LeadSearchParams,
  CreateLeadInput,
  UpdateLeadInput,
} from "@/types/lead";

/**
 * Map MongoDB document to Lead domain type
 */
function mapToLead(doc: ILead) {
  const rawDoc = doc as ILead & {
    marketingEmployeeId?: { _id: { toString(): string }; employeeCode: string; name: string };
    saleEmployeeId?: { _id: { toString(): string }; employeeCode: string; name: string };
  };

  return {
    _id: doc._id.toString(),
    leadCode: doc.leadCode,
    customerId: doc.customerId?.toString(),
    customerName: doc.customerName,
    customerNewName: doc.customerNewName,
    facebookLink: doc.facebookLink,
    phone: doc.phone,
    phone2: doc.phone2,
    email: doc.email,
    address: doc.address,
    province: doc.province,
    district: doc.district,
    ward: doc.ward,
    sourceType: doc.sourceType,
    facebookPageId: doc.facebookPageId?.toString(),
    facebookPageAssignmentId: doc.facebookPageAssignmentId?.toString(),
    marketingEmployeeId: rawDoc.marketingEmployeeId && typeof rawDoc.marketingEmployeeId === "object" && "employeeCode" in rawDoc.marketingEmployeeId
      ? rawDoc.marketingEmployeeId._id.toString()
      : doc.marketingEmployeeId?.toString(),
    marketingEmployee: rawDoc.marketingEmployeeId && typeof rawDoc.marketingEmployeeId === "object" && "employeeCode" in rawDoc.marketingEmployeeId
      ? {
          _id: rawDoc.marketingEmployeeId._id.toString(),
          employeeCode: rawDoc.marketingEmployeeId.employeeCode,
          name: rawDoc.marketingEmployeeId.name,
        }
      : undefined,
    saleEmployeeId: rawDoc.saleEmployeeId && typeof rawDoc.saleEmployeeId === "object" && "employeeCode" in rawDoc.saleEmployeeId
      ? rawDoc.saleEmployeeId._id.toString()
      : doc.saleEmployeeId?.toString(),
    saleEmployee: rawDoc.saleEmployeeId && typeof rawDoc.saleEmployeeId === "object" && "employeeCode" in rawDoc.saleEmployeeId
      ? {
          _id: rawDoc.saleEmployeeId._id.toString(),
          employeeCode: rawDoc.saleEmployeeId.employeeCode,
          name: rawDoc.saleEmployeeId.name,
        }
      : undefined,
    assignmentType: doc.assignmentType,
    assignedAt: doc.assignedAt,
    categoryId: doc.categoryId?.toString(),
    productId: doc.productId?.toString(),
    comboId: doc.comboId?.toString(),
    quantity: doc.quantity,
    unitPriceMNT: doc.unitPriceMNT,
    unitPriceVND: doc.unitPriceVND,
    exchangeRate: doc.exchangeRate,
    estimatedWeight: doc.estimatedWeight,
    status: doc.status,
    latestRemark: doc.latestRemark,
    note: doc.note,
    isDuplicate: doc.isDuplicate,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Build MongoDB filter from search params
 */
function buildFilter(params: LeadSearchParams): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (params.keyword) {
    filter.$or = [
      { leadCode: { $regex: params.keyword, $options: "i" } },
      { customerName: { $regex: params.keyword, $options: "i" } },
      { phone: { $regex: params.keyword, $options: "i" } },
      { phone2: { $regex: params.keyword, $options: "i" } },
      { email: { $regex: params.keyword, $options: "i" } },
      { facebookLink: { $regex: params.keyword, $options: "i" } },
    ];
  }

  if (params.status) {
    filter.status = params.status;
  }

  if (params.marketingEmployeeId) {
    filter.marketingEmployeeId = new mongoose.Types.ObjectId(params.marketingEmployeeId);
  }

  if (params.saleEmployeeId) {
    filter.saleEmployeeId = new mongoose.Types.ObjectId(params.saleEmployeeId);
  }

  if (params.facebookPageId) {
    filter.facebookPageId = new mongoose.Types.ObjectId(params.facebookPageId);
  }

  if (params.sourceType) {
    filter.sourceType = params.sourceType;
  }

  if (params.isDuplicate !== undefined) {
    filter.isDuplicate = params.isDuplicate;
  }

  if (params.isActive !== undefined) {
    filter.isActive = params.isActive;
  }

  if (params.createdFrom || params.createdTo) {
    filter.createdAt = {};
    if (params.createdFrom) {
      (filter.createdAt as Record<string, Date>).$gte = new Date(params.createdFrom);
    }
    if (params.createdTo) {
      const endDate = new Date(params.createdTo);
      endDate.setHours(23, 59, 59, 999);
      (filter.createdAt as Record<string, Date>).$lte = endDate;
    }
  }

  return filter;
}

/**
 * CreateLeadInputWithDefaults - includes defaults set by service
 */
type CreateLeadInputWithDefaults = CreateLeadInput & {
  leadCode: string;
  status: string;
  isDuplicate: boolean;
  isActive: boolean;
};

const SORT_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "leadCode",
  "customerName",
  "status",
  "sourceType",
]);

function buildSort(params: LeadSearchParams): Record<string, SortOrder> {
  const sortField = params.sort && SORT_FIELDS.has(params.sort) ? params.sort : "createdAt";
  const sortOrder: SortOrder = params.order === "asc" ? 1 : -1;
  return { [sortField]: sortOrder };
}

export class LeadRepository {
  /**
   * Create a new lead
   */
  async create(data: CreateLeadInputWithDefaults) {
    const doc = await Lead.create(data);
    return mapToLead(doc);
  }

  /**
   * Update a lead by ID
   */
  async update(id: string, data: UpdateLeadInput) {
    const doc = await Lead.findByIdAndUpdate(id, data, { new: true }).lean();
    if (!doc) return null;
    return mapToLead(doc as ILead);
  }

  /**
   * Delete a lead by ID (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    const result = await Lead.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    return result !== null;
  }

  /**
   * Find lead by ID
   */
  async findById(id: string) {
    const doc = await Lead.findById(id)
      .populate("marketingEmployeeId", "_id employeeCode name")
      .populate("saleEmployeeId", "_id employeeCode name")
      .lean();
    if (!doc) return null;
    return mapToLead(doc as ILead);
  }

  /**
   * Find lead by ID with population
   */
  async findByIdWithPopulate(id: string): Promise<ILead | null> {
    return Lead.findById(id)
      .populate("customer", "_id code name phone")
      .populate("facebookPage", "_id pageId pageName")
      .populate("marketingEmployee", "_id employeeCode name")
      .populate("saleEmployee", "_id employeeCode name")
      .populate("category", "_id code name")
      .populate("product", "_id code name")
      .populate("combo", "_id code name")
      .lean();
  }

  /**
   * Find all leads with pagination
   */
  async findAll(params: LeadSearchParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;
    const filter = buildFilter(params);

    const [items, total] = await Promise.all([
      Lead.find(filter)
        .populate("marketingEmployeeId", "_id employeeCode name")
        .populate("saleEmployeeId", "_id employeeCode name")
        .sort(buildSort(params))
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    return {
      items: items.map((doc) => mapToLead(doc as ILead)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Count leads matching filter
   */
  async count(params: Partial<LeadSearchParams> = {}): Promise<number> {
    const filter = buildFilter(params as LeadSearchParams);
    return Lead.countDocuments(filter);
  }

  /**
   * Check if lead exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const count = await Lead.countDocuments({ _id: id });
    return count > 0;
  }

  /**
   * Check if phone number already exists
   */
  async existsByPhone(phone: string): Promise<boolean> {
    const count = await Lead.countDocuments({
      phone,
      isActive: true,
    });
    return count > 0;
  }
}

// Singleton instance
export const leadRepository = new LeadRepository();

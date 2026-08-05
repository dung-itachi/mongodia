/**
 * ==================================================
 * CUSTOMER REPOSITORY
 * ==================================================
 *
 * Sprint 8.0 — Customer Module Foundation
 *
 * Clean Architecture: Repository layer cho Customer.
 * CHỈ truy cập MongoDB - KHÔNG có business logic.
 */

import mongoose, { type SortOrder } from "mongoose";
import { Customer, type ICustomer } from "@/models/Customer";
import type { CustomerFilter } from "@/types/customer";

// ============================================================================
// Types
// ============================================================================

export interface CreateCustomerData {
  customerCode: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: "male" | "female" | "other";
  birthday?: Date;
  address?: {
    street?: string;
    province?: string;
    district?: string;
    ward?: string;
  };
  facebook?: string;
  zalo?: string;
  note?: string;
  marketingEmployeeId?: mongoose.Types.ObjectId;
  saleEmployeeId?: mongoose.Types.ObjectId;
  facebookPageId?: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
}

export interface UpdateCustomerData {
  fullName?: string;
  phone?: string;
  email?: string;
  gender?: "male" | "female" | "other";
  birthday?: Date;
  address?: {
    street?: string;
    province?: string;
    district?: string;
    ward?: string;
  };
  facebook?: string;
  zalo?: string;
  note?: string;
  saleEmployeeId?: mongoose.Types.ObjectId | null;
  status?: string;
  isActive?: boolean;
}

// ============================================================================
// Mapper
// ============================================================================

function mapToCustomer(doc: ICustomer) {
  return {
    _id: doc._id.toString(),
    customerCode: doc.customerCode,
    fullName: doc.fullName,
    phone: doc.phone,
    email: doc.email,
    gender: doc.gender,
    birthday: doc.birthday ? doc.birthday.toISOString() : undefined,
    address: doc.address,
    facebook: doc.facebook,
    zalo: doc.zalo,
    note: doc.note ?? "",
    marketingEmployeeId: doc.marketingEmployeeId?.toString(),
    saleEmployeeId: doc.saleEmployeeId?.toString(),
    facebookPageId: doc.facebookPageId?.toString(),
    campaignId: doc.campaignId?.toString(),
    leadId: doc.leadId?.toString(),
    status: doc.status,
    createdBy: doc.createdBy?.toString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    isActive: doc.isActive ?? true,
  };
}

// ============================================================================
// Filter builder
// ============================================================================

function buildFilter(params: CustomerFilter): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (params.isActive === false) {
    filter.isActive = false;
  } else if (params.isActive === true) {
    filter.isActive = true;
  } else {
    filter.isActive = { $ne: false };
  }

  if (params.keyword) {
    const keyword = params.keyword.trim();
    filter.$or = [
      { fullName: { $regex: escapeRegex(keyword), $options: "i" } },
      { phone: { $regex: escapeRegex(keyword), $options: "i" } },
      { email: { $regex: escapeRegex(keyword), $options: "i" } },
    ];
  }

  if (params.status) {
    filter.status = params.status;
  }

  if (params.saleEmployeeId) {
    filter.saleEmployeeId = new mongoose.Types.ObjectId(params.saleEmployeeId);
  }

  if (params.marketingEmployeeId) {
    filter.marketingEmployeeId = new mongoose.Types.ObjectId(params.marketingEmployeeId);
  }

  if (params.facebookPageId) {
    filter.facebookPageId = new mongoose.Types.ObjectId(params.facebookPageId);
  }

  if (params.campaignId) {
    filter.campaignId = new mongoose.Types.ObjectId(params.campaignId);
  }

  if (params.dateFrom || params.dateTo) {
    filter.createdAt = {};
    if (params.dateFrom) {
      (filter.createdAt as Record<string, Date>).$gte = new Date(params.dateFrom);
    }
    if (params.dateTo) {
      const endDate = new Date(params.dateTo);
      endDate.setHours(23, 59, 59, 999);
      (filter.createdAt as Record<string, Date>).$lte = endDate;
    }
  }

  return filter;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SORT_FIELDS = new Set([
  "customerCode",
  "fullName",
  "phone",
  "createdAt",
  "updatedAt",
]);

function buildSort(params: CustomerFilter): Record<string, SortOrder> {
  const requested = params.sortField;
  const sortField =
    requested && SORT_FIELDS.has(requested) ? requested : "createdAt";
  const sortOrder: SortOrder = params.sortOrder === "asc" ? 1 : -1;
  return { [sortField]: sortOrder };
}

// ============================================================================
// Repository
// ============================================================================

export class CustomerRepository {
  async create(data: CreateCustomerData) {
    const doc = new Customer(data);
    const saved = await doc.save();
    return mapToCustomer(saved);
  }

  async findById(id: string) {
    const doc = await Customer.findOne({
      _id: id,
      isActive: { $ne: false },
    }).lean();
    if (!doc) return null;
    return mapToCustomer(doc as ICustomer);
  }

  async findByIdWithPopulate(id: string) {
    return Customer.findOne({
      _id: id,
      isActive: { $ne: false },
    })
      .populate("marketingEmployeeId", "_id employeeCode fullName")
      .populate("saleEmployeeId", "_id employeeCode fullName")
      .populate("facebookPageId", "_id code name")
      .populate("campaignId", "_id code name")
      .populate("leadId", "_id code fullName")
      .populate("createdBy", "_id employeeCode fullName")
      .lean();
  }

  async findByCode(code: string) {
    const doc = await Customer.findOne({
      customerCode: code,
      isActive: { $ne: false },
    }).lean();
    if (!doc) return null;
    return mapToCustomer(doc as ICustomer);
  }

  async findByPhone(phone: string) {
    const doc = await Customer.findOne({
      phone,
      isActive: { $ne: false },
    }).lean();
    if (!doc) return null;
    return mapToCustomer(doc as ICustomer);
  }

  async findByEmail(email: string) {
    const doc = await Customer.findOne({
      email: email.toLowerCase(),
      isActive: { $ne: false },
    }).lean();
    if (!doc) return null;
    return mapToCustomer(doc as ICustomer);
  }

  async findAll(params: CustomerFilter) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const filter = buildFilter(params);

    const [items, total] = await Promise.all([
      Customer.find(filter)
        .populate("marketingEmployeeId", "_id employeeCode fullName")
        .populate("saleEmployeeId", "_id employeeCode fullName")
        .sort(buildSort(params))
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Customer.countDocuments(filter),
    ]);

    return {
      items: items.map((doc) => mapToCustomer(doc as ICustomer)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async update(id: string, data: UpdateCustomerData) {
    const doc = await Customer.findByIdAndUpdate(id, data, {
      new: true,
    }).lean();
    if (!doc) return null;
    return mapToCustomer(doc as ICustomer);
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await Customer.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    ).lean();
    return result !== null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await Customer.findByIdAndDelete(id);
    return result !== null;
  }

  async count(params: Partial<CustomerFilter> = {}): Promise<number> {
    const filter = buildFilter(params as CustomerFilter);
    return Customer.countDocuments(filter);
  }

  async exists(id: string): Promise<boolean> {
    const count = await Customer.countDocuments({ _id: id });
    return count > 0;
  }

  async existsByPhone(phone: string, excludeId?: string): Promise<boolean> {
    const filter: Record<string, unknown> = { phone, isActive: { $ne: false } };
    if (excludeId) {
      filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }
    const count = await Customer.countDocuments(filter);
    return count > 0;
  }

  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    if (!email) return false;
    const filter: Record<string, unknown> = {
      email: email.toLowerCase(),
      isActive: { $ne: false },
    };
    if (excludeId) {
      filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }
    const count = await Customer.countDocuments(filter);
    return count > 0;
  }

  async generateCustomerCode(): Promise<string> {
    const count = await Customer.countDocuments();
    const code = `CUS${String(count + 1).padStart(6, "0")}`;
    return code;
  }
}

export const customerRepository = new CustomerRepository();

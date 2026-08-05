/**
 * ==================================================
 * CUSTOMER ACTIVITY REPOSITORY
 * ==================================================
 *
 * Sprint 8.1 — Customer Timeline & CRM Activities
 *
 * Clean Architecture: Repository layer for CustomerActivity.
 * ONLY queries MongoDB - NO business logic.
 */

import mongoose, { type SortOrder } from "mongoose";
import { CustomerActivity, type ICustomerActivity } from "@/models/CustomerActivity";
import { ActivityResult } from "@/models/CustomerActivity";
import type { CustomerActivityFilter } from "@/types/customer-activity";

// ============================================================================
// Types
// ============================================================================

export interface CreateActivityData {
  customerId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  activityType: string;
  title: string;
  content?: string;
  nextFollowUpAt?: Date;
  result?: string;
}

export interface UpdateActivityData {
  activityType?: string;
  title?: string;
  content?: string;
  nextFollowUpAt?: Date | null;
  result?: string;
}

// ============================================================================
// Mapper
// ============================================================================

function mapToActivity(doc: ICustomerActivity) {
  return {
    _id: doc._id.toString(),
    customerId: doc.customerId.toString(),
    employeeId: doc.employeeId.toString(),
    activityType: doc.activityType,
    title: doc.title,
    content: doc.content,
    nextFollowUpAt: doc.nextFollowUpAt?.toISOString(),
    result: doc.result,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// ============================================================================
// Filter builder
// ============================================================================

function buildFilter(params: CustomerActivityFilter): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (params.customerId) {
    filter.customerId = new mongoose.Types.ObjectId(params.customerId);
  }

  if (params.employeeId) {
    filter.employeeId = new mongoose.Types.ObjectId(params.employeeId);
  }

  if (params.activityType) {
    filter.activityType = params.activityType;
  }

  if (params.result) {
    filter.result = params.result;
  }

  if (params.keyword) {
    const keyword = params.keyword.trim();
    filter.$or = [
      { title: { $regex: escapeRegex(keyword), $options: "i" } },
      { content: { $regex: escapeRegex(keyword), $options: "i" } },
    ];
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
  "createdAt",
  "updatedAt",
  "nextFollowUpAt",
  "title",
]);

function buildSort(params: CustomerActivityFilter): Record<string, SortOrder> {
  const requested = params.sortField;
  const sortField =
    requested && SORT_FIELDS.has(requested) ? requested : "createdAt";
  const sortOrder: SortOrder = params.sortOrder === "asc" ? 1 : -1;
  return { [sortField]: sortOrder };
}

// ============================================================================
// Repository
// ============================================================================

export class CustomerActivityRepository {
  async create(data: CreateActivityData) {
    const doc = new CustomerActivity(data);
    const saved = await doc.save();
    return mapToActivity(saved);
  }

  async findById(id: string) {
    const doc = await CustomerActivity.findOne({
      _id: id,
    }).lean();
    if (!doc) return null;
    return mapToActivity(doc as ICustomerActivity);
  }

  async findByIdWithPopulate(id: string) {
    return CustomerActivity.findOne({ _id: id })
      .populate("customerId", "_id customerCode fullName")
      .populate("employeeId", "_id employeeCode fullName")
      .lean();
  }

  async findByCustomer(
    customerId: string,
    params: CustomerActivityFilter = {}
  ) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const filter = { ...buildFilter(params), customerId: new mongoose.Types.ObjectId(customerId) };

    const [items, total] = await Promise.all([
      CustomerActivity.find(filter)
        .populate("employeeId", "_id employeeCode fullName")
        .sort(buildSort(params))
        .skip(skip)
        .limit(pageSize)
        .lean(),
      CustomerActivity.countDocuments(filter),
    ]);

    return {
      items: items.map((doc) => mapToActivity(doc as ICustomerActivity)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async findByEmployee(
    employeeId: string,
    params: CustomerActivityFilter = {}
  ) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const filter = { ...buildFilter(params), employeeId: new mongoose.Types.ObjectId(employeeId) };

    const [items, total] = await Promise.all([
      CustomerActivity.find(filter)
        .populate("customerId", "_id customerCode fullName")
        .populate("employeeId", "_id employeeCode fullName")
        .sort(buildSort(params))
        .skip(skip)
        .limit(pageSize)
        .lean(),
      CustomerActivity.countDocuments(filter),
    ]);

    return {
      items: items.map((doc) => mapToActivity(doc as ICustomerActivity)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async findToday(employeeId: string, date: Date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const filter = {
      employeeId: new mongoose.Types.ObjectId(employeeId),
      nextFollowUpAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    };

    const [items, total] = await Promise.all([
      CustomerActivity.find(filter)
        .populate("customerId", "_id customerCode fullName phone")
        .sort({ nextFollowUpAt: 1 })
        .lean(),
      CustomerActivity.countDocuments(filter),
    ]);

    return {
      items: items.map((doc) => mapToActivity(doc as ICustomerActivity)),
      total,
    };
  }

  async findUpcoming(employeeId: string, fromDate: Date = new Date()) {
    const startOfToday = new Date(fromDate);
    startOfToday.setHours(0, 0, 0, 0);

    const tomorrow = new Date(startOfToday);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const filter = {
      employeeId: new mongoose.Types.ObjectId(employeeId),
      nextFollowUpAt: {
        $gte: tomorrow,
      },
    };

    const [items, total] = await Promise.all([
      CustomerActivity.find(filter)
        .populate("customerId", "_id customerCode fullName phone")
        .sort({ nextFollowUpAt: 1 })
        .lean(),
      CustomerActivity.countDocuments(filter),
    ]);

    return {
      items: items.map((doc) => mapToActivity(doc as ICustomerActivity)),
      total,
    };
  }

  async findMissed(employeeId: string, beforeDate: Date = new Date()) {
    const startOfToday = new Date(beforeDate);
    startOfToday.setHours(0, 0, 0, 0);

    const filter = {
      employeeId: new mongoose.Types.ObjectId(employeeId),
      nextFollowUpAt: {
        $lt: startOfToday,
      },
      result: { $ne: ActivityResult.SUCCESS },
    };

    const [items, total] = await Promise.all([
      CustomerActivity.find(filter)
        .populate("customerId", "_id customerCode fullName phone")
        .sort({ nextFollowUpAt: 1 })
        .lean(),
      CustomerActivity.countDocuments(filter),
    ]);

    return {
      items: items.map((doc) => mapToActivity(doc as ICustomerActivity)),
      total,
    };
  }

  async update(id: string, data: UpdateActivityData) {
    const updateData: Record<string, unknown> = {};

    if (data.activityType !== undefined) updateData.activityType = data.activityType;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.nextFollowUpAt !== undefined) {
      updateData.nextFollowUpAt = data.nextFollowUpAt;
    }
    if (data.result !== undefined) updateData.result = data.result;

    const doc = await CustomerActivity.findByIdAndUpdate(id, updateData, {
      new: true,
    }).lean();
    if (!doc) return null;
    return mapToActivity(doc as ICustomerActivity);
  }

  async delete(id: string): Promise<boolean> {
    const result = await CustomerActivity.findByIdAndDelete(id);
    return result !== null;
  }

  async count(params: Partial<CustomerActivityFilter> = {}): Promise<number> {
    const filter = buildFilter(params as CustomerActivityFilter);
    return CustomerActivity.countDocuments(filter);
  }
}

export const customerActivityRepository = new CustomerActivityRepository();

/**
 * ==================================================
 * SALES TARGET REPOSITORY
 * ==================================================
 *
 * Sprint 8.3 — Sales KPI & Target
 *
 * Clean Architecture: Repository layer for SalesTarget.
 */

import mongoose from "mongoose";
import { SalesTarget, type ISalesTarget } from "@/models/SalesTarget";

// ============================================================================
// Types
// ============================================================================

export interface CreateTargetData {
  employeeId: mongoose.Types.ObjectId;
  month: number;
  year: number;
  targetRevenue: number;
  targetOrders: number;
  targetCustomers: number;
  targetClosedLead?: number;
  note?: string;
}

export interface UpdateTargetData {
  targetRevenue?: number;
  targetOrders?: number;
  targetCustomers?: number;
  targetClosedLead?: number;
  note?: string;
}

// ============================================================================
// Mapper
// ============================================================================

function mapToTarget(doc: ISalesTarget) {
  return {
    _id: doc._id.toString(),
    employeeId: doc.employeeId.toString(),
    month: doc.month,
    year: doc.year,
    targetRevenue: doc.targetRevenue,
    targetOrders: doc.targetOrders,
    targetCustomers: doc.targetCustomers,
    targetClosedLead: doc.targetClosedLead,
    note: doc.note,
    isActive: doc.isActive,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// ============================================================================
// Repository
// ============================================================================

export class SalesTargetRepository {
  async create(data: CreateTargetData) {
    const doc = new SalesTarget(data);
    const saved = await doc.save();
    return mapToTarget(saved);
  }

  async findById(id: string) {
    const doc = await SalesTarget.findOne({
      _id: id,
      isActive: { $ne: false },
    }).lean();
    if (!doc) return null;
    return mapToTarget(doc as ISalesTarget);
  }

  async findCurrent(employeeId: string, month: number, year: number) {
    const doc = await SalesTarget.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      month,
      year,
      isActive: { $ne: false },
    }).lean();
    if (!doc) return null;
    return mapToTarget(doc as ISalesTarget);
  }

  async findByEmployee(employeeId: string) {
    const docs = await SalesTarget.find({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      isActive: { $ne: false },
    })
      .sort({ year: -1, month: -1 })
      .lean();
    return docs.map((doc) => mapToTarget(doc as ISalesTarget));
  }

  async findByMonth(month: number, year: number) {
    const docs = await SalesTarget.find({
      month,
      year,
      isActive: { $ne: false },
    })
      .populate("employeeId", "_id employeeCode fullName")
      .lean();
    return docs.map((doc) => mapToTarget(doc as ISalesTarget));
  }

  async findAll(month?: number, year?: number) {
    const filter: Record<string, unknown> = { isActive: { $ne: false } };
    if (month !== undefined) filter.month = month;
    if (year !== undefined) filter.year = year;

    const docs = await SalesTarget.find(filter)
      .populate("employeeId", "_id employeeCode fullName")
      .sort({ year: -1, month: -1 })
      .lean();
    return docs.map((doc) => mapToTarget(doc as ISalesTarget));
  }

  async update(id: string, data: UpdateTargetData) {
    const updateData: Record<string, unknown> = {};
    if (data.targetRevenue !== undefined) updateData.targetRevenue = data.targetRevenue;
    if (data.targetOrders !== undefined) updateData.targetOrders = data.targetOrders;
    if (data.targetCustomers !== undefined) updateData.targetCustomers = data.targetCustomers;
    if (data.targetClosedLead !== undefined) updateData.targetClosedLead = data.targetClosedLead;
    if (data.note !== undefined) updateData.note = data.note;

    const doc = await SalesTarget.findByIdAndUpdate(id, updateData, {
      new: true,
    }).lean();
    if (!doc) return null;
    return mapToTarget(doc as ISalesTarget);
  }

  async upsert(employeeId: string, month: number, year: number, data: UpdateTargetData) {
    const updateData: Record<string, unknown> = {};
    if (data.targetRevenue !== undefined) updateData.targetRevenue = data.targetRevenue;
    if (data.targetOrders !== undefined) updateData.targetOrders = data.targetOrders;
    if (data.targetCustomers !== undefined) updateData.targetCustomers = data.targetCustomers;
    if (data.targetClosedLead !== undefined) updateData.targetClosedLead = data.targetClosedLead;
    if (data.note !== undefined) updateData.note = data.note;

    const doc = await SalesTarget.findOneAndUpdate(
      {
        employeeId: new mongoose.Types.ObjectId(employeeId),
        month,
        year,
      },
      {
        $set: {
          ...updateData,
          isActive: true,
        },
        $setOnInsert: {
          employeeId: new mongoose.Types.ObjectId(employeeId),
          month,
          year,
        },
      },
      { returnDocument: "after", upsert: true, runValidators: true }
    ).lean();

    return doc ? mapToTarget(doc as ISalesTarget) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await SalesTarget.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { returnDocument: "after" }
    ).lean();
    return result !== null;
  }
}

export const salesTargetRepository = new SalesTargetRepository();

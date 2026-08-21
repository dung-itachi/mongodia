/**
 * Marketing Dispatch Service (Sprint 8.5 — Marketing → Sale Workflow)
 *
 * Chịu trách nhiệm:
 * 1. Push Lead từ Marketing sang Sale (Đẩy sang Sale)
 * 2. Đồng bộ dữ liệu giữa Marketing và Sale (cùng Lead)
 * 3. Ghi Timeline khi push
 * 4. Tự động tạo Order khi push (Sprint 8.5.2)
 *
 * Sale và Marketing nhìn cùng một Lead.
 */

import mongoose from "mongoose";
import { Lead } from "@/models/Lead";
import { LeadStatus } from "@/constants/leadStatus";
import { LeadAction } from "@/constants/leadAction";
import { LeadHistory } from "@/models/LeadHistory";
import { leadRepository } from "@/repositories/lead.repository";
import { leadService } from "@/services/lead.service";

/**
 * Input cho việc push lead sang Sale
 */
export interface PushLeadInput {
  /** IDs của các lead cần push */
  leadIds: string[];
  /** Sale employee được assign (optional - nếu có thì dùng, không thì auto-assign theo round-robin) */
  saleEmployeeId?: string;
  /** Actor (Marketing user) thực hiện push */
  pushedBy: string;
}

/**
 * Kết quả push lead
 */
export interface PushLeadResult {
  success: boolean;
  pushedCount: number;
  failedCount: number;
  errors: string[];
  leads?: Array<{
    id: string;
    leadCode: string;
    customerName: string;
    status: string;
    saleEmployeeId?: string;
    orderId?: string;
  }>;
}

/**
 * Result khi update lead status (từ Sale hoặc khi theo dõi)
 */
export interface UpdateLeadStatusResult {
  success: boolean;
  leadId: string;
  oldStatus: string;
  newStatus: string;
  error?: string;
}

export class MarketingDispatchService {
  /**
   * Push nhiều leads sang Sale
   *
   * Business Rules (Sprint 8.5):
   * - Lead phải ở trạng thái NEW hoặc chưa được assign sale
   * - Lead đã convert (isConverted=true) → không cho push
   * - Nếu có saleEmployeeId → assign trực tiếp cho sale đó
   * - Nếu không có → tự động assign cho sale có ít leads nhất (round-robin)
   * - Sau khi push: lead.status = NEW (Sale mới tiếp nhận, chưa liên hệ)
   */
  async pushLeadsToSale(input: PushLeadInput): Promise<PushLeadResult> {
    const { leadIds, saleEmployeeId, pushedBy } = input;
    const errors: string[] = [];
    const pushedLeads: PushLeadResult["leads"] = [];
    let pushedCount = 0;
    let failedCount = 0;

    // Validate input
    if (!leadIds || leadIds.length === 0) {
      return {
        success: false,
        pushedCount: 0,
        failedCount: 0,
        errors: ["Danh sách lead rỗng"],
      };
    }

    // Auto-assign logic nếu không có saleEmployeeId
    let targetSaleId: string | undefined = saleEmployeeId;
    if (!targetSaleId) {
      const foundSaleId = await this.findAvailableSaleEmployee();
      if (!foundSaleId) {
        return {
          success: false,
          pushedCount: 0,
          failedCount: leadIds.length,
          errors: ["Không tìm thấy nhân viên Sale khả dụng"],
        };
      }
      targetSaleId = foundSaleId;
    }

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      for (const leadId of leadIds) {
        try {
          // 1. Find lead
          const lead = await Lead.findById(leadId).session(session);
          if (!lead) {
            errors.push(`Lead ${leadId} không tồn tại`);
            failedCount++;
            continue;
          }

          // 2. Check if already converted (Sprint 8.5: không push lead đã convert)
          if (lead.isConverted) {
            errors.push(`Lead ${lead.leadCode} đã được chốt đơn trước đó`);
            failedCount++;
            continue;
          }

          // 3. Check if already has sale
          if (lead.saleEmployeeId && !saleEmployeeId) {
            // Đã có sale, bỏ qua nếu không chỉ định sale cụ thể
            errors.push(`Lead ${lead.leadCode} đã được phân công Sale trước đó`);
            failedCount++;
            continue;
          }

          // 4. Update lead: assign sale
          const oldStatus = lead.status;
          lead.saleEmployeeId = new mongoose.Types.ObjectId(targetSaleId);
          lead.assignedAt = new Date();
          lead.assignmentType = saleEmployeeId ? "MANUAL" : "AUTO";
          // Sprint 8.X: Set to POTENTIAL để có thể tự động convert thành đơn hàng
          // (convertLead yêu cầu status QUALIFIED hoặc POTENTIAL)
          lead.status = LeadStatus.POTENTIAL;

          await lead.save({ session });

          // 5. Tự động tạo Order cho lead (Sprint 8.5.2)
          try {
            const convertResult = await leadService.convertLead(leadId, targetSaleId);
            if (convertResult.success) {
              // Update lead với orderId
              lead.isConverted = true;
              lead.convertedOrderId = new mongoose.Types.ObjectId(convertResult.orderId);
              lead.convertedAt = new Date();
              await lead.save({ session });
            } else {
              // Nếu convert thất bại, vẫn giữ status POTENTIAL để Sale có thể convert sau
              console.warn(`Convert failed for lead ${leadId}: ${convertResult.error}`);
            }
          } catch (orderError) {
            console.error(`Failed to create order for lead ${leadId}:`, orderError);
            // Không fail cả transaction vì lead đã được push thành công
          }

          // 6. Create timeline record
          await LeadHistory.create(
            [
              {
                leadId: lead._id,
                employeeId: new mongoose.Types.ObjectId(pushedBy),
                action: LeadAction.ASSIGNED,
                oldValue: oldStatus ?? "(null)",
                newValue: targetSaleId,
                note: saleEmployeeId
                  ? "Marketing đẩy sang Sale (chỉ định) - Tự động tạo đơn hàng"
                  : "Marketing đẩy sang Sale (auto-assign) - Tự động tạo đơn hàng",
              },
            ],
            { session }
          );

          pushedCount++;
          pushedLeads.push({
            id: lead._id.toString(),
            leadCode: lead.leadCode,
            customerName: lead.customerName,
            status: lead.status,
            saleEmployeeId: targetSaleId,
            orderId: lead.convertedOrderId?.toString(),
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          errors.push(`Lỗi khi xử lý lead ${leadId}: ${errorMsg}`);
          failedCount++;
        }
      }

      await session.commitTransaction();

      return {
        success: pushedCount > 0,
        pushedCount,
        failedCount,
        errors,
        leads: pushedLeads,
      };
    } catch (error) {
      await session.abortTransaction();
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        pushedCount,
        failedCount: leadIds.length,
        errors: [`Transaction failed: ${errorMsg}`],
      };
    } finally {
      session.endSession();
    }
  }

  /**
   * Tìm Sale employee có ít leads nhất (round-robin)
   * TODO: Có thể mở rộng với team assignment logic
   */
  private async findAvailableSaleEmployee(): Promise<string | null> {
    // Import Employee model
    const Employee = (await import("@/models/Employee")).default;
    const Role = (await import("@/models/Role")).default;

    // Find SALE role (case-insensitive)
    const saleRole = await Role.findOne({ 
      code: { $regex: /^sale$/i } 
    }).lean();
    
    if (!saleRole) {
      return null;
    }

    // Find active sale employees
    const saleEmployees = await Employee.find({
      roleId: saleRole._id,
      isActive: true,
    })
      .select("_id")
      .lean();
    
    if (saleEmployees.length === 0) {
      return null;
    }

    // Count leads per sale employee
    const leadCounts = await Lead.aggregate([
      {
        $match: {
          saleEmployeeId: { $in: saleEmployees.map((e) => e._id) },
          isActive: true,
          isConverted: false,
        },
      },
      {
        $group: {
          _id: "$saleEmployeeId",
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map(
      leadCounts.map((r) => [r._id.toString(), r.count])
    );

    // Find employee with minimum leads
    let minCount = Infinity;
    let selectedEmployeeId: string | null = null;

    for (const emp of saleEmployees) {
      const empId = emp._id.toString();
      const count = countMap.get(empId) || 0;
      if (count < minCount) {
        minCount = count;
        selectedEmployeeId = empId;
      }
    }

    return selectedEmployeeId;
  }

  /**
   * Update lead status (từ Sale)
   *
   * Khi Sale đổi trạng thái:
   * - NEW → CONTACTED → QUALIFIED → POTENTIAL → CLOSED
   * - NO_ANSWER: Không nghe máy (quay lại sau)
   * - LOST: Không nhu cầu
   *
   * Chỉ ghi nhận thay đổi vào Timeline.
   * KHÔNG tạo Order - Order chỉ được tạo khi Sale bấm "Chốt" (convertLead)
   */
  async updateLeadStatus(
    leadId: string,
    newStatus: LeadStatus,
    updatedBy: string,
    note?: string
  ): Promise<UpdateLeadStatusResult> {
    // 1. Find lead
    const existingLead = await leadRepository.findById(leadId);
    if (!existingLead) {
      return {
        success: false,
        leadId,
        oldStatus: "",
        newStatus,
        error: "Lead không tồn tại",
      };
    }

    // 2. Check if already converted
    if (existingLead.isConverted) {
      return {
        success: false,
        leadId,
        oldStatus: existingLead.status,
        newStatus,
        error: "Lead đã được chốt đơn, không thể cập nhật trạng thái",
      };
    }

    const oldStatus = existingLead.status;

    // 3. Update status
    const updatedLead = await leadRepository.update(leadId, {
      status: newStatus,
    });

    if (!updatedLead) {
      return {
        success: false,
        leadId,
        oldStatus,
        newStatus,
        error: "Không thể cập nhật trạng thái",
      };
    }

    // 4. Create timeline record
    await LeadHistory.create([
      {
        leadId: new mongoose.Types.ObjectId(leadId),
        employeeId: new mongoose.Types.ObjectId(updatedBy),
        action: LeadAction.STATUS_CHANGED,
        oldValue: oldStatus,
        newValue: newStatus,
        note: note || `Sale cập nhật trạng thái: ${oldStatus} → ${newStatus}`,
      },
    ]);

    return {
      success: true,
      leadId,
      oldStatus,
      newStatus,
    };
  }

  /**
   * Reassign lead to different Sale employee (Admin/Manager)
   */
  async reassignLead(
    leadId: string,
    newSaleEmployeeId: string,
    reassignedBy: string
  ): Promise<{
    success: boolean;
    leadId: string;
    errors: string[];
  }> {
    // 1. Find lead
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return {
        success: false,
        leadId,
        errors: ["Lead không tồn tại"],
      };
    }

    // 2. Check if already converted
    if (lead.isConverted) {
      return {
        success: false,
        leadId,
        errors: ["Lead đã được chốt đơn, không thể phân công lại"],
      };
    }

    const oldSaleId = lead.saleEmployeeId?.toString();
    const newSaleId = new mongoose.Types.ObjectId(newSaleEmployeeId);

    // 3. Update lead
    lead.saleEmployeeId = newSaleId;
    lead.assignedAt = new Date();
    lead.assignmentType = "MANUAL"; // Manual reassignment

    await lead.save();

    // 4. Create timeline record
    await LeadHistory.create([
      {
        leadId: lead._id,
        employeeId: new mongoose.Types.ObjectId(reassignedBy),
        action: LeadAction.ASSIGNED,
        oldValue: oldSaleId || "(chưa có)",
        newValue: newSaleEmployeeId,
        note: "Admin/Manager phân công lại lead cho Sale khác",
      },
    ]);

    return {
      success: true,
      leadId,
      errors: [],
    };
  }

  /**
   * Bulk reassign leads to multiple sale employees (round-robin)
   */
  async bulkReassignLeads(
    leadIds: string[],
    saleEmployeeIds: string[],
    reassignedBy: string
  ): Promise<Array<{ leadId: string; success: boolean; error?: string }>> {
    const results: Array<{ leadId: string; success: boolean; error?: string }> = [];

    // Round-robin assignment
    for (let i = 0; i < leadIds.length; i++) {
      const leadId = leadIds[i];
      const saleEmployeeId = saleEmployeeIds[i % saleEmployeeIds.length];

      try {
        const result = await this.reassignLead(leadId, saleEmployeeId, reassignedBy);
        results.push({
          leadId,
          success: result.success,
          error: result.errors[0],
        });
      } catch (err) {
        results.push({
          leadId,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Lấy danh sách leads cho Sale (Số cần gọi)
   *
   * - Nếu saleEmployeeId = null → lấy TẤT CẢ leads (Admin/Manager)
   * - Nếu saleEmployeeId = string → chỉ lấy leads của sale đó
   *
   * Leads hiển thị:
   * - Đã được assign cho sale
   * - isActive = true
   */
  async getSaleLeads(
    saleEmployeeId: string | null,
    options: {
      status?: LeadStatus[];
      keyword?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { status, keyword, page = 1, limit = 20 } = options;

    const filter: Record<string, unknown> = {
      isActive: true,
    };

    // If saleEmployeeId is provided, filter by that employee
    if (saleEmployeeId) {
      filter.saleEmployeeId = new mongoose.Types.ObjectId(saleEmployeeId);
    }
    // If saleEmployeeId is null, return all leads (for Admin/Manager)

    if (status && status.length > 0) {
      filter.status = { $in: status };
    }

    if (keyword) {
      filter.$or = [
        { customerName: { $regex: keyword, $options: "i" } },
        { phone: { $regex: keyword, $options: "i" } },
        { leadCode: { $regex: keyword, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    // Get lead IDs for history count query
    const leadIds = await Lead.find(filter).select("_id").lean();

    // Count NO_ANSWER occurrences per lead
    const noAnswerCounts = await LeadHistory.aggregate([
      {
        $match: {
          leadId: { $in: leadIds.map((l) => l._id) },
          action: LeadAction.STATUS_CHANGED,
          newValue: LeadStatus.NO_ANSWER,
        },
      },
      {
        $group: {
          _id: "$leadId",
          count: { $sum: 1 },
        },
      },
    ]);

    const noAnswerMap = new Map(
      noAnswerCounts.map((item: { _id: unknown; count: number }) => [
        (item._id as mongoose.Types.ObjectId).toString(),
        item.count,
      ])
    );

    const [items, total] = await Promise.all([
      Lead.find(filter)
        .populate("marketingEmployeeId", "_id employeeCode name")
        .populate("saleEmployeeId", "_id employeeCode name")
        .populate("productId", "_id code name")
        .populate("comboId", "_id code name")
        .populate("facebookPageId", "_id code name")
        .sort({ assignedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    return {
      items: items.map((doc) => ({
        _id: doc._id.toString(),
        leadCode: doc.leadCode,
        customerName: doc.customerName,
        phone: doc.phone,
        address: doc.address,
        sourceType: doc.sourceType,
        status: doc.status,
        product: doc.productId && typeof doc.productId === "object" && "name" in doc.productId
          ? {
              _id: (doc.productId as { _id: { toString(): string } })._id.toString(),
              code: (doc.productId as { code: string }).code,
              name: (doc.productId as { name: string }).name,
            }
          : undefined,
        combo: doc.comboId && typeof doc.comboId === "object" && "name" in doc.comboId
          ? {
              _id: (doc.comboId as { _id: { toString(): string } })._id.toString(),
              code: (doc.comboId as { code: string }).code,
              name: (doc.comboId as { name: string }).name,
            }
          : undefined,
        quantity: doc.quantity,
        unitPriceMNT: doc.unitPriceMNT,
        exchangeRate: doc.exchangeRate,
        marketingEmployeeId: doc.marketingEmployeeId,
        saleEmployeeId: doc.saleEmployeeId,
        assignedAt: doc.assignedAt,
        isConverted: doc.isConverted,
        noAnswerCount: noAnswerMap.get(doc._id.toString()) || 0,
        facebookPage: doc.facebookPageId && typeof doc.facebookPageId === "object" && "name" in doc.facebookPageId
          ? {
              _id: (doc.facebookPageId as { _id: { toString(): string } })._id.toString(),
              code: (doc.facebookPageId as { code: string }).code,
              name: (doc.facebookPageId as { name: string }).name,
            }
          : undefined,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Lấy danh sách leads cho Marketing theo dõi (Quản lý đơn hàng MKT)
   *
   * Marketing chỉ được XEM, không được SỬA trạng thái.
   * Hiển thị tất cả leads của marketing employee này,
   * bao gồm cả leads đã push sang Sale.
   */
  async getMarketingLeadTracking(
    marketingEmployeeId: string,
    options: {
      status?: LeadStatus[];
      keyword?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { status, keyword, page = 1, limit = 20 } = options;

    const filter: Record<string, unknown> = {
      marketingEmployeeId: new mongoose.Types.ObjectId(marketingEmployeeId),
      isActive: true,
    };

    if (status && status.length > 0) {
      filter.status = { $in: status };
    }

    if (keyword) {
      filter.$or = [
        { customerName: { $regex: keyword, $options: "i" } },
        { phone: { $regex: keyword, $options: "i" } },
        { leadCode: { $regex: keyword, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Lead.find(filter)
        .populate("saleEmployeeId", "_id employeeCode name")
        .populate("productId", "_id code name")
        .populate("comboId", "_id code name")
        .populate("facebookPageId", "_id code name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    return {
      items: items.map((doc) => ({
        _id: doc._id.toString(),
        leadCode: doc.leadCode,
        customerName: doc.customerName,
        phone: doc.phone,
        address: doc.address,
        sourceType: doc.sourceType,
        status: doc.status,
        product: doc.product,
        combo: doc.combo,
        quantity: doc.quantity,
        unitPriceMNT: doc.unitPriceMNT,
        exchangeRate: doc.exchangeRate,
        saleEmployeeId: doc.saleEmployeeId,
        isConverted: doc.isConverted,
        convertedOrderId: doc.convertedOrderId?.toString(),
        facebookPage: doc.facebookPageId && typeof doc.facebookPageId === "object" && "name" in doc.facebookPageId
          ? {
              _id: (doc.facebookPageId as { _id: { toString(): string } })._id.toString(),
              code: (doc.facebookPageId as { code: string }).code,
              name: (doc.facebookPageId as { name: string }).name,
            }
          : undefined,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Get counts for Sale dashboard (Số cần gọi)
   * 
   * - Nếu saleEmployeeId = null → đếm TẤT CẢ leads (Admin/Manager)
   * - Nếu saleEmployeeId = string → chỉ đếm leads của sale đó
   */
  async getSaleLeadCounts(saleEmployeeId: string | null) {
    const baseFilter: Record<string, unknown> = {
      isActive: true,
    };

    // If saleEmployeeId is provided, filter by that employee
    if (saleEmployeeId) {
      baseFilter.saleEmployeeId = new mongoose.Types.ObjectId(saleEmployeeId);
    }
    // If saleEmployeeId is null, count all leads (for Admin/Manager)

    const [total, newCount, contactedCount, noAnswerCount, potentialCount, closedCount] =
      await Promise.all([
        Lead.countDocuments(baseFilter),
        Lead.countDocuments({
          ...baseFilter,
          status: LeadStatus.NEW,
        }),
        Lead.countDocuments({
          ...baseFilter,
          status: LeadStatus.CONTACTED,
        }),
        Lead.countDocuments({
          ...baseFilter,
          status: LeadStatus.NO_ANSWER,
        }),
        Lead.countDocuments({
          ...baseFilter,
          status: LeadStatus.POTENTIAL,
        }),
        Lead.countDocuments({
          ...baseFilter,
          status: LeadStatus.CLOSED,
        }),
      ]);

    return {
      total,
      new: newCount,
      contacted: contactedCount,
      noAnswer: noAnswerCount,
      potential: potentialCount,
      closed: closedCount,
    };
  }

  /**
   * Get counts for Marketing tracking (Quản lý đơn hàng MKT)
   */
  async getMarketingLeadTrackingCounts(marketingEmployeeId: string) {
    const baseFilter = {
      marketingEmployeeId: new mongoose.Types.ObjectId(marketingEmployeeId),
      isActive: true,
    };

    const [total, newCount, contactedCount, qualifiedCount, potentialCount, closedCount, convertedCount] =
      await Promise.all([
        Lead.countDocuments(baseFilter),
        Lead.countDocuments({
          ...baseFilter,
          status: LeadStatus.NEW,
        }),
        Lead.countDocuments({
          ...baseFilter,
          status: LeadStatus.CONTACTED,
        }),
        Lead.countDocuments({
          ...baseFilter,
          status: LeadStatus.QUALIFIED,
        }),
        Lead.countDocuments({
          ...baseFilter,
          status: LeadStatus.POTENTIAL,
        }),
        Lead.countDocuments({
          ...baseFilter,
          status: LeadStatus.CLOSED,
          isConverted: false,
        }),
        Lead.countDocuments({
          ...baseFilter,
          isConverted: true,
        }),
      ]);

    return {
      total,
      new: newCount,
      contacted: contactedCount,
      qualified: qualifiedCount,
      potential: potentialCount,
      closed: closedCount,
      converted: convertedCount,
    };
  }

  /**
   * Đếm số leads đã được đẩy sang Sale (có saleEmployeeId)
   */
  async countPushedLeads(marketingEmployeeId?: string): Promise<number> {
    const filter: Record<string, unknown> = {
      isActive: true,
      saleEmployeeId: { $exists: true, $ne: null },
    };

    if (marketingEmployeeId) {
      filter.marketingEmployeeId = new mongoose.Types.ObjectId(marketingEmployeeId);
    }

    return Lead.countDocuments(filter);
  }
}

// Singleton instance
export const marketingDispatchService = new MarketingDispatchService();

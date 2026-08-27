/**
 * Lead Service (Sprint 5.2 — Lead Domain Foundation)
 *
 * Clean Architecture: Service layer cho Lead.
 * Chứa business logic - được gọi bởi API Routes.
 */

import mongoose from "mongoose";
import Counter from "@/models/Counter";
import { LeadStatus } from "@/constants/leadStatus";
import { LeadHistory } from "@/models/LeadHistory";
import { LeadAction } from "@/constants/leadAction";
import { leadRepository } from "@/repositories/lead.repository";
import { Lead } from "@/models/Lead";
import Employee from "@/models/Employee";
import Role from "@/models/Role";
import { orderService } from "@/services/order.service";
import { saleOrderService, type ValidatedSaleOrderItem } from "@/services/sale-order.service";
import type { OrderItem } from "@/types/variant";
import type {
  Lead as LeadDomain,
  LeadSearchParams,
  LeadListResponse,
  CreateLeadInput,
  UpdateLeadInput,
  AssignLeadInput,
} from "@/types/lead";

/**
 * Generate unique lead code
 */
async function generateLeadCode(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  const counterKey = `lead_${year}${month}${day}`;

  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );

  const sequence = (counter?.seq || 1).toString().padStart(4, "0");
  return `LD${year}${month}${day}${sequence}`;
}

function getLeadActorId(actorId?: string): string {
  if (actorId) {
    return actorId;
  }

  throw new Error("Lead actor id is required");
}

export class LeadService {
  /**
   * Create a new lead
   */
  async createLead(
    data: CreateLeadInput,
    createdBy: string
  ): Promise<LeadDomain> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const leadCode = await generateLeadCode();

      const lead = await leadRepository.create({
        ...data,
        leadCode,
        status: data.status || LeadStatus.NEW,
        isDuplicate: data.isDuplicate ?? false,
        isActive: true,
      });

      await LeadHistory.create(
        [
          {
            leadId: lead._id,
            employeeId: createdBy,
            action: LeadAction.CREATED,
            note: "Tạo lead mới",
          },
        ],
        { session }
      );

      await session.commitTransaction();

      return lead;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Update a lead
   */
  async updateLead(
    id: string,
    data: UpdateLeadInput,
    updatedBy: string
  ): Promise<LeadDomain | null> {
    const existingLead = await leadRepository.findById(id);
    if (!existingLead) {
      return null;
    }

    const updatedLead = await leadRepository.update(id, data);

    if (updatedLead) {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();

        await LeadHistory.create(
          [
            {
              leadId: id,
              employeeId: updatedBy,
              action: LeadAction.UPDATED,
              note: "Cập nhật thông tin lead",
            },
          ],
          { session }
        );

        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        console.error("Failed to create lead history:", error);
      } finally {
        session.endSession();
      }
    }

    return updatedLead;
  }

  /**
   * Assign lead to a sale employee (Sprint 5.5.2)
   */
  async assignLead(
    id: string,
    data: AssignLeadInput,
    assignedBy: string
  ): Promise<{ success: true; lead: LeadDomain } | { success: false; error: string }> {
    // 1. Check lead exists
    const existingLead = await leadRepository.findById(id);
    if (!existingLead) {
      return { success: false, error: "Lead không tồn tại" };
    }

    // 2. Check lead is active
    if (!existingLead.isActive) {
      return { success: false, error: "Lead không hoạt động" };
    }

    // 3. Check sale employee exists
    const saleEmployee = await Employee.findById(data.saleEmployeeId);
    if (!saleEmployee) {
      return { success: false, error: "Nhân viên Sale không tồn tại" };
    }

    // 4. Check sale employee is active
    if (!saleEmployee.isActive) {
      return { success: false, error: "Nhân viên Sale không hoạt động" };
    }

    // 5. Check sale employee has SALE role
    const role = await Role.findById(saleEmployee.roleId).lean();
    if (!role || role.code !== "SALE") {
      return { success: false, error: "Người được phân công phải có vai trò Sale" };
    }

    // 6. Check if assigning to same sale
    if (existingLead.saleEmployeeId === data.saleEmployeeId) {
      return { success: false, error: "Lead đã được phân công cho nhân viên Sale này" };
    }

    const oldSaleEmployeeId = existingLead.saleEmployeeId ?? null;

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const updatedLead = await leadRepository.assignSale(id, data.saleEmployeeId);

      if (!updatedLead) {
        await session.abortTransaction();
        return { success: false, error: "Không thể cập nhật lead" };
      }

      await LeadHistory.create(
        [
          {
            leadId: new mongoose.Types.ObjectId(id),
            employeeId: new mongoose.Types.ObjectId(assignedBy),
            action: LeadAction.ASSIGNED,
            oldValue: oldSaleEmployeeId ?? undefined,
            newValue: data.saleEmployeeId,
            note: `saleEmployeeId: ${oldSaleEmployeeId ?? "(null)"} → ${saleEmployee.fullName} (${data.saleEmployeeId})`,
          },
        ],
        { session }
      );

      await session.commitTransaction();

      return { success: true, lead: updatedLead };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Delete a lead (soft delete)
   */
  async deleteLead(id: string, deletedBy: string): Promise<boolean> {
    const existingLead = await leadRepository.findById(id);
    if (!existingLead) {
      return false;
    }

    const result = await leadRepository.delete(id);

    if (result) {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();

        await LeadHistory.create(
          [
            {
              leadId: id,
              employeeId: deletedBy,
              action: LeadAction.DELETED,
              note: "Xóa lead",
            },
          ],
          { session }
        );

        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        console.error("Failed to create lead history:", error);
      } finally {
        session.endSession();
      }
    }

    return result;
  }

  /**
   * Get lead by ID
   */
  async getLeadById(id: string): Promise<LeadDomain | null> {
    return leadRepository.findById(id);
  }

  /**
   * Search leads with pagination
   */
  async searchLeads(params: LeadSearchParams): Promise<LeadListResponse> {
    return leadRepository.findAll({
      ...params,
      isActive: true,
    });
  }

  /**
   * Count leads
   */
  async countLeads(params: Partial<LeadSearchParams> = {}): Promise<number> {
    return leadRepository.count({
      ...params,
      isActive: true,
    });
  }

  /**
   * Check if phone exists
   */
  async isPhoneExists(phone: string, excludeId?: string): Promise<boolean> {
    const exists = await leadRepository.existsByPhone(phone);
    if (!exists) return false;
    // TODO: Implement exclude by ID logic if needed
    return true;
  }

  async getById(id: string) {
    return leadRepository.findById(id);
  }

  async create(data: CreateLeadInput, createdBy: string) {
    return this.createLead(data, createdBy);
  }

  async update(id: string, data: UpdateLeadInput, updatedBy: string) {
    return this.updateLead(id, data, updatedBy);
  }

  async delete(id: string, deletedBy: string) {
    return this.deleteLead(id, deletedBy);
  }

  async assign(id: string, data: AssignLeadInput, assignedBy: string) {
    return this.assignLead(id, data, assignedBy);
  }

  /**
   * Convert lead to order (Sprint 5.7, 8.4 — Lead Convert to Order)
   *
   * Business Rules (Sprint 8.4):
   * - Lead phải ở trạng thái QUALIFIED hoặc POTENTIAL
   * - Lead KHÔNG được convert nếu: Không nhu cầu, Sai số, Không nghe, Máy bận
   * - Lead đã convert rồi → không cho convert lần nữa
   * - Sau khi convert: Lead.isConverted = true, Lead.convertedOrderId = orderId
   */
  async convertLead(
    id: string,
    convertedBy: string,
    orderItem?: OrderItem
  ): Promise<{ success: true; orderId: string } | { success: false; error: string }> {
    // 1. Check lead exists
    const existingLead = await leadRepository.findById(id);
    if (!existingLead) {
      return { success: false, error: "Lead không tồn tại" };
    }

    // 2. Check lead is active
    if (!existingLead.isActive) {
      return { success: false, error: "Lead không hoạt động" };
    }

    // 3. Check lead has sale employee and belongs to the Sale actor.
    if (!existingLead.saleEmployeeId) {
      return { success: false, error: "Lead chưa được phân công Sale" };
    }
    if (existingLead.saleEmployeeId.toString() !== convertedBy) {
      return { success: false, error: "Bạn không được chốt đơn cho lead này" };
    }

    // 4. Check lead is not already converted (Sprint 8.4)
    if (existingLead.isConverted) {
      return { success: false, error: "Lead đã được convert trước đó" };
    }

    // 5. Check lead status is NEW, QUALIFIED hoặc POTENTIAL (Sprint 8.4)
    // NEW: Lead mới được đẩy từ Marketing sang Sale
    // QUALIFIED/POTENTIAL: Lead đã được Sale xác nhận có nhu cầu
    const convertibleStatuses = [LeadStatus.NEW, LeadStatus.QUALIFIED, LeadStatus.POTENTIAL];
    if (!convertibleStatuses.includes(existingLead.status as LeadStatus)) {
      return {
        success: false,
        error: "Lead phải ở trạng thái Mới, Tiềm năng hoặc Đủ điều kiện để chốt đơn"
      };
    }

    if (!orderItem) {
      return { success: false, error: "Thiếu thông tin đơn hàng" };
    }

    let validatedOrderItem: ValidatedSaleOrderItem;
    try {
      validatedOrderItem = await saleOrderService.validateItem(orderItem);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Thông tin đơn hàng không hợp lệ" };
    }

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // Claim the lead inside the transaction so concurrent chốt requests cannot both create an order.
      const claimedLead = await Lead.findOneAndUpdate(
        { _id: id, isConverted: false, convertedOrderId: { $exists: false } },
        { $set: { isConverted: true, convertedAt: new Date(), updatedAt: new Date() } },
        { returnDocument: "after", session },
      );
      if (!claimedLead) {
        await session.abortTransaction();
        return { success: false, error: "Lead đã được convert trước đó" };
      }

      // Determine customerId: use existing or auto-create from lead
      let customerId = existingLead.customerId?.toString();

      if (!customerId) {
        // Auto-create Customer from Lead
        const created = await orderService.createCustomerFromLead(
          {
            customerName: existingLead.customerName,
            phone: existingLead.phone ?? "",
            email: existingLead.email,
            address: existingLead.address,
            marketingEmployeeId: existingLead.marketingEmployeeId?.toString(),
            saleEmployeeId: existingLead.saleEmployeeId?.toString(),
          },
          session
        );
        customerId = created._id.toString();
      }

      // Resolve default warehouse from the converting employee.
      const converter = await Employee.findById(convertedBy).lean();
      const defaultWarehouseId = converter?.warehouseId?.toString();

      // Create order from lead
      const order = await orderService.createFromLead(
        {
          leadId: id,
          customerId,
          customerName: existingLead.customerName,
          customerPhone: existingLead.phone,
          productId: validatedOrderItem.productId,
          comboId: validatedOrderItem.comboId,
          warehouseId: defaultWarehouseId,
          productSnapshot: undefined,
          comboSnapshot: undefined,
          quantity: validatedOrderItem.comboQuantity,
          unitPrice: validatedOrderItem.sellingPrice,
          totalAmount: validatedOrderItem.subtotal,
          orderItem: {
            ...validatedOrderItem,
            details: validatedOrderItem.details.map((d) => ({
              quantity: d.quantity,
              variantId: d.variantId ?? undefined,
              attributes: d.attributes,
            })),
          },
          currency: "VND",
          estimatedWeight: existingLead.estimatedWeight,
          marketingEmployeeId: existingLead.marketingEmployeeId?.toString(),
          saleEmployeeId: existingLead.saleEmployeeId?.toString(),
          note: existingLead.note,
          // Sprint 8.x: thời gian đơn hàng từ Lead
          orderDate: existingLead.orderDate,
          receivedDate: existingLead.receivedDate,
          // Sprint 8.x: địa chỉ giao hàng từ Lead
          address: existingLead.address,
        },
        session
      );

      // Update lead with conversion info (Sprint 8.4: use convertedOrderId)
      // Sprint 8.x: Lead.status = CLOSED ngay khi Sale chốt đơn (không đợi
      // Admin xác nhận Order). Cột "Tình trạng ĐH" ở FE sẽ tự populate
      // Order.status (WAIT_CONFIRM/CONFIRMED/...) qua batch lookup.
      await Lead.findByIdAndUpdate(
        id,
        {
          status: LeadStatus.CLOSED,
          convertedOrderId: order._id,
          convertedAt: new Date(),
          updatedAt: new Date(),
        },
        { session }
      );

      // Create LeadHistory record
      await LeadHistory.create(
        [
          {
            leadId: new mongoose.Types.ObjectId(id),
            employeeId: new mongoose.Types.ObjectId(convertedBy),
            action: LeadAction.CONVERT,
            oldValue: undefined,
            newValue: order._id.toString(),
            note: "Lead converted to Order",
          },
        ],
        { session }
      );

      await session.commitTransaction();

      return { success: true, orderId: order._id.toString() };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async search(params: LeadSearchParams) {
    return this.searchLeads(params);
  }
}

// Singleton instance
export const leadService = new LeadService();

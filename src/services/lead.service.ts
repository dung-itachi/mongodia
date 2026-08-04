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

  const counter = await Counter.findByIdAndUpdate(
    `lead_${year}${month}${day}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
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
   * Assign lead to a sale employee
   */
  async assignLead(
    id: string,
    data: AssignLeadInput,
    assignedBy: string
  ): Promise<LeadDomain | null> {
    const existingLead = await leadRepository.findById(id);
    if (!existingLead) {
      return null;
    }

    const updatedLead = await leadRepository.update(id, {
      saleEmployeeId: data.saleEmployeeId,
      assignmentType: data.assignmentType,
      assignedAt: new Date(),
      status: LeadStatus.ASSIGNED,
    });

    if (updatedLead) {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();

        await LeadHistory.create(
          [
            {
              leadId: id,
              employeeId: assignedBy,
              action: LeadAction.ASSIGNED,
              note: `Phân công cho sale: ${data.saleEmployeeId}`,
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

  async search(params: LeadSearchParams) {
    return this.searchLeads(params);
  }
}

// Singleton instance
export const leadService = new LeadService();

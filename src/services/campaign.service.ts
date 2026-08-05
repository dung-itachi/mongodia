/**
 * ==================================================
 * CAMPAIGN SERVICE
 * ==================================================
 *
 * Sprint 7.4 — Facebook Page & Campaign Management
 *
 * Clean Architecture: Service layer cho Campaign.
 * Chứa business logic - được gọi bởi API Routes.
 *
 * Business rules:
 *   1. Code là duy nhất - không trùng.
 *   2. Campaign phải thuộc một Facebook Page.
 *   3. Khi soft delete, chỉ set isActive = false.
 */

import mongoose from "mongoose";
import { campaignRepository, type CreateCampaignData, type UpdateCampaignData, type CampaignFilter } from "@/repositories/campaign.repository";
import { facebookPageRepository } from "@/repositories/facebook-page.repository";

// ============================================================================
// Result helpers
// ============================================================================

export interface CampaignOk<T> {
  success: true;
  data: T;
}

export interface CampaignErr {
  success: false;
  error: string;
}

export type CampaignResult<T> = CampaignOk<T> | CampaignErr;

// ============================================================================
// Service
// ============================================================================

export class CampaignService {
  /**
   * Create a new Campaign.
   *
   * Business rules:
   *   - Code là duy nhất.
   *   - Facebook Page phải tồn tại.
   */
  async create(
    input: CreateCampaignData
  ): Promise<CampaignResult<unknown>> {
    // Validate required fields
    if (!input.code?.trim()) {
      return { success: false, error: "Mã campaign là bắt buộc" };
    }
    if (!input.name?.trim()) {
      return { success: false, error: "Tên campaign là bắt buộc" };
    }
    if (!input.facebookPageId) {
      return { success: false, error: "Facebook Page là bắt buộc" };
    }

    // Validate Facebook Page exists
    const pageExists = await facebookPageRepository.findById(input.facebookPageId.toString());
    if (!pageExists) {
      return { success: false, error: "Facebook Page không tồn tại" };
    }

    // Check duplicate code
    const codeExists = await campaignRepository.existsByCode(input.code.trim());
    if (codeExists) {
      return { success: false, error: "Mã campaign đã tồn tại" };
    }

    // Validate startDate
    if (!input.startDate || Number.isNaN(new Date(input.startDate).getTime())) {
      return { success: false, error: "Ngày bắt đầu không hợp lệ" };
    }

    const data: CreateCampaignData = {
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      facebookPageId: input.facebookPageId,
      objective: input.objective?.trim() ?? "",
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      dailyBudget: Math.max(0, input.dailyBudget ?? 0),
      lifetimeBudget: Math.max(0, input.lifetimeBudget ?? 0),
      status: input.status ?? "ACTIVE",
      marketingEmployeeId: input.marketingEmployeeId ?? null,
      note: input.note?.trim() ?? "",
    };

    const campaign = await campaignRepository.create(data);
    return { success: true, data: campaign };
  }

  /**
   * Get a Campaign by ID.
   */
  async getById(id: string): Promise<CampaignResult<unknown>> {
    const campaign = await campaignRepository.findById(id);
    if (!campaign) {
      return { success: false, error: "Campaign không tồn tại" };
    }
    return { success: true, data: campaign };
  }

  /**
   * Get a Campaign by ID with populated refs.
   */
  async getByIdWithPopulate(id: string): Promise<CampaignResult<unknown>> {
    const campaign = await campaignRepository.findByIdWithPopulate(id);
    if (!campaign) {
      return { success: false, error: "Campaign không tồn tại" };
    }
    return { success: true, data: campaign };
  }

  /**
   * Get list of Campaigns with pagination & filters.
   */
  async getList(filter: CampaignFilter) {
    return campaignRepository.findAll(filter);
  }

  /**
   * Update a Campaign.
   *
   * Business rules:
   *   - Code không thể thay đổi nếu đã có Expense liên quan.
   *   - Facebook Page không thể thay đổi nếu đã có Expense.
   *   - Khi update, validate code uniqueness nếu thay đổi.
   */
  async update(
    id: string,
    input: UpdateCampaignData
  ): Promise<CampaignResult<unknown>> {
    // Check existing
    const existing = await campaignRepository.findById(id);
    if (!existing) {
      return { success: false, error: "Campaign không tồn tại" };
    }

    const data: UpdateCampaignData = {};

    if (input.name !== undefined) {
      data.name = input.name.trim();
      if (!data.name) {
        return { success: false, error: "Tên campaign là bắt buộc" };
      }
    }

    if (input.code !== undefined) {
      const newCode = input.code.trim().toUpperCase();
      if (!newCode) {
        return { success: false, error: "Mã campaign là bắt buộc" };
      }
      if (newCode !== existing.code) {
        const codeExists = await campaignRepository.existsByCode(newCode, id);
        if (codeExists) {
          return { success: false, error: "Mã campaign đã tồn tại" };
        }
      }
      data.code = newCode;
    }

    if (input.facebookPageId !== undefined) {
      if (!input.facebookPageId) {
        return { success: false, error: "Facebook Page là bắt buộc" };
      }
      const pageExists = await facebookPageRepository.findById(input.facebookPageId.toString());
      if (!pageExists) {
        return { success: false, error: "Facebook Page không tồn tại" };
      }
      data.facebookPageId = new mongoose.Types.ObjectId(input.facebookPageId);
    }

    if (input.startDate !== undefined) {
      const startDate = new Date(input.startDate);
      if (Number.isNaN(startDate.getTime())) {
        return { success: false, error: "Ngày bắt đầu không hợp lệ" };
      }
      data.startDate = startDate;
    }

    if (input.endDate !== undefined) {
      data.endDate = input.endDate ? new Date(input.endDate) : null;
    }

    if (input.objective !== undefined) data.objective = input.objective.trim();
    if (input.dailyBudget !== undefined) data.dailyBudget = Math.max(0, input.dailyBudget);
    if (input.lifetimeBudget !== undefined) data.lifetimeBudget = Math.max(0, input.lifetimeBudget);
    if (input.status !== undefined) data.status = input.status;
    if (input.marketingEmployeeId !== undefined) {
      data.marketingEmployeeId = input.marketingEmployeeId ? new mongoose.Types.ObjectId(input.marketingEmployeeId) : null;
    }
    if (input.note !== undefined) data.note = input.note.trim();
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const updated = await campaignRepository.update(id, data);
    if (!updated) {
      return { success: false, error: "Không thể cập nhật campaign" };
    }
    return { success: true, data: updated };
  }

  /**
   * Soft delete a Campaign.
   *
   * Business rules:
   *   - Chỉ set isActive = false.
   */
  async delete(id: string): Promise<CampaignResult<boolean>> {
    const existing = await campaignRepository.findById(id);
    if (!existing) {
      return { success: false, error: "Campaign không tồn tại" };
    }

    const ok = await campaignRepository.softDelete(id);
    if (!ok) {
      return { success: false, error: "Không thể xóa campaign" };
    }
    return { success: true, data: true };
  }
}

// ============================================================================
// Singleton
// ============================================================================

export const campaignService = new CampaignService();

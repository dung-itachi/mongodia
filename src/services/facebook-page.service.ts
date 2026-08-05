/**
 * ==================================================
 * FACEBOOK PAGE SERVICE
 * ==================================================
 *
 * Sprint 7.4 — Facebook Page & Campaign Management
 *
 * Clean Architecture: Service layer cho FacebookPage.
 * Chứa business logic - được gọi bởi API Routes.
 *
 * Business rules:
 *   1. Code là duy nhất - không trùng.
 *   2. Khi soft delete, chỉ set isActive = false.
 */

import mongoose from "mongoose";
import { facebookPageRepository, type CreateFacebookPageData, type UpdateFacebookPageData, type FacebookPageFilter } from "@/repositories/facebook-page.repository";

// ============================================================================
// Result helpers
// ============================================================================

export interface FacebookPageOk<T> {
  success: true;
  data: T;
}

export interface FacebookPageErr {
  success: false;
  error: string;
}

export type FacebookPageResult<T> = FacebookPageOk<T> | FacebookPageErr;

// ============================================================================
// Service
// ============================================================================

export class FacebookPageService {
  /**
   * Create a new Facebook Page.
   *
   * Business rules:
   *   - Code là duy nhất.
   */
  async create(
    input: CreateFacebookPageData
  ): Promise<FacebookPageResult<unknown>> {
    // Validate required fields
    if (!input.code?.trim()) {
      return { success: false, error: "Mã page là bắt buộc" };
    }
    if (!input.name?.trim()) {
      return { success: false, error: "Tên page là bắt buộc" };
    }

    // Check duplicate code
    const codeExists = await facebookPageRepository.existsByCode(input.code.trim());
    if (codeExists) {
      return { success: false, error: "Mã page đã tồn tại" };
    }

    const data: CreateFacebookPageData = {
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      pageUrl: input.pageUrl?.trim() ?? "",
      facebookPageId: input.facebookPageId?.trim() ?? "",
      description: input.description?.trim() ?? "",
      businessManager: input.businessManager?.trim() ?? "",
      currency: input.currency?.trim() ?? "VND",
      timezone: input.timezone?.trim() ?? "Asia/Ho_Chi_Minh",
      status: input.status ?? "ACTIVE",
      note: input.note?.trim() ?? "",
    };

    const page = await facebookPageRepository.create(data);
    return { success: true, data: page };
  }

  /**
   * Get a Facebook Page by ID.
   */
  async getById(id: string): Promise<FacebookPageResult<unknown>> {
    const page = await facebookPageRepository.findById(id);
    if (!page) {
      return { success: false, error: "Page không tồn tại" };
    }
    return { success: true, data: page };
  }

  /**
   * Get list of Facebook Pages with pagination & filters.
   */
  async getList(filter: FacebookPageFilter) {
    return facebookPageRepository.findAll(filter);
  }

  /**
   * Update a Facebook Page.
   *
   * Business rules:
   *   - Code không thể thay đổi nếu đã có Expense liên quan.
   *   - Khi update, validate code uniqueness nếu thay đổi.
   */
  async update(
    id: string,
    input: UpdateFacebookPageData
  ): Promise<FacebookPageResult<unknown>> {
    // Check existing
    const existing = await facebookPageRepository.findById(id);
    if (!existing) {
      return { success: false, error: "Page không tồn tại" };
    }

    const data: UpdateFacebookPageData = {};

    if (input.name !== undefined) {
      data.name = input.name.trim();
      if (!data.name) {
        return { success: false, error: "Tên page là bắt buộc" };
      }
    }

    if (input.code !== undefined) {
      const newCode = input.code.trim().toUpperCase();
      if (!newCode) {
        return { success: false, error: "Mã page là bắt buộc" };
      }
      if (newCode !== existing.code) {
        const codeExists = await facebookPageRepository.existsByCode(newCode, id);
        if (codeExists) {
          return { success: false, error: "Mã page đã tồn tại" };
        }
      }
      data.code = newCode;
    }

    if (input.pageUrl !== undefined) data.pageUrl = input.pageUrl.trim();
    if (input.facebookPageId !== undefined) data.facebookPageId = input.facebookPageId.trim();
    if (input.description !== undefined) data.description = input.description.trim();
    if (input.businessManager !== undefined) data.businessManager = input.businessManager.trim();
    if (input.currency !== undefined) data.currency = input.currency.trim();
    if (input.timezone !== undefined) data.timezone = input.timezone.trim();
    if (input.status !== undefined) data.status = input.status;
    if (input.note !== undefined) data.note = input.note.trim();
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const updated = await facebookPageRepository.update(id, data);
    if (!updated) {
      return { success: false, error: "Không thể cập nhật page" };
    }
    return { success: true, data: updated };
  }

  /**
   * Soft delete a Facebook Page.
   *
   * Business rules:
   *   - Chỉ set isActive = false.
   */
  async delete(id: string): Promise<FacebookPageResult<boolean>> {
    const existing = await facebookPageRepository.findById(id);
    if (!existing) {
      return { success: false, error: "Page không tồn tại" };
    }

    const ok = await facebookPageRepository.softDelete(id);
    if (!ok) {
      return { success: false, error: "Không thể xóa page" };
    }
    return { success: true, data: true };
  }
}

// ============================================================================
// Singleton
// ============================================================================

export const facebookPageService = new FacebookPageService();

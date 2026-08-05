/**
 * ==================================================
 * CUSTOMER ACTIVITY SERVICE
 * ==================================================
 *
 * Sprint 8.1 — Customer Timeline & CRM Activities
 *
 * Business logic for customer activities and follow-ups.
 */

import mongoose from "mongoose";
import { customerActivityRepository } from "@/repositories/customer-activity.repository";
import type {
  CreateCustomerActivityInput,
  UpdateCustomerActivityInput,
  FollowUpStats,
} from "@/types/customer-activity";

// ============================================================================
// Result helpers
// ============================================================================

export interface ActivityOk<T> {
  success: true;
  data: T;
}

export interface ActivityErr {
  success: false;
  error: string;
}

export type ActivityResult<T> = ActivityOk<T> | ActivityErr;

// ============================================================================
// Service
// ============================================================================

export class CustomerActivityService {
  /**
   * Create a new activity.
   */
  async create(input: CreateCustomerActivityInput): Promise<ActivityResult<unknown>> {
    try {
      const data = {
        customerId: new mongoose.Types.ObjectId(input.customerId),
        employeeId: new mongoose.Types.ObjectId(input.employeeId),
        activityType: input.activityType,
        title: input.title.trim(),
        content: input.content?.trim() || undefined,
        nextFollowUpAt: input.nextFollowUpAt
          ? new Date(input.nextFollowUpAt)
          : undefined,
        result: input.result,
      };

      const activity = await customerActivityRepository.create(data);
      return { success: true, data: activity };
    } catch (error) {
      console.error("CustomerActivityService.create error:", error);
      return { success: false, error: "Không thể tạo hoạt động" };
    }
  }

  /**
   * Update an activity.
   */
  async update(
    id: string,
    input: UpdateCustomerActivityInput
  ): Promise<ActivityResult<unknown>> {
    try {
      const existing = await customerActivityRepository.findById(id);
      if (!existing) {
        return { success: false, error: "Hoạt động không tồn tại" };
      }

      const data = {
        activityType: input.activityType,
        title: input.title?.trim(),
        content: input.content?.trim(),
        nextFollowUpAt:
          input.nextFollowUpAt !== undefined
            ? input.nextFollowUpAt
              ? new Date(input.nextFollowUpAt)
              : null
            : undefined,
        result: input.result,
      };

      const updated = await customerActivityRepository.update(id, data);
      if (!updated) {
        return { success: false, error: "Không thể cập nhật hoạt động" };
      }
      return { success: true, data: updated };
    } catch (error) {
      console.error("CustomerActivityService.update error:", error);
      return { success: false, error: "Không thể cập nhật hoạt động" };
    }
  }

  /**
   * Delete an activity.
   */
  async delete(id: string): Promise<ActivityResult<boolean>> {
    try {
      const existing = await customerActivityRepository.findById(id);
      if (!existing) {
        return { success: false, error: "Hoạt động không tồn tại" };
      }

      const ok = await customerActivityRepository.delete(id);
      if (!ok) {
        return { success: false, error: "Không thể xóa hoạt động" };
      }
      return { success: true, data: true };
    } catch (error) {
      console.error("CustomerActivityService.delete error:", error);
      return { success: false, error: "Không thể xóa hoạt động" };
    }
  }

  /**
   * Get activity by ID with populated refs.
   */
  async getById(id: string) {
    return customerActivityRepository.findByIdWithPopulate(id);
  }

  /**
   * Get activities for a customer (timeline).
   */
  async getByCustomer(
    customerId: string,
    filter: Parameters<typeof customerActivityRepository.findByCustomer>[1]
  ) {
    return customerActivityRepository.findByCustomer(customerId, filter);
  }

  /**
   * Get activities for an employee.
   */
  async getByEmployee(
    employeeId: string,
    filter: Parameters<typeof customerActivityRepository.findByEmployee>[1]
  ) {
    return customerActivityRepository.findByEmployee(employeeId, filter);
  }

  /**
   * Get today's follow-ups for an employee.
   */
  async getTodayFollowUps(employeeId: string) {
    return customerActivityRepository.findToday(employeeId);
  }

  /**
   * Get upcoming follow-ups for an employee.
   */
  async getUpcomingFollowUps(employeeId: string) {
    return customerActivityRepository.findUpcoming(employeeId);
  }

  /**
   * Get missed follow-ups for an employee.
   */
  async getMissedFollowUps(employeeId: string) {
    return customerActivityRepository.findMissed(employeeId);
  }

  /**
   * Get follow-up statistics for dashboard.
   */
  async getFollowUpStats(employeeId: string): Promise<FollowUpStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayData = await customerActivityRepository.findToday(employeeId);
    const upcomingData = await customerActivityRepository.findUpcoming(employeeId);
    const missedData = await customerActivityRepository.findMissed(employeeId);

    const todayCompleted = todayData.items.filter((a) => a.result === "SUCCESS").length;

    return {
      todayTotal: todayData.total,
      todayCompleted,
      todayPending: todayData.total - todayCompleted,
      upcomingTotal: upcomingData.total,
      upcomingCount: upcomingData.total,
      missedTotal: missedData.total,
      missedCount: missedData.total,
    };
  }
}

export const customerActivityService = new CustomerActivityService();

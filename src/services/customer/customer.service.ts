/**
 * ==================================================
 * CUSTOMER SERVICE
 * ==================================================
 *
 * Sprint 8.0 — Customer Module Foundation
 *
 * Clean Architecture: Service layer cho Customer.
 * Chứa business logic - được gọi bởi API Routes.
 */

import mongoose from "mongoose";
import { customerRepository } from "@/repositories/customer.repository";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerStatistics,
} from "@/types/customer";
import { Order } from "@/models/Order";
import Counter from "@/models/Counter";

// ============================================================================
// Legacy API exports (for Lead Import compatibility)
// ============================================================================

export interface CreateCustomerInputLegacy {
  name: string;
  phone: string;
  areaId: string | mongoose.Types.ObjectId;
  teamId: string | mongoose.Types.ObjectId;
  marketingEmployeeId: string | mongoose.Types.ObjectId;
  email?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  birthday?: Date | null;
  address?: string;
  note?: string;
}

export interface CreateCustomerOptions {
  session?: mongoose.ClientSession;
  codeOverride?: string;
}

async function nextCustomerCode(session?: mongoose.ClientSession): Promise<string> {
  const COUNTER_KEY = "CUSTOMER";
  const updated = await Counter.findOneAndUpdate(
    { key: COUNTER_KEY },
    { $inc: { value: 1 } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  ).session(session ?? null).exec();
  const value = (updated as { seq?: number })?.seq ?? 1;
  return `KH${String(value).padStart(6, "0")}`;
}

export async function createCustomer(
  input: CreateCustomerInputLegacy,
  options: CreateCustomerOptions = {}
) {
  const code = options.codeOverride ?? await nextCustomerCode(options.session);

  const docInput: Record<string, unknown> = {
    customerCode: code,
    fullName: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email ?? "",
    gender: input.gender?.toLowerCase() ?? "other",
    birthday: input.birthday ?? undefined,
    address: input.address ?? "",
    note: input.note ?? "",
    marketingEmployeeId: input.marketingEmployeeId,
    isActive: true,
  };

  const Customer = (await import("@/models/Customer")).default;
  const [doc] = await Customer.create([docInput], {
    session: options.session ?? undefined,
  });

  return doc;
}

// ============================================================================
// Result helpers
// ============================================================================

export interface CustomerOk<T> {
  success: true;
  data: T;
}

export interface CustomerErr {
  success: false;
  error: string;
}

export type CustomerResult<T> = CustomerOk<T> | CustomerErr;

// ============================================================================
// Service
// ============================================================================

export class CustomerService {
  /**
   * Create a new customer.
   *
   * Business rules:
   *   - Duplicate phone → error
   *   - Duplicate email → warning (không block)
   *   - Auto-generate customerCode
   */
  async create(
    input: CreateCustomerInput
  ): Promise<CustomerResult<unknown>> {
    const phone = input.phone.trim();
    const email = input.email?.trim();

    // Check duplicate phone
    const existingPhone = await customerRepository.existsByPhone(phone);
    if (existingPhone) {
      return {
        success: false,
        error: "Số điện thoại đã tồn tại",
      };
    }

    // Check duplicate email (if provided)
    if (email) {
      const existingEmail = await customerRepository.existsByEmail(email);
      if (existingEmail) {
        // Warning nhưng không block
        console.warn(`Customer email ${email} already exists`);
      }
    }

    // Generate customer code
    const customerCode = await customerRepository.generateCustomerCode();

    const data = {
      customerCode,
      fullName: input.fullName.trim(),
      phone,
      email: email || undefined,
      gender: input.gender,
      birthday: input.birthday ? new Date(input.birthday) : undefined,
      address: input.address,
      facebook: input.facebook?.trim(),
      zalo: input.zalo?.trim(),
      note: input.note?.trim() || "",
      marketingEmployeeId: input.marketingEmployeeId
        ? new mongoose.Types.ObjectId(input.marketingEmployeeId)
        : undefined,
      saleEmployeeId: input.saleEmployeeId
        ? new mongoose.Types.ObjectId(input.saleEmployeeId)
        : undefined,
      facebookPageId: input.facebookPageId
        ? new mongoose.Types.ObjectId(input.facebookPageId)
        : undefined,
      campaignId: input.campaignId
        ? new mongoose.Types.ObjectId(input.campaignId)
        : undefined,
      leadId: input.leadId
        ? new mongoose.Types.ObjectId(input.leadId)
        : undefined,
      createdBy: new mongoose.Types.ObjectId(input.createdBy),
    };

    const customer = await customerRepository.create(data);
    return { success: true, data: customer };
  }

  /**
   * Update an existing customer.
   *
   * Business rules:
   *   - Duplicate phone → error (exclude current)
   *   - Duplicate email → warning (không block)
   */
  async update(
    id: string,
    input: UpdateCustomerInput
  ): Promise<CustomerResult<unknown>> {
    const existing = await customerRepository.findById(id);
    if (!existing) {
      return { success: false, error: "Khách hàng không tồn tại" };
    }

    const phone = input.phone?.trim();
    const email = input.email?.trim();

    // Check duplicate phone
    if (phone && phone !== existing.phone) {
      const existingPhone = await customerRepository.existsByPhone(phone, id);
      if (existingPhone) {
        return {
          success: false,
          error: "Số điện thoại đã tồn tại",
        };
      }
    }

    // Check duplicate email
    if (email && email !== existing.email) {
      const existingEmail = await customerRepository.existsByEmail(email, id);
      if (existingEmail) {
        console.warn(`Customer email ${email} already exists`);
      }
    }

    const data: Record<string, unknown> = {};

    if (input.fullName !== undefined) data.fullName = input.fullName.trim();
    if (input.phone !== undefined) data.phone = phone;
    if (input.email !== undefined) data.email = email || undefined;
    if (input.gender !== undefined) data.gender = input.gender;
    if (input.birthday !== undefined) {
      data.birthday = input.birthday ? new Date(input.birthday) : undefined;
    }
    if (input.address !== undefined) data.address = input.address;
    if (input.facebook !== undefined) data.facebook = input.facebook?.trim();
    if (input.zalo !== undefined) data.zalo = input.zalo?.trim();
    if (input.note !== undefined) data.note = input.note?.trim() || "";
    if (input.saleEmployeeId !== undefined) {
      data.saleEmployeeId = input.saleEmployeeId
        ? new mongoose.Types.ObjectId(input.saleEmployeeId)
        : null;
    }
    if (input.status !== undefined) data.status = input.status;

    const updated = await customerRepository.update(id, data);
    if (!updated) {
      return { success: false, error: "Không thể cập nhật khách hàng" };
    }
    return { success: true, data: updated };
  }

  /**
   * Soft delete a customer.
   */
  async delete(id: string): Promise<CustomerResult<boolean>> {
    const existing = await customerRepository.findById(id);
    if (!existing) {
      return { success: false, error: "Khách hàng không tồn tại" };
    }

    const ok = await customerRepository.softDelete(id);
    if (!ok) {
      return { success: false, error: "Không thể xóa khách hàng" };
    }
    return { success: true, data: true };
  }

  /**
   * Get customer by ID with populated refs.
   */
  async getById(id: string) {
    return customerRepository.findByIdWithPopulate(id);
  }

  /**
   * Get list of customers with pagination & filters.
   */
  async getList(filter: Parameters<typeof customerRepository.findAll>[0]) {
    return customerRepository.findAll(filter);
  }

  /**
   * Get customer statistics (orders, revenue).
   */
  async getStatistics(customerId: string): Promise<CustomerStatistics> {
    const orders = await Order.find({
      customerId: new mongoose.Types.ObjectId(customerId),
      isActive: { $ne: false },
    }).select("totalAmount createdAt").lean();

    if (orders.length === 0) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        lastOrderDate: undefined,
        firstOrderDate: undefined,
      };
    }

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum, o) => sum + ((o as { totalAmount?: number }).totalAmount ?? 0),
      0
    );
    const averageOrderValue = totalRevenue / totalOrders;

    const sortedOrders = orders.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      lastOrderDate: sortedOrders[0]?.createdAt.toISOString(),
      firstOrderDate: sortedOrders[sortedOrders.length - 1]?.createdAt.toISOString(),
    };
  }
}

export const customerService = new CustomerService();

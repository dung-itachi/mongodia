/**
 * Order Service (Sprint 5.7 — Lead Convert)
 *
 * Clean Architecture: Service layer cho Order.
 * Chứa business logic - được gọi bởi LeadService (convert flow).
 *
 * Business Logic responsibilities:
 *   - generateOrderCode() — biết format code (ODyymmddxxxx)
 *   - createFromLead() — biết cách map Lead → Order
 *   - createCustomerFromLead() — auto-create Customer nếu chưa có
 */

import mongoose from "mongoose";
import Counter from "@/models/Counter";
import Setting from "@/models/Setting";
import Area from "@/models/Area";
import Team from "@/models/Team";
import { orderRepository } from "@/repositories/order.repository";
import { Order, type IOrder } from "@/models/Order";
import { OrderSource } from "@/constants/orderStatus";
import Employee, { IEmployee } from "@/models/Employee";
import Customer, { ICustomer } from "@/models/Customer";

export interface CreateFromLeadData {
  leadId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  productId?: string;
  comboId?: string;
  productSnapshot?: { code: string; name: string };
  comboSnapshot?: { code: string; name: string };
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: "VND" | "MNT" | "USD";
  estimatedWeight?: number;
  marketingEmployeeId?: string;
  saleEmployeeId?: string;
  note?: string;
}

export interface CreateCustomerFromLeadData {
  customerName: string;
  phone: string;
  email?: string;
  address?: string;
  marketingEmployeeId?: string;
}

export class OrderService {
  /**
   * Generate unique order code (Business Logic)
   */
  async generateOrderCode(session?: mongoose.ClientSession): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    const counter = await Counter.findByIdAndUpdate(
      `order_${year}${month}${day}`,
      { $inc: { seq: 1 } },
      { new: true, upsert: true, session }
    ) as unknown as { seq: number };

    const sequence = (counter.seq || 1).toString().padStart(4, "0");
    return `OD${year}${month}${day}${sequence}`;
  }

  /**
   * Auto-create Customer from Lead if not exists
   *
   * CRM Flow:
   *   Lead → Convert → Nếu chưa có Customer → Tạo Customer → Tạo Order
   *
   * Priority:
   *   1. Lấy areaId/teamId từ marketingEmployee nếu có
   *   2. Fallback: lấy từ Settings (LEAD_IMPORT_DEFAULT_AREA/TEAM/MARKETING_CODE)
   *
   * Nếu không có cả hai → throw error.
   */
  async createCustomerFromLead(
    data: CreateCustomerFromLeadData,
    session?: mongoose.ClientSession
  ): Promise<ICustomer & { _id: mongoose.Types.ObjectId }> {
    // Try to get from marketing employee first
    let areaId: mongoose.Types.ObjectId | undefined;
    let teamId: mongoose.Types.ObjectId | undefined;
    let mkEmployeeId: mongoose.Types.ObjectId | undefined;

    if (data.marketingEmployeeId) {
      const employee = await Employee.findById(data.marketingEmployeeId)
        .select("_id areaId teamId")
        .lean();

      if (employee) {
        areaId = (employee as unknown as { areaId?: mongoose.Types.ObjectId }).areaId;
        teamId = (employee as unknown as { teamId?: mongoose.Types.ObjectId }).teamId;
        mkEmployeeId = (employee as unknown as { _id: mongoose.Types.ObjectId })._id;
      }
    }

    // Fallback: read from Settings
    if (!areaId || !teamId) {
      const settings = await Setting.find({ key: { $in: ["DEFAULT_AREA_CODE", "DEFAULT_TEAM_CODE"] } })
        .select("key value")
        .lean();

      const settingsMap: Record<string, string> = {};
      for (const s of settings as Array<{ key: string; value: string }>) {
        settingsMap[s.key] = s.value;
      }

      const [area, team] = await Promise.all([
        areaId ? Promise.resolve(null) : Area.findOne({ code: settingsMap["DEFAULT_AREA_CODE"] }).select("_id").lean(),
        teamId ? Promise.resolve(null) : Team.findOne({ code: settingsMap["DEFAULT_TEAM_CODE"] }).select("_id").lean(),
      ]);

      if (area && !areaId) areaId = (area as unknown as { _id: mongoose.Types.ObjectId })._id;
      if (team && !teamId) teamId = (team as unknown as { _id: mongoose.Types.ObjectId })._id;
    }

    if (!areaId || !teamId) {
      throw new Error(
        "Không thể tạo Customer: không tìm thấy areaId hoặc teamId. " +
          "Vui lòng đảm bảo Lead có Marketing hoặc cấu hình DEFAULT_AREA_CODE / DEFAULT_TEAM_CODE."
      );
    }

    const COUNTER_KEY = "CUSTOMER";
    const counter = await Counter.findOneAndUpdate(
      { key: COUNTER_KEY },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    ).session(session ?? null);

    const seq = (counter as unknown as { seq?: number }).seq ?? 1;
    const customerCode = `KH${String(seq).padStart(6, "0")}`;

    const customer = new Customer({
      code: customerCode,
      name: data.customerName.trim(),
      phone: (data.phone ?? "").trim(),
      email: data.email ?? "",
      areaId,
      teamId,
      marketingEmployeeId: mkEmployeeId ?? new mongoose.Types.ObjectId(),
      gender: "OTHER",
      birthday: null,
      address: data.address ?? "",
      note: "",
      isActive: true,
    });

    return customer.save({ session }) as Promise<ICustomer & { _id: mongoose.Types.ObjectId }>;
  }

  /**
   * Create order from lead (Sprint 5.7)
   */
  async createFromLead(
    data: CreateFromLeadData,
    session?: mongoose.ClientSession
  ): Promise<IOrder> {
    const orderCode = await this.generateOrderCode(session);

    return orderRepository.create(
      {
        orderCode,
        customerId: new mongoose.Types.ObjectId(data.customerId),
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        leadId: new mongoose.Types.ObjectId(data.leadId),
        productId: data.productId
          ? new mongoose.Types.ObjectId(data.productId)
          : undefined,
        comboId: data.comboId
          ? new mongoose.Types.ObjectId(data.comboId)
          : undefined,
        productSnapshot: data.productSnapshot,
        comboSnapshot: data.comboSnapshot,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalAmount: data.totalAmount,
        currency: data.currency,
        estimatedWeight: data.estimatedWeight,
        marketingEmployeeId: data.marketingEmployeeId
          ? new mongoose.Types.ObjectId(data.marketingEmployeeId)
          : undefined,
        saleEmployeeId: data.saleEmployeeId
          ? new mongoose.Types.ObjectId(data.saleEmployeeId)
          : undefined,
        orderSource: OrderSource.MANUAL,
        note: data.note,
      },
      session
    );
  }
}

// Singleton instance
export const orderService = new OrderService();

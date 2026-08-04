/**
 * Order Repository (Sprint 5.7 — Lead Convert)
 *
 * Clean Architecture: Repository layer cho Order.
 * Chỉ làm việc với MongoDB - không có business logic.
 * KHÔNG biết Counter, KHÔNG generate code.
 */

import mongoose from "mongoose";
import { Order, type IOrder } from "@/models/Order";
import type { Types } from "mongoose";

export interface CreateOrderData {
  orderCode: string;
  customerId: Types.ObjectId;
  customerName: string;
  customerPhone?: string;
  leadId?: Types.ObjectId;
  productId?: Types.ObjectId;
  comboId?: Types.ObjectId;
  productSnapshot?: { code: string; name: string };
  comboSnapshot?: { code: string; name: string };
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: "VND" | "MNT" | "USD";
  estimatedWeight?: number;
  marketingEmployeeId?: Types.ObjectId;
  saleEmployeeId?: Types.ObjectId;
  orderSource: string;
  note?: string;
}

export class OrderRepository {
  /**
   * Create a new order (no transaction here - transaction managed by caller)
   */
  async create(data: CreateOrderData, session?: mongoose.ClientSession): Promise<IOrder> {
    const order = new Order({
      ...data,
      status: "PENDING",
      isPrepaid: false,
      orderType: "NORMAL",
      payments: [],
      totalPaid: 0,
      revenueLocked: false,
      revenueEligible: false,
      revenueLockReason: "NONE",
      marketingRevenueRaw: 0,
      marketingRevenueFinal: 0,
      saleRevenueRaw: 0,
      saleRevenueFinal: 0,
      isActive: true,
    });

    return order.save({ session });
  }

  /**
   * Find order by ID
   */
  async findById(id: string): Promise<IOrder | null> {
    return Order.findById(id).lean();
  }
}

// Singleton instance
export const orderRepository = new OrderRepository();

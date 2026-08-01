/**
 * ==================================================
 * ORDER HISTORY MODEL
 * ==================================================
 *
 * Audit log for every meaningful state change on an Order.
 * Each mutation (status change, payment, shipping, revenue lock...)
 * creates one OrderHistory entry so the full timeline is replayable.
 *
 * This model intentionally mirrors the shape of LeadHistory — same
 * (leadId → orderId, action, oldValue, newValue, note) pattern —
 * but is fully independent and lives in its own collection.
 */

import mongoose, { Schema, type Document } from "mongoose";

export { OrderAction } from "../constants/orderStatus";
import { OrderAction } from "../constants/orderStatus";

export interface IOrderHistory extends Document {
  orderId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  action: OrderAction;
  /**
   * Tên field bị thay đổi (vd: "warehouseId", "status", "payments").
   * Dùng cho UI Timeline hiển thị "Đã đổi <fieldName>".
   */
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
  createdAt: Date;
}

const OrderHistorySchema = new Schema<IOrderHistory>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: Object.values(OrderAction),
    },
    fieldName: { type: String, index: true },
    oldValue: { type: String },
    newValue: { type: String },
    note: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

OrderHistorySchema.index({ orderId: 1, createdAt: -1 });
OrderHistorySchema.index({ employeeId: 1 });

export const OrderHistory =
  mongoose.models.OrderHistory ||
  mongoose.model<IOrderHistory>("OrderHistory", OrderHistorySchema);

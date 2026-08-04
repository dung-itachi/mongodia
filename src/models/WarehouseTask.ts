/**
 * ==================================================
 * WAREHOUSE TASK MODEL
 * ==================================================
 *
 * Sprint 6.3 — Warehouse Integration
 *
 * Represents a warehouse task created from an Order.
 * Each Order in PACKING status creates one WarehouseTask.
 *
 * Workflow:
 *   WAITING_PICK → PICKING → PACKED → READY_TO_SHIP → SHIPPED
 */

import mongoose, { Schema, type Document } from "mongoose";
import { WarehouseStatus } from "@/constants/warehouseStatus";

export interface IWarehouseTask extends Document {
  orderId: mongoose.Types.ObjectId;
  warehouseStatus: WarehouseStatus;
  assignedEmployeeId?: mongoose.Types.ObjectId;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseTaskSchema = new Schema<IWarehouseTask>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true, // One task per order
      index: true,
    },
    warehouseStatus: {
      type: String,
      required: true,
      enum: Object.values(WarehouseStatus),
      default: WarehouseStatus.WAITING_PICK,
    },
    assignedEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    note: { type: String },
  },
  {
    timestamps: true,
  }
);

WarehouseTaskSchema.index({ warehouseStatus: 1 });
WarehouseTaskSchema.index({ assignedEmployeeId: 1 });
WarehouseTaskSchema.index({ createdAt: -1 });

export const WarehouseTask =
  mongoose.models.WarehouseTask ||
  mongoose.model<IWarehouseTask>("WarehouseTask", WarehouseTaskSchema);

/**
 * ==================================================
 * WAREHOUSE HISTORY MODEL
 * ==================================================
 *
 * Sprint 6.3 — Warehouse Integration
 *
 * Audit log for every meaningful state change on a WarehouseTask.
 * Mirrors the OrderHistory pattern for consistency.
 */

import mongoose, { Schema, type Document } from "mongoose";

export { WarehouseAction } from "../constants/warehouseStatus";
import { WarehouseAction } from "../constants/warehouseStatus";

export interface IWarehouseHistory extends Document {
  warehouseTaskId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  action: WarehouseAction;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
  createdAt: Date;
}

const WarehouseHistorySchema = new Schema<IWarehouseHistory>(
  {
    warehouseTaskId: {
      type: Schema.Types.ObjectId,
      ref: "WarehouseTask",
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
      enum: Object.values(WarehouseAction),
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

WarehouseHistorySchema.index({ warehouseTaskId: 1, createdAt: -1 });
WarehouseHistorySchema.index({ employeeId: 1 });

export const WarehouseHistory =
  mongoose.models.WarehouseHistory ||
  mongoose.model<IWarehouseHistory>("WarehouseHistory", WarehouseHistorySchema);

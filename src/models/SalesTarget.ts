/**
 * ==================================================
 * SALES TARGET MODEL
 * ==================================================
 *
 * Sprint 8.3 — Sales KPI & Target
 *
 * Model for sales targets and KPI tracking.
 */

import mongoose, { Schema, type Document } from "mongoose";

// ============================================================================
// Interface
// ============================================================================

export interface ISalesTarget extends Document {
  employeeId: mongoose.Types.ObjectId;
  month: number;
  year: number;

  targetRevenue: number;
  targetOrders: number;
  targetCustomers: number;
  targetClosedLead: number;

  note?: string;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Schema
// ============================================================================

const SalesTargetSchema = new Schema<ISalesTarget>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2020,
    },

    targetRevenue: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    targetOrders: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    targetCustomers: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    targetClosedLead: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================================
// Indexes
// ============================================================================

SalesTargetSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
SalesTargetSchema.index({ year: 1, month: 1 });

// ============================================================================
// Model
// ============================================================================

export const SalesTarget =
  (mongoose.models.SalesTarget as mongoose.Model<ISalesTarget>) ||
  mongoose.model<ISalesTarget>("SalesTarget", SalesTargetSchema);

export default SalesTarget;

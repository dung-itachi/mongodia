/**
 * ==================================================
 * CUSTOMER ACTIVITY MODEL
 * ==================================================
 *
 * Sprint 8.1 — Customer Timeline & CRM Activities
 *
 * Model for tracking customer interactions and follow-ups.
 */

import mongoose, { Schema, type Document } from "mongoose";
import { ActivityType, ActivityResult } from "@/types/customer-activity";

// Re-export for backwards compatibility
export { ActivityType, ActivityResult } from "@/types/customer-activity";

// ============================================================================
// Interface
// ============================================================================

export interface ICustomerActivity extends Document {
  customerId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;

  activityType: ActivityType;
  title: string;
  content?: string;

  nextFollowUpAt?: Date;
  result?: ActivityResult;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Schema
// ============================================================================

const CustomerActivitySchema = new Schema<ICustomerActivity>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    activityType: {
      type: String,
      enum: Object.values(ActivityType),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    content: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    nextFollowUpAt: {
      type: Date,
      index: true,
    },
    result: {
      type: String,
      enum: Object.values(ActivityResult),
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================================
// Indexes
// ============================================================================

CustomerActivitySchema.index({ customerId: 1, createdAt: -1 });
CustomerActivitySchema.index({ employeeId: 1, createdAt: -1 });
CustomerActivitySchema.index({ nextFollowUpAt: 1 });

// ============================================================================
// Model
// ============================================================================

export const CustomerActivity =
  (mongoose.models.CustomerActivity as mongoose.Model<ICustomerActivity>) ||
  mongoose.model<ICustomerActivity>("CustomerActivity", CustomerActivitySchema);

export default CustomerActivity;

/**
 * ==================================================
 * CAMPAIGN MODEL
 * ==================================================
 *
 * Sprint 7.4 — Facebook Page & Campaign Management
 *
 * Model for Marketing Campaigns.
 * Each Campaign belongs to a Facebook Page.
 */

import mongoose, { Schema, type Model } from "mongoose";

export type CampaignStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";

export interface ICampaign extends mongoose.Document {
  code: string;
  name: string;
  /** Reference to Facebook Page */
  facebookPageId: mongoose.Types.ObjectId;
  /** Campaign objective (e.g., CONVERSIONS, TRAFFIC, LEAD_GENERATION) */
  objective?: string;
  /** Campaign start date */
  startDate: Date;
  /** Campaign end date (optional) */
  endDate?: Date;
  /** Daily budget */
  dailyBudget?: number;
  /** Lifetime budget */
  lifetimeBudget?: number;
  /** Campaign status */
  status: CampaignStatus;
  /** Reference to Marketing Employee */
  marketingEmployeeId?: mongoose.Types.ObjectId;
  /** Additional notes */
  note?: string;
  isActive: boolean;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    facebookPageId: {
      type: Schema.Types.ObjectId,
      ref: "FacebookPage",
      required: true,
      index: true,
    },
    objective: {
      type: String,
      default: "",
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    dailyBudget: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetimeBudget: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"],
      default: "ACTIVE",
    },
    marketingEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// Sprint 8.x: Removed duplicate index on `code` — already declared via `unique: true` on field.
// Mongoose warning: "Duplicate schema index on {\"code\":1} for model \"Campaign\"".
CampaignSchema.index({ facebookPageId: 1, status: 1 });
CampaignSchema.index({ marketingEmployeeId: 1 });
CampaignSchema.index({ startDate: 1 });
CampaignSchema.index({ status: 1 });
CampaignSchema.index({ isActive: 1 });

export const Campaign =
  (mongoose.models.Campaign as Model<ICampaign>) ||
  mongoose.model<ICampaign>("Campaign", CampaignSchema);

export default Campaign;

/**
 * ==================================================
 * FACEBOOK PAGE MODEL
 * ==================================================
 *
 * Sprint 7.4 — Facebook Page & Campaign Management
 *
 * Model for Facebook Pages managed by Marketing team.
 */

import mongoose, { Schema, type Model } from "mongoose";

export type FacebookPageStatus = "ACTIVE" | "INACTIVE";

export interface IFacebookPage extends mongoose.Document {
  code: string;
  name: string;
  pageUrl: string;
  facebookPageId: string;
  description: string;
  /** Business Manager ID */
  businessManager?: string;
  /** Currency (e.g., VND, USD) */
  currency?: string;
  /** Timezone (e.g., Asia/Ho_Chi_Minh) */
  timezone?: string;
  /** Page status */
  status: FacebookPageStatus;
  /** Additional notes */
  note?: string;
  isActive: boolean;
}

const FacebookPageSchema = new Schema<IFacebookPage>(
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
    pageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    facebookPageId: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    businessManager: {
      type: String,
      default: "",
      trim: true,
    },
    currency: {
      type: String,
      default: "VND",
      trim: true,
    },
    timezone: {
      type: String,
      default: "Asia/Ho_Chi_Minh",
      trim: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
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
FacebookPageSchema.index({ code: 1 }, { unique: true });
FacebookPageSchema.index({ name: 1 });
FacebookPageSchema.index({ status: 1 });
FacebookPageSchema.index({ isActive: 1 });

export const FacebookPage =
  (mongoose.models.FacebookPage as Model<IFacebookPage>) ||
  mongoose.model<IFacebookPage>("FacebookPage", FacebookPageSchema);

export default FacebookPage;

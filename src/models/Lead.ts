import mongoose, { Schema, type Document } from "mongoose";
import { LeadStatus } from "../constants/leadStatus";

export const SOURCE_TYPES = [
  "LANDING_PAGE",
  "FACEBOOK_COMMENT",
  "FACEBOOK_INBOX",
  "TIKTOK",
  "ZALO",
  "OTHER",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  LANDING_PAGE: "Landing Page",
  FACEBOOK_COMMENT: "Facebook Comment",
  FACEBOOK_INBOX: "Facebook Inbox",
  TIKTOK: "TikTok",
  ZALO: "Zalo",
  OTHER: "Khác",
};

export const ASSIGNMENT_TYPES = ["AUTO", "MANUAL"] as const;
export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

export interface ILead extends Document {
  leadCode: string;
  customerId?: mongoose.Types.ObjectId;
  customerName: string;
  customerNewName?: string;
  facebookLink?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  address?: string;
  province?: string;
  district?: string;
  ward?: string;
  sourceType: SourceType;
  facebookPageId?: mongoose.Types.ObjectId;
  facebookPageAssignmentId?: mongoose.Types.ObjectId;
  marketingEmployeeId?: mongoose.Types.ObjectId;
  saleEmployeeId?: mongoose.Types.ObjectId;
  assignmentType?: AssignmentType;
  assignedAt?: Date;
  categoryId?: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  comboId?: mongoose.Types.ObjectId;
  quantity?: number;
  unitPriceMNT?: number;
  unitPriceVND?: number;
  exchangeRate?: number;
  estimatedWeight?: number;
  status: LeadStatus;
  latestRemark?: string;
  note?: string;
  isDuplicate: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    leadCode: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String, required: true },
    customerNewName: { type: String },
    facebookLink: { type: String },
    phone: { type: String },
    phone2: { type: String },
    email: { type: String },
    address: { type: String },
    province: { type: String },
    district: { type: String },
    ward: { type: String },
    sourceType: {
      type: String,
      required: true,
      enum: SOURCE_TYPES,
    },
    facebookPageId: { type: Schema.Types.ObjectId, ref: "FacebookPage" },
    facebookPageAssignmentId: {
      type: Schema.Types.ObjectId,
      ref: "FacebookPageAssignment",
    },
    marketingEmployeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    saleEmployeeId: { type: Schema.Types.ObjectId, ref: "Employee" },
    assignmentType: {
      type: String,
      enum: ASSIGNMENT_TYPES,
    },
    assignedAt: { type: Date },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    comboId: { type: Schema.Types.ObjectId, ref: "Combo" },
    quantity: { type: Number, min: 1 },
    unitPriceMNT: { type: Number, min: 0 },
    unitPriceVND: { type: Number, min: 0 },
    exchangeRate: { type: Number, min: 0 },
    estimatedWeight: { type: Number, min: 0 },
    status: {
      type: String,
      required: true,
      enum: Object.values(LeadStatus),
      default: LeadStatus.NEW,
    },
    latestRemark: { type: String },
    note: { type: String },
    isDuplicate: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

LeadSchema.index({ phone: 1 });
LeadSchema.index({ facebookLink: 1 });
LeadSchema.index({ customerId: 1 });
LeadSchema.index({ status: 1 });
LeadSchema.index({ sourceType: 1 });
LeadSchema.index({ saleEmployeeId: 1 });
LeadSchema.index({ marketingEmployeeId: 1 });
LeadSchema.index({ assignmentType: 1 });
LeadSchema.index({ assignedAt: 1 });
LeadSchema.index({ isActive: 1 });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ categoryId: 1, productId: 1, comboId: 1 });

export const Lead =
  mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);

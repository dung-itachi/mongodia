/**
 * ==================================================
 * CUSTOMER MODEL
 * ==================================================
 *
 * Sprint 8.0 — Customer Module Foundation
 *
 * Customer là dữ liệu sinh ra sau khi Convert Lead.
 */

import mongoose, { Schema, type Document } from "mongoose";

// ============================================================================
// Sub-document interfaces
// ============================================================================

export interface IAddress {
  street?: string;
  province?: string;
  district?: string;
  ward?: string;
}

// ============================================================================
// Customer Status
// ============================================================================

export enum CustomerStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  BLOCKED = "BLOCKED",
}

// ============================================================================
// Main interface
// ============================================================================

export interface ICustomer extends Document {
  customerCode: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: "male" | "female" | "other";
  birthday?: Date;
  address?: IAddress;

  facebook?: string;
  zalo?: string;
  note?: string;

  marketingEmployeeId?: mongoose.Types.ObjectId;
  saleEmployeeId?: mongoose.Types.ObjectId;
  facebookPageId?: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId;

  status: CustomerStatus;

  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// ============================================================================
// Schema
// ============================================================================

const AddressSchema = new Schema<IAddress>(
  {
    street: { type: String, default: "" },
    province: { type: String, default: "" },
    district: { type: String, default: "" },
    ward: { type: String, default: "" },
  },
  { _id: false }
);

const CustomerSchema = new Schema<ICustomer>(
  {
    customerCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 200,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    birthday: {
      type: Date,
    },
    address: {
      type: AddressSchema,
      default: () => ({}),
    },

    facebook: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    zalo: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    note: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    marketingEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    saleEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    facebookPageId: {
      type: Schema.Types.ObjectId,
      ref: "FacebookPage",
      default: null,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      default: null,
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(CustomerStatus),
      default: CustomerStatus.ACTIVE,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
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

CustomerSchema.index({ phone: 1 }, { unique: true });
CustomerSchema.index({ email: 1 }, { sparse: true });
CustomerSchema.index({ fullName: "text", phone: "text", email: "text" });
CustomerSchema.index({ saleEmployeeId: 1 });
CustomerSchema.index({ marketingEmployeeId: 1 });
CustomerSchema.index({ facebookPageId: 1 });
CustomerSchema.index({ campaignId: 1 });
CustomerSchema.index({ leadId: 1 });
CustomerSchema.index({ status: 1, createdAt: -1 });

// ============================================================================
// Model
// ============================================================================

export const Customer =
  (mongoose.models.Customer as mongoose.Model<ICustomer>) ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);

export default Customer;

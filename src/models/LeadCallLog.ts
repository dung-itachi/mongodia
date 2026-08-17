/**
 * LeadCallLog Model (Module 6 - Nhật ký cuộc gọi)
 *
 * Model ghi nhận mỗi lần Sale gọi cho Lead.
 * Mỗi bản ghi là một cuộc gọi, không ghi đè - append only.
 */

import mongoose, { Schema, type Document } from "mongoose";
import { LeadCallStatus } from "../constants/leadCallStatus";

export interface ILeadCallLog extends Document {
  /** Reference đến Lead */
  leadId: mongoose.Types.ObjectId;
  /** Sale viên thực hiện cuộc gọi */
  saleId: mongoose.Types.ObjectId;
  /** Thời điểm thực hiện cuộc gọi */
  callTime: Date;
  /** Trạng thái cuộc gọi (kết quả) */
  status: LeadCallStatus;
  /** Ghi chú tùy chọn của Sale */
  note?: string;
  /** Thời lượng cuộc gọi (giây) - tùy chọn */
  duration?: number;
  createdAt: Date;
}

const LeadCallLogSchema = new Schema<ILeadCallLog>(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    saleId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    callTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(LeadCallStatus),
    },
    note: {
      type: String,
      maxlength: 1000,
    },
    duration: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes for efficient queries
LeadCallLogSchema.index({ leadId: 1, callTime: -1 });
LeadCallLogSchema.index({ saleId: 1, callTime: -1 });
LeadCallLogSchema.index({ status: 1 });
LeadCallLogSchema.index({ createdAt: -1 });

export const LeadCallLog =
  mongoose.models.LeadCallLog ||
  mongoose.model<ILeadCallLog>("LeadCallLog", LeadCallLogSchema);

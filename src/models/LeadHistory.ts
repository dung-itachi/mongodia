import mongoose, { Schema, type Document } from "mongoose";
import { LeadAction } from "../constants/leadAction";

export interface ILeadHistory extends Document {
  leadId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  action: LeadAction;
  oldValue?: string;
  newValue?: string;
  note?: string;
  createdAt: Date;
}

const LeadHistorySchema = new Schema<ILeadHistory>(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
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
      enum: Object.values(LeadAction),
    },
    oldValue: { type: String },
    newValue: { type: String },
    note: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

LeadHistorySchema.index({ leadId: 1, createdAt: -1 });
LeadHistorySchema.index({ employeeId: 1 });

export const LeadHistory =
  mongoose.models.LeadHistory ||
  mongoose.model<ILeadHistory>("LeadHistory", LeadHistorySchema);

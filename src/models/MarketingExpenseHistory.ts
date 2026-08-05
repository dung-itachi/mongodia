/**
 * ==================================================
 * MARKETING EXPENSE HISTORY MODEL
 * ==================================================
 *
 * Sprint 6.12 — Marketing Expense Timeline
 *
 * Lưu lịch sử thay đổi của MarketingExpenseReport.
 */

import mongoose, { Schema, type Document } from "mongoose";
import { MarketingExpenseAction } from "../constants/marketing-expense-action";

export interface IMarketingExpenseHistory extends Document {
  reportId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  action: MarketingExpenseAction;
  note?: string;
  createdAt: Date;
}

const MarketingExpenseHistorySchema = new Schema<IMarketingExpenseHistory>(
  {
    reportId: {
      type: Schema.Types.ObjectId,
      ref: "MarketingExpenseReport",
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
      enum: Object.values(MarketingExpenseAction),
    },
    note: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

MarketingExpenseHistorySchema.index({ reportId: 1, createdAt: -1 });
MarketingExpenseHistorySchema.index({ employeeId: 1 });

export const MarketingExpenseHistory =
  mongoose.models.MarketingExpenseHistory ||
  mongoose.model<IMarketingExpenseHistory>("MarketingExpenseHistory", MarketingExpenseHistorySchema);

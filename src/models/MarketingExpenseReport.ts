/**
 * ==================================================
 * MARKETING EXPENSE REPORT MODEL
 * ==================================================
 *
 * Sprint 6.5 — Marketing Expense Domain
 *
 * Báo cáo chi phí marketing theo ngày.
 *
 * Mỗi ngày cho mỗi FacebookPage chỉ tồn tại DUY NHẤT 1 report.
 * Nếu facebookPageId = null → report toàn team cho ngày đó.
 *
 * Sub-document schemas:
 *   - BudgetAllocation:  requested/spent/remaining (morning / afternoon / emergency)
 *
 * Workflow:
 *
 *   DRAFT  ──►  SUBMITTED  ──►  APPROVED  ──►  LOCKED
 *     ▲            │
 *     │            ▼
 *     │         REJECTED  ──►  DRAFT  (sửa + nộp lại)
 *     │
 *  REOPENED  ◄──  LOCKED  (mở lại để audit/điều chỉnh)
 */

import mongoose, { Schema, type Document } from "mongoose";
import { MarketingExpenseReportStatus } from "../constants/marketing-expense";

// ============================================================================
// Sub-document interfaces
// ============================================================================

/** Phân bổ ngân sách theo buổi / trường hợp khẩn cấp. */
export interface IBudgetAllocation {
  /** Ngân sách được duyệt (ban đầu) cho phần này. */
  morning: number;
  afternoon: number;
  emergency: number;
}

// ============================================================================
// Main interface
// ============================================================================

export interface IMarketingExpenseReport extends Document {
  /** Ngày báo cáo (00:00 UTC của ngày). */
  reportDate: Date;

  /** Nhân viên marketing phụ trách. */
  marketingEmployeeId: mongoose.Types.ObjectId;

  /**
   * Facebook page áp dụng. `null` = report toàn team cho ngày đó.
   */
  facebookPageId?: mongoose.Types.ObjectId;

  /** Ngân sách được yêu cầu (phân bổ theo buổi). */
  requestedBudget: IBudgetAllocation;

  /** Ngân sách đã chi (phân bổ theo buổi). */
  spentBudget: IBudgetAllocation;

  /**
   * Ngân sách còn lại = requestedBudget - spentBudget.
   * Được tính tự động bởi Calculator.
   */
  remainingBudget: IBudgetAllocation;

  /** Hiệu suất thực tế. */
  totalRevenue: number;
  totalLeads: number;
  closedLeads: number;
  conversionRate: number;
  roas: number;
  cpa: number;

  /** Trạng thái workflow. */
  status: MarketingExpenseReportStatus;

  /** Audit fields. */
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  lockedBy?: mongoose.Types.ObjectId;
  rejectedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  lockedAt?: Date;
  rejectedAt?: Date;
  /** Lý do leader từ chối (kèm khi status = REJECTED). */
  rejectionReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Sub-document schemas
// ============================================================================

const BudgetAllocationSchema = new Schema<IBudgetAllocation>(
  {
    morning: { type: Number, required: true, default: 0, min: 0 },
    afternoon: { type: Number, required: true, default: 0, min: 0 },
    emergency: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false }
);

// ============================================================================
// Main schema
// ============================================================================

const MarketingExpenseReportSchema = new Schema<IMarketingExpenseReport>(
  {
    reportDate: {
      type: Date,
      required: true,
      index: true,
    },

    marketingEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    facebookPageId: {
      type: Schema.Types.ObjectId,
      ref: "FacebookPage",
      default: null,
      index: true,
    },

    requestedBudget: {
      type: BudgetAllocationSchema,
      required: true,
      default: () => ({ morning: 0, afternoon: 0, emergency: 0 }),
    },

    spentBudget: {
      type: BudgetAllocationSchema,
      required: true,
      default: () => ({ morning: 0, afternoon: 0, emergency: 0 }),
    },

    remainingBudget: {
      type: BudgetAllocationSchema,
      required: true,
      default: () => ({ morning: 0, afternoon: 0, emergency: 0 }),
    },

    // ---- Performance metrics ----
    totalRevenue: { type: Number, required: true, default: 0, min: 0 },
    totalLeads: { type: Number, required: true, default: 0, min: 0 },
    closedLeads: { type: Number, required: true, default: 0, min: 0 },
    conversionRate: { type: Number, required: true, default: 0, min: 0, max: 1 },
    roas: { type: Number, required: true, default: 0, min: 0 },
    cpa: { type: Number, required: true, default: 0, min: 0 },

    // ---- Status ----
    status: {
      type: String,
      required: true,
      enum: Object.values(MarketingExpenseReportStatus),
      default: MarketingExpenseReportStatus.DRAFT,
      index: true,
    },

    // ---- Audit ----
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    lockedBy: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    approvedAt: { type: Date },
    lockedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

// ============================================================================
// Indexes
// ============================================================================

/**
 * UNIQUE constraint:
 *   Mỗi ngày cho mỗi FacebookPage chỉ tồn tại DUY NHẤT 1 report.
 *   Nếu facebookPageId = null → report toàn team cho ngày đó.
 *
 * Lưu ý: MongoDB coi giá trị `null` và missing field là distinct
 * (sparse partial index), nên ta dùng `partialFilterExpression` để
 * cho phép nhiều report có `facebookPageId = null` khác pageId.
 *
 * Tuy nhiên, yêu cầu nghiệp vụ: chỉ có 1 report cho mỗi (reportDate, facebookPageId).
 * Vì vậy ta dùng partial unique trên `facebookPageId: { $exists: true }`,
 * và đảm bảo bằng Service logic rằng chỉ 1 report có `facebookPageId = null`
 * cho mỗi reportDate.
 */
MarketingExpenseReportSchema.index(
  { reportDate: 1, facebookPageId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      facebookPageId: { $type: "objectId" },
    },
    name: "uniq_reportDate_facebookPageId",
  }
);

/**
 * UNIQUE constraint cho report toàn team (facebookPageId = null).
 *   Mỗi reportDate chỉ có 1 report có facebookPageId = null.
 */
MarketingExpenseReportSchema.index(
  { reportDate: 1 },
  {
    unique: true,
    partialFilterExpression: {
      facebookPageId: { $type: "null" },
    },
    name: "uniq_reportDate_team",
  }
);

// Phục vụ filter / list / dashboard.
MarketingExpenseReportSchema.index({ marketingEmployeeId: 1, reportDate: -1 });
MarketingExpenseReportSchema.index({ status: 1, reportDate: -1 });
MarketingExpenseReportSchema.index({ reportDate: -1 });
MarketingExpenseReportSchema.index({ createdAt: -1 });

export const MarketingExpenseReport =
  (mongoose.models.MarketingExpenseReport as mongoose.Model<IMarketingExpenseReport>) ||
  mongoose.model<IMarketingExpenseReport>(
    "MarketingExpenseReport",
    MarketingExpenseReportSchema
  );

export default MarketingExpenseReport;

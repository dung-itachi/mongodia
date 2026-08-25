import mongoose, { Schema, type Document } from "mongoose";
import { LeadStatus } from "../constants/leadStatus";

export const SOURCE_TYPES = [
  "LANDING_PAGE",
  "FACEBOOK_COMMENT",
  "FACEBOOK_INBOX",
  "OTHER",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  LANDING_PAGE: "Landing Page",
  FACEBOOK_COMMENT: "Facebook Comment",
  FACEBOOK_INBOX: "Facebook Inbox",
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
  /** Giá trên 1 combo (MNT). Đơn vị tiền bán hàng chính của hệ thống. */
  unitPriceMNT?: number;
  /** Tỷ giá 1 MNT → VND tại thời điểm tạo Lead (audit). */
  exchangeRate?: number;
  estimatedWeight?: number;
  status: LeadStatus;
  latestRemark?: string;
  note?: string;
  isDuplicate: boolean;
  isActive: boolean;
  /** Lead đã được convert thành Order chưa (Sprint 5.7). */
  isConverted: boolean;
  /** Order ID nếu lead đã convert (Sprint 5.7, 8.4). */
  convertedOrderId?: mongoose.Types.ObjectId;
  /** Thời điểm convert thành Order (Sprint 5.7). */
  convertedAt?: Date;
  /** Ngày giờ từ Landing page (Sprint 8.x) - để track thời gian thực tế khách đăng ký. */
  leadDate?: Date;
  /** Thời gian đơn hàng (Sprint 8.x) - thời gian khách đặt hàng/thời gian từ form. */
  orderDate?: Date;
  /** Thời gian nhận đơn (Sprint 8.x) - thời gian Marketing nhận được đơn. */
  receivedDate?: Date;
  /**
   * Sprint 8.7: Variant details snapshot (từ Marketing nhập hoặc Sale chốt).
   * Cho phép /leads → chốt đơn prefill sẵn giá trị biến thể.
   */
  variantDetails?: Array<{
    quantity: number;
    attributes: Array<{
      optionId: mongoose.Types.ObjectId | string;
      valueId: mongoose.Types.ObjectId | string;
      optionName?: string;
      valueName?: string;
    }>;
    variantId?: mongoose.Types.ObjectId | string;
  }>;
  /** Sprint 8.7: Chế độ quà tặng liên kết variant details. */
  giftMode?: "RANDOM" | "CUSTOMER_SELECTED";
  /** Sprint 8.7: Gift selections từ Marketing điền. */
  giftSelections?: Array<{
    giftProductId: mongoose.Types.ObjectId | string;
    giftProductName?: string;
    quantity: number;
  }>;
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
    // Sprint 5.7 — Lead Convert (Sprint 8.4 — renamed orderId to convertedOrderId)
    isConverted: { type: Boolean, default: false },
    convertedOrderId: { type: Schema.Types.ObjectId, ref: "Order" },
    convertedAt: { type: Date },
    // Sprint 8.x — leadDate từ Landing page (ngày giờ thực tế khách đăng ký)
    leadDate: { type: Date },
    // Sprint 8.x — orderDate: thời gian đơn hàng (khách đặt)
    orderDate: { type: Date },
    // Sprint 8.x — receivedDate: thời gian nhận đơn (Marketing nhận được)
    receivedDate: { type: Date },
    // Sprint 8.7 — variant details snapshot (phục vụ prefill khi Sale chốt đơn)
    variantDetails: [
      {
        _id: false,
        quantity: { type: Number, min: 0 },
        attributes: [
          {
            _id: false,
            optionId: { type: Schema.Types.Mixed, required: true },
            valueId: { type: Schema.Types.Mixed, required: true },
            optionName: { type: String },
            valueName: { type: String },
          },
        ],
        variantId: { type: Schema.Types.Mixed },
      },
    ],
    giftMode: { type: String, enum: ["RANDOM", "CUSTOMER_SELECTED"] },
    giftSelections: [
      {
        _id: false,
        giftProductId: { type: Schema.Types.Mixed, required: true },
        giftProductName: { type: String },
        quantity: { type: Number, min: 0 },
      },
    ],
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
LeadSchema.index({ isConverted: 1 });
LeadSchema.index({ convertedOrderId: 1 });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ orderDate: -1 });
LeadSchema.index({ receivedDate: -1 });
LeadSchema.index({ categoryId: 1, productId: 1, comboId: 1 });

// ==================================================
// Compound indexes — phục vụ dashboard aggregations
// ==================================================

// Global "group by status" aggregation cần index scan theo (isActive, status).
LeadSchema.index({ isActive: 1, status: 1 });

// Window-based aggregations (summary theo period) cần (isActive, createdAt).
LeadSchema.index({ isActive: 1, createdAt: -1 });

// Scope-based filters (MKT/SALE) cần prefix marketingEmployeeId/saleEmployeeId
// đi kèm isActive + createdAt để tránh COLLSCAN khi filter theo time range.
LeadSchema.index({ marketingEmployeeId: 1, isActive: 1, createdAt: -1 });
LeadSchema.index({ saleEmployeeId: 1, isActive: 1, createdAt: -1 });

// Sprint 8.x: filter theo sourceType + time range
LeadSchema.index({ sourceType: 1, isActive: 1, createdAt: -1 });

export const Lead =
  mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);

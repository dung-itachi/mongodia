import { Schema, model, models, InferSchemaType } from "mongoose";

const LoginHistorySchema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    username: {
      type: String,
      required: true,
    },

    ip: {
      type: String,
      default: "",
    },

    userAgent: {
      type: String,
      default: "",
    },

    success: {
      type: Boolean,
      default: true,
    },

    loginAt: {
      type: Date,
      default: Date.now,
    },

    /** Login is trusted by user confirmation */
    isTrusted: {
      type: Boolean,
      default: false,
    },

    /** Reason for anomaly detection */
    anomalyReason: {
      type: String,
      default: "",
    },

    /** Unusual IP compared to user's history */
    isUnusualIp: {
      type: Boolean,
      default: false,
    },

    /** Unusual device/browser compared to user's history */
    isUnusualDevice: {
      type: Boolean,
      default: false,
    },

    /** Unusual location compared to user's history */
  isUnusualLocation: {
    type: Boolean,
    default: false,
  },
  },
  {
    timestamps: true,
  }
);

// ==================================================
// Indexes — phục vụ query dashboard, login-history, anomaly detection
// ==================================================

// Generic "list login history by user, newest first" — dùng bởi /api/login-history
LoginHistorySchema.index({ employeeId: 1, loginAt: -1 });

// "Get trusted logins for a user to compare against a new login" —
// dùng bởi check-suspicious (bỏ N+1).
LoginHistorySchema.index({ employeeId: 1, success: 1, isTrusted: 1, loginAt: -1 });

export type LoginHistory = InferSchemaType<typeof LoginHistorySchema>;

const LoginHistoryModel =
  models.LoginHistory ||
  model("LoginHistory", LoginHistorySchema);

export default LoginHistoryModel;
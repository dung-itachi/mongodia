import { Schema, model, models, InferSchemaType } from "mongoose";

const AuditLogSchema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    action: {
      type: String,
      required: true,
    },

    module: {
      type: String,
      required: true,
    },

    targetId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    oldData: {
      type: Schema.Types.Mixed,
      default: null,
    },

    newData: {
      type: Schema.Types.Mixed,
      default: null,
    },

    ip: {
      type: String,
      default: "",
    },

    userAgent: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export type AuditLog = InferSchemaType<typeof AuditLogSchema>;

const AuditLogModel =
  models.AuditLog ||
  model("AuditLog", AuditLogSchema);

export default AuditLogModel;
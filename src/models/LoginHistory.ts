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
  },
  {
    timestamps: true,
  }
);

export type LoginHistory = InferSchemaType<typeof LoginHistorySchema>;

const LoginHistoryModel =
  models.LoginHistory ||
  model("LoginHistory", LoginHistorySchema);

export default LoginHistoryModel;
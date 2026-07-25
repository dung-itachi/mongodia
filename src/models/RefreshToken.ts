import { Schema, model, models, InferSchemaType } from "mongoose";

const RefreshTokenSchema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    token: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    revoked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export type RefreshToken = InferSchemaType<typeof RefreshTokenSchema>;

const RefreshTokenModel =
  models.RefreshToken ||
  model("RefreshToken", RefreshTokenSchema);

export default RefreshTokenModel;
import { Schema, model, models, InferSchemaType } from "mongoose";

const RoleSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

RoleSchema.index({ isActive: 1 });

export type Role = InferSchemaType<typeof RoleSchema>;

const RoleModel = models.Role || model<Role>("Role", RoleSchema);

export default RoleModel;

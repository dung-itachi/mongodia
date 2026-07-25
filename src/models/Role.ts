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

    permissions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Permission",
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export type Role = InferSchemaType<typeof RoleSchema>;

const RoleModel = models.Role || model("Role", RoleSchema);

export default RoleModel;
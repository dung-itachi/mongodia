import { Schema, model, models, InferSchemaType } from "mongoose";

const PermissionSchema = new Schema(
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

    module: {
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

export type Permission = InferSchemaType<typeof PermissionSchema>;

const PermissionModel =
  models.Permission || model("Permission", PermissionSchema);

export default PermissionModel;
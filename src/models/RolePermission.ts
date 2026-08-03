import { Schema, model, models, InferSchemaType } from "mongoose";

const RolePermissionSchema = new Schema(
  {
    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    permissionId: {
      type: Schema.Types.ObjectId,
      ref: "Permission",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

RolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });
RolePermissionSchema.index({ roleId: 1 });
RolePermissionSchema.index({ permissionId: 1 });

export type RolePermission = InferSchemaType<typeof RolePermissionSchema>;

const RolePermissionModel =
  models.RolePermission ||
  model<RolePermission>("RolePermission", RolePermissionSchema);

export default RolePermissionModel;

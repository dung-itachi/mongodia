import { Schema, model, models, InferSchemaType } from "mongoose";

/**
 * Subset of `NavGroupKey` from `@/config/modules`.
 * We keep it as a free-form string array to avoid a hard import
 * cycle (constants ← config ← constants) — the values are validated
 * at runtime by Sidebar against the modules registry.
 */
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

    /**
     * Nav groups this role is allowed to see on the sidebar.
     *
     * - ADMIN: not used (Admin sees all).
     * - LEADER: empty array — Sidebar resolves dynamically from
     *   the Leader's `Employee.teamId.code` (MKT → MKT group,
     *   SALE → SALE group, WAREHOUSE → WAREHOUSE group).
     * - Other roles: seeded from `constants/roles.ts#visibleGroups`.
     *
     * Stored as a plain string array so it survives DB roundtrips
     * and so the seed can upsert the field idempotently.
     */
    visibleGroups: {
      type: [String],
      default: [],
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

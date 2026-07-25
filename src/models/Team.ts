import mongoose, { Model, Schema, Types } from "mongoose";

export interface ITeam {
  code: string;
  name: string;

  departmentId: Types.ObjectId;

  areaId: Types.ObjectId;

  leaderId?: Types.ObjectId | null;

  managerId?: Types.ObjectId | null;

  isActive: boolean;
}

const TeamSchema = new Schema<ITeam>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    areaId: {
      type: Schema.Types.ObjectId,
      ref: "Area",
      required: true,
    },

    leaderId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    managerId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
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

const Team: Model<ITeam> =
  mongoose.models.Team ||
  mongoose.model<ITeam>("Team", TeamSchema);

export default Team;
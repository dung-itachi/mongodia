import mongoose, { Model, Schema, Types } from "mongoose";

export interface IEmployee {
  employeeCode: string;

  username: string;
  password: string;

  fullName: string;

  email: string;
  phone?: string;

  avatar?: string;

  roleId: Types.ObjectId;

  teamId?: Types.ObjectId | null;

  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;

  lastLogin?: Date;

  isActive: boolean;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    avatar: {
      type: String,
      default: "",
    },

    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },

    bankName: {
      type: String,
      default: "",
    },

    bankAccountNumber: {
      type: String,
      default: "",
    },

    bankAccountHolder: {
      type: String,
      default: "",
    },

    lastLogin: {
      type: Date,
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

const Employee: Model<IEmployee> =
  mongoose.models.Employee ||
  mongoose.model<IEmployee>("Employee", EmployeeSchema);

export default Employee;
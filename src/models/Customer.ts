import mongoose, { Model, Schema, Types } from "mongoose";

export interface ICustomer {
  code: string;

  name: string;

  phone: string;

  email?: string;

  gender: "MALE" | "FEMALE" | "OTHER";

  birthday?: Date | null;

  address?: string;

  areaId: Types.ObjectId;

  teamId: Types.ObjectId;

  marketingEmployeeId: Types.ObjectId;

  note?: string;

  isActive: boolean;
}

const CustomerSchema = new Schema<ICustomer>(
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

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      default: "",
    },

    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
      default: "OTHER",
    },

    birthday: {
      type: Date,
      default: null,
    },

    address: {
      type: String,
      default: "",
    },

    areaId: {
      type: Schema.Types.ObjectId,
      ref: "Area",
      required: true,
    },

    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },

    marketingEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    note: {
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

CustomerSchema.index({ teamId: 1 });
CustomerSchema.index({ marketingEmployeeId: 1 });
CustomerSchema.index({ areaId: 1 });

const Customer: Model<ICustomer> =
  mongoose.models.Customer ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);

export default Customer;

import mongoose, { Schema, Model } from "mongoose";

export interface IArea {
  code: string;
  name: string;
  address?: string;
  countryCode: string;
  isActive: boolean;
}

const AreaSchema = new Schema<IArea>(
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
    address: {
      type: String,
      default: "",
    },
    countryCode: {
      type: String,
      required: true,
      default: "MN",
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

const Area: Model<IArea> =
  mongoose.models.Area || mongoose.model<IArea>("Area", AreaSchema);

export default Area;
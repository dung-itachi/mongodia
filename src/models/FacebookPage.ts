import mongoose, { Schema, Model } from "mongoose";

export interface IFacebookPage {
  code: string;
  name: string;
  pageUrl: string;
  facebookPageId: string;
  description: string;
  isActive: boolean;
}

const FacebookPageSchema = new Schema<IFacebookPage>(
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
    pageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    facebookPageId: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
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

const FacebookPage: Model<IFacebookPage> =
  mongoose.models.FacebookPage ||
  mongoose.model<IFacebookPage>("FacebookPage", FacebookPageSchema);

export default FacebookPage;

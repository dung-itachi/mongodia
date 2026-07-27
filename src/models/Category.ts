import mongoose, { Model, Schema, Types } from "mongoose";

export interface ICategory {
  code: string;

  name: string;

  parentId?: Types.ObjectId | null;

  description?: string;

  sortOrder: number;

  isActive: boolean;
}

const CategorySchema = new Schema<ICategory>(
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

    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    description: {
      type: String,
      default: "",
    },

    sortOrder: {
      type: Number,
      default: 0,
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

const Category: Model<ICategory> =
  mongoose.models.Category ||
  mongoose.model<ICategory>("Category", CategorySchema);

export default Category;
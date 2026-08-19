import mongoose, { Model, Schema, Types } from "mongoose";

export interface ICategory {
  code: string;

  name: string;

  parentId?: Types.ObjectId | null;

  description?: string;

  sortOrder: number;

  isActive: boolean;

  /** Account ID để phân quyền xem danh mục theo tài khoản */
  accountId?: Types.ObjectId;
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

    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for filtering by accountId and isActive
CategorySchema.index({ accountId: 1, isActive: 1 });

const Category: Model<ICategory> =
  mongoose.models.Category ||
  mongoose.model<ICategory>("Category", CategorySchema);

export default Category;
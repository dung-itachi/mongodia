import mongoose, { Model, Schema, Types } from "mongoose";

export interface IFacebookPageAssignment {
  facebookPageId: Types.ObjectId;
  marketingEmployeeId: Types.ObjectId;
  startDate: Date;
  endDate: Date | null;
  note: string;
  isActive: boolean;
}

const FacebookPageAssignmentSchema =
  new Schema<IFacebookPageAssignment>(
    {
      facebookPageId: {
        type: Schema.Types.ObjectId,
        ref: "FacebookPage",
        required: true,
      },

      marketingEmployeeId: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
      },

      startDate: {
        type: Date,
        required: true,
      },

      endDate: {
        type: Date,
        default: null,
      },

      note: {
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

FacebookPageAssignmentSchema.index({ facebookPageId: 1 });
FacebookPageAssignmentSchema.index({ marketingEmployeeId: 1 });
FacebookPageAssignmentSchema.index({ startDate: 1 });
FacebookPageAssignmentSchema.index({ endDate: 1 });

const FacebookPageAssignment: Model<IFacebookPageAssignment> =
  mongoose.models.FacebookPageAssignment ||
  mongoose.model<IFacebookPageAssignment>(
    "FacebookPageAssignment",
    FacebookPageAssignmentSchema
  );

export default FacebookPageAssignment;

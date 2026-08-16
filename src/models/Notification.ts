import { Schema, model, models, InferSchemaType } from "mongoose";
import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
} from "@/constants/notification";

export { NotificationType, NotificationCategory, NotificationPriority };

export interface INotification {
  _id: Schema.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  senderId: Schema.Types.ObjectId;
  recipients: Schema.Types.ObjectId[];
  readBy: Schema.Types.ObjectId[];
  readAt: Map<string, Date>;
  isPinned: boolean;
  isActive: boolean;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: Object.values(NotificationType),
      default: NotificationType.INFO,
    },

    category: {
      type: String,
      enum: Object.values(NotificationCategory),
      default: NotificationCategory.GENERAL,
    },

    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.NORMAL,
    },

    senderId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    recipients: [
      {
        type: Schema.Types.ObjectId,
        ref: "Employee",
      },
    ],

    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "Employee",
      },
    ],

    isPinned: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    link: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ recipients: 1, isActive: 1, createdAt: -1 });
NotificationSchema.index({ readBy: 1 });
NotificationSchema.index({ createdAt: -1 });

export type Notification = InferSchemaType<typeof NotificationSchema>;

export default models.Notification ||
  model<INotification>("Notification", NotificationSchema);
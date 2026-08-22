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
  // Extended recipient selection
  recipientMode: "broadcast" | "individual" | "team" | "leader" | "role";
  teamIds?: Schema.Types.ObjectId[];
  leaderIds?: Schema.Types.ObjectId[];
  roleFilters?: string[];
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

    // Extended recipient selection modes
    recipientMode: {
      type: String,
      enum: ["broadcast", "individual", "team", "leader", "role"],
      default: "broadcast",
    },

    teamIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Team",
      },
    ],

    leaderIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Employee",
      },
    ],

    roleFilters: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ recipients: 1, isActive: 1, createdAt: -1 });
NotificationSchema.index({ readBy: 1 });
NotificationSchema.index({ createdAt: -1 });

// Compound indexes phục vụ dashboard/activities + notifications list.
// `{ isActive, createdAt }` hỗ trợ query "recent active notifications" không qua $or.
NotificationSchema.index({ isActive: 1, createdAt: -1 });
// Tách riêng khỏi multikey để tránh penalty cho query sort theo createdAt.
NotificationSchema.index({ recipients: 1, createdAt: -1 });

export type Notification = InferSchemaType<typeof NotificationSchema>;

export default models.Notification ||
  model<INotification>("Notification", NotificationSchema);
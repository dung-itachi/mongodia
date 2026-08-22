/**
 * NotificationRead (per-user read state)
 *
 * The base `Notification` collection holds broadcast/group announcements.
 * Each user's individual read state is tracked in this separate collection
 * so we never mutate the original Notification when a user dismisses it.
 *
 * Indexing strategy:
 *  - `{ notificationId, employeeId }` unique — guarantees one read-row per
 *    (user, notification) and lets us UPSERT idempotently.
 *  - `{ employeeId, notificationId }` — supports the unread-count query
 *    "give me all notifications whose (notificationId, employeeId) does NOT
 *    exist in this collection".
 *  - `{ notificationId }` — supports per-user stats on a single notification
 *    (e.g. "who has read this?").
 */

import { Schema, model, models, Types, InferSchemaType } from "mongoose";

const NotificationReadSchema = new Schema(
  {
    notificationId: {
      type: Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    readAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: false,
  }
);

NotificationReadSchema.index({ notificationId: 1, employeeId: 1 }, { unique: true });
NotificationReadSchema.index({ employeeId: 1, notificationId: 1 });
// Hỗ trợ query `find({ employeeId }).select("notificationId")` (unread-count) đi qua IXSCAN.
NotificationReadSchema.index({ employeeId: 1, _id: -1 });

export type NotificationRead = InferSchemaType<typeof NotificationReadSchema> & {
  _id: Types.ObjectId;
};

export default models.NotificationRead ||
  model("NotificationRead", NotificationReadSchema);

import { Schema, model, models, InferSchemaType } from "mongoose";

const NotificationSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
        },

        message: {
            type: String,
            required: true,
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

        confirmedBy: [
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
    },
    {
        timestamps: true,
    }
);

export type Notification = InferSchemaType<
    typeof NotificationSchema
>;

export default models.Notification ||
    model("Notification", NotificationSchema);
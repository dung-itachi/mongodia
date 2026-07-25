import { Schema, model, models, InferSchemaType } from "mongoose";

const SettingSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    value: {
      type: Schema.Types.Mixed,
      default: null,
    },

    description: {
      type: String,
      default: "",
    },

    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export type Setting = InferSchemaType<typeof SettingSchema>;

const SettingModel =
  models.Setting || model("Setting", SettingSchema);

export default SettingModel;
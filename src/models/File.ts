import { Schema, model, models, InferSchemaType } from "mongoose";

const FileSchema = new Schema(
  {
    fileName: {
      type: String,
      required: true,
    },

    originalName: {
      type: String,
      required: true,
    },

    url: {
      type: String,
      required: true,
    },

    folder: {
      type: String,
      default: "",
    },

    mimeType: {
      type: String,
      default: "",
    },

    extension: {
      type: String,
      default: "",
    },

    size: {
      type: Number,
      default: 0,
    },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
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

export type File = InferSchemaType<typeof FileSchema>;

const FileModel =
  models.File || model("File", FileSchema);

export default FileModel;
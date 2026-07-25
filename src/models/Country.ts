import { Schema, model, models, InferSchemaType } from "mongoose";

const CountrySchema = new Schema(
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

    currency: {
      type: String,
      default: "",
    },

    timezone: {
      type: String,
      default: "",
    },

    language: {
      type: String,
      default: "",
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

export type Country = InferSchemaType<typeof CountrySchema>;

export default models.Country ||
  model("Country", CountrySchema);
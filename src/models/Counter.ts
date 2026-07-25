import mongoose, { Model, Schema } from "mongoose";

export interface ICounter {
  key: string;
  value: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Counter: Model<ICounter> =
  mongoose.models.Counter ||
  mongoose.model<ICounter>("Counter", CounterSchema);

export default Counter;
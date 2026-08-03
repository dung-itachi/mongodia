import mongoose, { Model, Schema } from "mongoose";

export interface ICounter {
  _id?: mongoose.Types.ObjectId;
  key: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    seq: {
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
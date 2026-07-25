import Counter from "@/models/Counter";

export async function getNextSequence(counterName: string) {
  const counter = await Counter.findByIdAndUpdate(
    counterName,
    {
      $inc: {
        seq: 1,
      },
    },
    {
      new: true,
      upsert: true,
    }
  );

  if (!counter) {
    throw new Error("Cannot generate sequence");
  }

  return counter.seq;
}
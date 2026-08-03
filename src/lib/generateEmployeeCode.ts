import Counter from "@/models/Counter";

export async function generateEmployeeCode() {
  const counter = await Counter.findOneAndUpdate(
    {
      key: "EMPLOYEE",
    },
    {
      $inc: {
        value: 1,
      },
    },
    {
      new: true,
      upsert: true,
    }
  );

  return `EMP${counter.seq.toString().padStart(6, "0")}`;
}
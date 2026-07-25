import Counter from "@/models/Counter";
import { COUNTERS } from "@/constants/counters";

export async function seedCounters() {
  for (const counter of COUNTERS) {
    await Counter.updateOne(
      {
        key: counter.key,
      },
      {
        $setOnInsert: counter,
      },
      {
        upsert: true,
      }
    );
  }

  console.log("[OK] Counters");
}
import Area from "@/models/Area";
import { AREAS } from "@/constants/areas";

export async function seedAreas() {
  for (const area of AREAS) {
    await Area.updateOne(
      { code: area.code },
      {
        $set: {
          ...area,
          isActive: true,
        },
      },
      {
        upsert: true,
      }
    );
  }

  console.log("[OK] Areas");
}
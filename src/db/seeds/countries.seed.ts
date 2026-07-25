import Country from "@/models/Country";
import { COUNTRIES } from "@/constants/countries";

export async function seedCountries() {
  for (const country of COUNTRIES) {
    await Country.updateOne(
      { code: country.code },
      {
        $set: {
          ...country,
          isActive: true,
        },
      },
      {
        upsert: true,
      }
    );
  }

  console.log("[OK] Countries");
}
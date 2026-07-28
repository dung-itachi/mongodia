import FacebookPage from "@/models/FacebookPage";
import { FACEBOOK_PAGES } from "@/constants/facebook-pages";

export async function seedFacebookPages() {
  for (const page of FACEBOOK_PAGES) {
    await FacebookPage.updateOne(
      { code: page.code },
      {
        $set: {
          ...page,
          isActive: true,
        },
      },
      {
        upsert: true,
      }
    );
  }

  console.log("[OK] Facebook Pages");
}

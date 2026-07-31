import { connectDB } from "@/lib/mongodb";
import { seedCountries } from "./seeds/countries.seed";
import { seedAreas } from "./seeds/areas.seed";
import { seedDepartments } from "./seeds/departments.seed";
import { seedTeams } from "./seeds/teams.seed";
import { seedPermissions } from "./seeds/permissions.seed";
import { seedRoles } from "./seeds/roles.seed";
import { seedEmployees } from "./seeds/employees.seed";
import { seedCounters } from "./seeds/counters.seed";
import { seedCategories } from "./seeds/categories.seed";
import { seedProducts } from "./seeds/products.seed";
import { seedVariantOptions } from "./seeds/variant-options.seed";
import { seedVariantValues } from "./seeds/variant-values.seed";
import { seedProductVariants } from "./seeds/product-variants.seed";
import { seedFacebookPages } from "./seeds/facebook-pages.seed";
import { seedCombos } from "./seeds/combos.seed";

async function seed() {
  try {
    await connectDB();

    console.log("[OK] MongoDB Connected");

    await seedCountries();
    await seedAreas();
    await seedDepartments();
    await seedTeams();
    await seedPermissions();
    await seedRoles();
    await seedEmployees();
    await seedCounters();
    await seedCategories();
    await seedProducts();
    await seedVariantOptions();
    await seedVariantValues();
    await seedProductVariants();
    await seedFacebookPages();
    await seedCombos();
    console.log("[DONE] Seed completed");

    process.exit(0);
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
}

seed();

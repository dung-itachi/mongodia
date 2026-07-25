import { connectDB } from "@/lib/mongodb";
import { seedCountries } from "./seeds/countries.seed";
import { seedAreas } from "./seeds/areas.seed";
import { seedDepartments } from "./seeds/departments.seed";
import { seedTeams } from "./seeds/teams.seed";
import { seedPermissions } from "./seeds/permissions.seed";
import { seedRoles } from "./seeds/roles.seed";
import { seedEmployees } from "./seeds/employees.seed";
import { seedCounters } from "./seeds/counters.seed";
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
    console.log("[DONE] Seed completed");

    process.exit(0);
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
}

seed();
import { TEAMS } from "@/constants/teams";
import Area from "@/models/Area";
import Department from "@/models/Department";
import Team from "@/models/Team";

export async function seedTeams() {
  for (const team of TEAMS) {
    const department = await Department.findOne({
      code: team.departmentCode,
    });

    if (!department) {
      throw new Error(
        `Department ${team.departmentCode} không tồn tại`
      );
    }

    const area = await Area.findOne({
      code: team.areaCode,
    });

    if (!area) {
      throw new Error(`Area ${team.areaCode} không tồn tại`);
    }

    await Team.updateOne(
      {
        code: team.code,
      },
      {
        $set: {
          code: team.code,
          name: team.name,

          departmentId: department._id,
          areaId: area._id,

          leaderId: null,
          managerId: null,

          isActive: true,
        },
      },
      {
        upsert: true,
      }
    );
  }

  console.log("[OK] Teams");
}
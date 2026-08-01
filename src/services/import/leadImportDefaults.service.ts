/**
 * ==================================================
 * LEAD IMPORT - DEFAULTS SERVICE
 * ==================================================
 *
 * Resolves the default reference ids (Area, Team, Marketing Employee)
 * used when Lead Import needs to create a new Customer.
 *
 * Config-driven, NOT hardcoded. Three Setting keys are consulted:
 *
 *   IMPORT_DEFAULT_AREA_CODE
 *   IMPORT_DEFAULT_TEAM_CODE
 *   IMPORT_DEFAULT_MARKETING_EMPLOYEE_CODE
 *
 * Cache TTL is short (60s) so admins can change defaults without
 * restarting the server, but repeated imports inside the same batch
 * still hit only ONE query per domain.
 * ==================================================
 */

import { Types } from "mongoose";

import Setting from "@/models/Setting";
import Area from "@/models/Area";
import Team from "@/models/Team";
import Employee from "@/models/Employee";

// ==================================================
// Settings keys (single source of truth)
// ==================================================

export const LEAD_IMPORT_SETTING_KEYS = {
  AREA_CODE: "IMPORT_DEFAULT_AREA_CODE",
  TEAM_CODE: "IMPORT_DEFAULT_TEAM_CODE",
  MARKETING_EMPLOYEE_CODE: "IMPORT_DEFAULT_MARKETING_EMPLOYEE_CODE",
} as const;

// ==================================================
// Resolved shape
// ==================================================

export interface LeadImportDefaults {
  areaId: Types.ObjectId;
  teamId: Types.ObjectId;
  marketingEmployeeId: Types.ObjectId;
}

// ==================================================
// Cache (60s TTL)
// ==================================================

const CACHE_TTL_MS = 60 * 1000;

let cachedDefaults: { value: LeadImportDefaults; loadedAt: number } | null =
  null;

// ==================================================
// Public API
// ==================================================

/**
 * Read the 3 default settings keys. Returns the raw map keyed by
 * the LEAD_IMPORT_SETTING_KEYS enum.
 */
async function readSettingValues(): Promise<Record<string, string>> {
  const keys = Object.values(LEAD_IMPORT_SETTING_KEYS);
  const docs = await Setting.find({ key: { $in: keys } })
    .select("key value")
    .lean()
    .exec();

  const out: Record<string, string> = {};
  for (const d of docs as Array<{ key: string; value: unknown }>) {
    if (typeof d.value === "string" && d.value.trim() !== "") {
      out[d.key] = d.value.trim();
    }
  }
  return out;
}

/**
 * Resolve the default Area / Team / Marketing Employee ids used by
 * the Lead Import pipeline when creating a new Customer.
 *
 * Behavior:
 *   - First call hits DB and warms the 60s cache.
 *   - Subsequent calls within TTL return the cached values.
 *   - Missing setting key or missing reference doc throws a clear
 *     error so the admin knows exactly what to configure.
 *
 * Call `clearLeadImportDefaultsCache()` after updating Settings
 * if you don't want to wait for the TTL.
 */
export async function loadLeadImportDefaults(
  options: { force?: boolean } = {}
): Promise<LeadImportDefaults> {
  const { force = false } = options;

  if (
    !force &&
    cachedDefaults &&
    Date.now() - cachedDefaults.loadedAt < CACHE_TTL_MS
  ) {
    return cachedDefaults.value;
  }

  const settings = await readSettingValues();
  const areaCode = settings[LEAD_IMPORT_SETTING_KEYS.AREA_CODE];
  const teamCode = settings[LEAD_IMPORT_SETTING_KEYS.TEAM_CODE];
  const mktCode = settings[LEAD_IMPORT_SETTING_KEYS.MARKETING_EMPLOYEE_CODE];

  const missing: string[] = [];
  if (!areaCode) missing.push(LEAD_IMPORT_SETTING_KEYS.AREA_CODE);
  if (!teamCode) missing.push(LEAD_IMPORT_SETTING_KEYS.TEAM_CODE);
  if (!mktCode) missing.push(LEAD_IMPORT_SETTING_KEYS.MARKETING_EMPLOYEE_CODE);
  if (missing.length > 0) {
    throw new Error(
      `LeadImportDefaults: thiếu setting key ${missing.join(
        ", "
      )}. Vui lòng cấu hình trước khi Import.`
    );
  }

  const [area, team, mkt] = await Promise.all([
    Area.findOne({ code: areaCode }).select("_id").lean().exec(),
    Team.findOne({ code: teamCode }).select("_id").lean().exec(),
    Employee.findOne({ employeeCode: mktCode })
      .select("_id")
      .lean()
      .exec(),
  ]);

  const missingDoc: string[] = [];
  if (!area) missingDoc.push(`Area(code=${areaCode})`);
  if (!team) missingDoc.push(`Team(code=${teamCode})`);
  if (!mkt) missingDoc.push(`Employee(employeeCode=${mktCode})`);
  if (missingDoc.length > 0) {
    throw new Error(
      `LeadImportDefaults: không tìm thấy ${missingDoc.join(
        ", "
      )} trong DB theo setting đã cấu hình.`
    );
  }

  const value: LeadImportDefaults = {
    areaId: new Types.ObjectId(area!._id.toString()),
    teamId: new Types.ObjectId(team!._id.toString()),
    marketingEmployeeId: new Types.ObjectId(mkt!._id.toString()),
  };

  cachedDefaults = { value, loadedAt: Date.now() };
  return value;
}

/** Manually clear the defaults cache (e.g. after admin updates Settings). */
export function clearLeadImportDefaultsCache(): void {
  cachedDefaults = null;
}

import { createLeadSchema, updateLeadSchema } from "@/utils/validator";

interface ValidationCase {
  name: string;
  schema: "create" | "update";
  payload: Record<string, unknown>;
  expectedValid: boolean;
}

interface TestResult extends ValidationCase {
  passed: boolean;
  actualValid: boolean;
  message: string;
}

const createBase = {
  customerName: "Khách hàng hợp lệ",
  sourceType: "LANDING_PAGE",
};

const updateBase = {};
const objectId = "507f1f77bcf86cd799439011";
const statuses = [
  "NEW",
  "ASSIGNED",
  "PROCESSING",
  "NO_ANSWER",
  "POTENTIAL",
  "REJECTED",
  "ORDER_CREATED",
  "CANCELLED",
];

const cases: ValidationCase[] = [];

function add(
  name: string,
  schema: ValidationCase["schema"],
  changes: Record<string, unknown>,
  expectedValid: boolean
) {
  cases.push({
    name,
    schema,
    payload: { ...(schema === "create" ? createBase : updateBase), ...changes },
    expectedValid,
  });
}

add("Create - payload hợp lệ tối thiểu", "create", {}, true);
add("Update - payload hợp lệ rỗng", "update", {}, true);

for (const schema of ["create", "update"] as const) {
  add(`${schema} phone hợp lệ 10 chữ số`, schema, { phone: "0912345678" }, true);
  add(`${schema} phone hợp lệ 11 chữ số`, schema, { phone: "01234567890" }, true);
  add(`${schema} phone sai ký tự`, schema, { phone: "09123A5678" }, false);
  add(`${schema} phone sai prefix`, schema, { phone: "1912345678" }, false);
  add(`${schema} phone thiếu số`, schema, { phone: "091234567" }, false);
  add(`${schema} phone quá ngắn`, schema, { phone: "09123456" }, false);
  add(`${schema} phone quá dài`, schema, { phone: "012345678901" }, false);
  add(`${schema} phone rỗng`, schema, { phone: "" }, true);
  add(`${schema} phone sai kiểu`, schema, { phone: 912345678 }, false);
  add(`${schema} phone2 biên hợp lệ`, schema, { phone2: "0912345678" }, true);
  add(`${schema} phone2 quá dài`, schema, { phone2: "012345678901" }, false);

  add(`${schema} Facebook URL hợp lệ`, schema, { facebookLink: "https://www.facebook.com/example" }, true);
  add(`${schema} Facebook URL mobile hợp lệ`, schema, { facebookLink: "https://m.facebook.com/example" }, true);
  add(`${schema} Facebook URL không hợp lệ`, schema, { facebookLink: "not-a-url" }, false);
  add(`${schema} URL không phải Facebook`, schema, { facebookLink: "https://example.com/profile" }, false);
  add(`${schema} Facebook chuỗi rỗng`, schema, { facebookLink: "" }, true);
  add(`${schema} Facebook sai kiểu`, schema, { facebookLink: 123 }, false);

  add(`${schema} assignedAt ISO hợp lệ`, schema, { assignedAt: "2026-08-01T08:00:00.000Z" }, true);
  add(`${schema} assignedAt sai định dạng`, schema, { assignedAt: "not-a-date" }, false);
  add(`${schema} assignedAt null`, schema, { assignedAt: null }, true);
  add(`${schema} assignedAt Invalid Date`, schema, { assignedAt: new Date("invalid") }, false);

  add(`${schema} latestRemark rỗng`, schema, { latestRemark: "" }, true);
  add(`${schema} latestRemark biên 2000`, schema, { latestRemark: "a".repeat(2000) }, true);
  add(`${schema} latestRemark quá 2000`, schema, { latestRemark: "a".repeat(2001) }, false);
  add(`${schema} latestRemark sai kiểu`, schema, { latestRemark: 123 }, false);

  add(`${schema} assignmentType AUTO`, schema, { assignmentType: "AUTO" }, true);
  add(`${schema} assignmentType MANUAL`, schema, { assignmentType: "MANUAL" }, true);
  add(`${schema} assignmentType không hợp lệ`, schema, { assignmentType: "RANDOM" }, false);
  add(`${schema} assignmentType sai kiểu`, schema, { assignmentType: 1 }, false);

  add(`${schema} customerId ObjectId hợp lệ`, schema, { customerId: objectId }, true);
  add(`${schema} customerId malformed`, schema, { customerId: "invalid-id" }, false);
  add(`${schema} customerId sai kiểu`, schema, { customerId: 123 }, false);

  add(`${schema} status enum không hợp lệ`, schema, { status: "UNKNOWN" }, false);
  add(`${schema} status null`, schema, { status: null }, false);
  add(`${schema} status sai kiểu`, schema, { status: 1 }, false);
}

add("Create customerName thiếu", "create", { customerName: undefined }, false);
add("Create customerName rỗng", "create", { customerName: "" }, false);
add("Create customerName whitespace", "create", { customerName: "   " }, false);
add("Create customerName biên 1", "create", { customerName: "A" }, true);
add("Create customerName biên 200", "create", { customerName: "a".repeat(200) }, true);
add("Create customerName quá 200", "create", { customerName: "a".repeat(201) }, false);
add("Create customerName sai kiểu", "create", { customerName: 123 }, false);
add("Update customerName rỗng", "update", { customerName: "" }, false);
add("Update customerName biên 200", "update", { customerName: "a".repeat(200) }, true);
add("Update customerName quá 200", "update", { customerName: "a".repeat(201) }, false);
add("Update customerName sai kiểu", "update", { customerName: 123 }, false);

add("Create latestRemark null", "create", { latestRemark: null }, false);
add("Update latestRemark null", "update", { latestRemark: null }, true);
add("Create assignmentType thiếu", "create", {}, true);
add("Create assignmentType null", "create", { assignmentType: null }, false);
add("Update assignmentType thiếu", "update", {}, true);
add("Update assignmentType null", "update", { assignmentType: null }, true);
add("Create status thiếu mặc định NEW", "create", {}, true);
add("Update status thiếu", "update", {}, true);

for (const status of statuses) {
  add(`Create status hợp lệ ${status}`, "create", { status }, true);
  add(`Update status hợp lệ ${status}`, "update", { status }, true);
}

const results: TestResult[] = cases.map((testCase) => {
  const schema = testCase.schema === "create" ? createLeadSchema : updateLeadSchema;
  const parsed = schema.safeParse(testCase.payload);
  const message = parsed.success
    ? "Validation accepted"
    : parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");

  return {
    ...testCase,
    actualValid: parsed.success,
    passed: parsed.success === testCase.expectedValid,
    message,
  };
});

for (const result of results) {
  console.log(
    `[${result.passed ? "PASS" : "FAIL"}] ${result.name} | expected=${result.expectedValid ? "VALID" : "INVALID"} actual=${result.actualValid ? "VALID" : "INVALID"} | ${result.message}`
  );
}

const passed = results.filter((result) => result.passed).length;
const failed = results.length - passed;
console.log(`\nTOTAL=${results.length} PASS=${passed} FAIL=${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}

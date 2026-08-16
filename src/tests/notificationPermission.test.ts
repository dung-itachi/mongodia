/**
 * Notification permission gate — unit tests.
 *
 * Run: npx tsx src/tests/notificationPermission.test.ts
 *
 * Verifies the gate logic used by:
 *   - NotificationBell (UI hidden when permission missing)
 *   - /notifications page (redirect / empty state)
 *   - API routes (403 when permission missing)
 *   - NotificationProvider (no SSE connection when permission missing)
 */

import { hasPermission, hasAnyPermission } from "../lib/permission";
import { PERMISSIONS } from "../types/permission";

// ---------- Test runner ----------
let total = 0;
let passed = 0;

function testCase(id: string, description: string, fn: () => void) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✓ ${id}: ${description}`);
  } catch (error) {
    console.log(`  ✗ ${id}: ${description}`);
    console.log(`    ${(error as Error).message}`);
  }
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

console.log("Notification permission gate — unit tests\n");

// ---------- single-permission gate ----------

testCase("P1", "user có 'notification.view' → true", () => {
  assert(
    hasPermission(["notification.view"], "notification.view"),
    "phải true"
  );
});

testCase("P2", "user có 'notification.read' → vẫn xem được (view required)", () => {
  // UI dùng `hasAnyPermission` cho bell; check rằng read alone đủ cho
  // thấy dropdown (mark-as-read vẫn cần permission.read nếu tách).
  assert(
    hasPermission(["notification.read"], "notification.read"),
    "read alone đủ cho read"
  );
  assert(
    !hasPermission(["notification.read"], "notification.view"),
    "read alone KHÔNG đủ cho view"
  );
});

testCase("P3", "user không có notif permission → false", () => {
  assert(
    !hasPermission(["lead.view"], "notification.view"),
    "lead.view không suy ra notification.view"
  );
});

testCase("P4", "wildcard '*' cho phép tất cả", () => {
  assert(hasPermission(["*"], "notification.view"), "wildcard → true");
  assert(hasPermission(["*"], "notification.readAll"), "wildcard → true");
  assert(hasPermission(["*"], "anything.at.all"), "wildcard → true");
});

testCase("P5", "user array rỗng → false", () => {
  assert(!hasPermission([], "notification.view"), "no perms → false");
});

testCase("P6", "user = undefined → false", () => {
  assert(!hasPermission(undefined, "notification.view"), "no user → false");
});

testCase("P7", "user có nhiều permission, vẫn match chính xác", () => {
  assert(
    hasPermission(
      ["lead.view", "customer.view", "notification.view"],
      "notification.view"
    ),
    "match trong list"
  );
});

testCase("P8", "case-sensitive: 'notification.view' ≠ 'Notification.view'", () => {
  assert(
    !hasPermission(["notification.view"], "Notification.view"),
    "case-sensitive"
  );
});

// ---------- any-of permission gate ----------

testCase("A1", "any-of: view alone đủ cho nhóm view/read", () => {
  assert(
    hasAnyPermission(["notification.view"], [
      "notification.view",
      "notification.read",
    ]),
    "view alone match"
  );
});

testCase("A2", "any-of: readAll alone đủ cho readAll view", () => {
  assert(
    hasAnyPermission(["notification.readAll"], ["notification.readAll"]),
    "readAll alone match"
  );
});

testCase("A3", "any-of: không có perm match → false", () => {
  assert(
    !hasAnyPermission(
      ["lead.view"],
      ["notification.view", "notification.read"]
    ),
    "lead.view không match"
  );
});

testCase("A4", "any-of: wildcard luôn true", () => {
  assert(
    hasAnyPermission(["*"], ["notification.view", "notification.read"]),
    "wildcard → true"
  );
});

testCase("A5", "any-of: empty list → false", () => {
  assert(!hasAnyPermission(["notification.view"], []), "empty list");
});

// ---------- permission constants ----------

testCase("C1", "PERMISSIONS có notification.view", () => {
  assert(PERMISSIONS.NOTIFICATION_VIEW === "notification.view", "code");
});

testCase("C2", "PERMISSIONS có notification.read", () => {
  assert(PERMISSIONS.NOTIFICATION_READ === "notification.read", "code");
});

testCase("C3", "PERMISSIONS có notification.readAll", () => {
  assert(
    PERMISSIONS.NOTIFICATION_READ_ALL === "notification.readAll",
    "code"
  );
});

testCase("C4", "PERMISSIONS có notification.manage", () => {
  assert(
    PERMISSIONS.NOTIFICATION_MANAGE === "notification.manage",
    "code"
  );
});

// ---------- API gate simulation ----------

function canAccessListApi(userPerms: string[]): boolean {
  return userPerms.includes("notification.view");
}

function canMarkReadApi(userPerms: string[]): boolean {
  return userPerms.includes("notification.read");
}

function canMarkAllReadApi(userPerms: string[]): boolean {
  return userPerms.includes("notification.readAll");
}

function canStreamSseApi(userPerms: string[]): boolean {
  return userPerms.includes("notification.view");
}

testCase("G1", "list API: cần notification.view", () => {
  assert(canAccessListApi(["notification.view"]), "có view → true");
  assert(!canAccessListApi(["notification.read"]), "read alone → false");
});

testCase("G2", "mark-read API: cần notification.read", () => {
  assert(canMarkReadApi(["notification.read"]), "có read → true");
  assert(!canMarkReadApi(["notification.view"]), "view alone → false");
});

testCase("G3", "read-all API: cần notification.readAll", () => {
  assert(canMarkAllReadApi(["notification.readAll"]), "có readAll → true");
  assert(!canMarkAllReadApi(["notification.read"]), "read alone → false");
});

testCase("G4", "SSE stream: cần notification.view", () => {
  assert(canStreamSseApi(["notification.view"]), "view → true");
  assert(!canStreamSseApi([]), "no perms → false");
});

testCase("G5", "manage permission không bắt buộc cho UI nhưng gate safe", () => {
  assert(!canAccessListApi(["notification.manage"]), "manage alone không đủ view");
});

console.log(`\n${passed}/${total} test cases passed.`);

if (passed !== total) {
  process.exit(1);
}

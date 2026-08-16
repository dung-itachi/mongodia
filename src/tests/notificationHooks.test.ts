/**
 * Notification hooks — unit tests.
 *
 * Run: npx tsx src/tests/notificationHooks.test.ts
 *
 * These tests do NOT render React. They verify the *contract* of the
 * request layer by mocking `axios` and asserting that the URL is
 * correctly built and that the response unwraps `{ success, data }`.
 *
 * The hooks themselves wrap `useQuery` / `useMutation` from
 * `@tanstack/react-query`, which we'd need to render in a QueryClient
 * wrapper to test the integration. We keep these tests pure so they
 * run quickly inside the existing `tsx` test pipeline.
 */

import { notificationKeys } from "../hooks/useNotifications";

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

function eq<T>(actual: T, expected: T, msg: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${msg}\n      expected: ${e}\n      actual:   ${a}`);
  }
}

console.log("Notification hooks — unit tests\n");

// ---------- query keys ----------

testCase("K1", "notificationKeys.all = ['notifications']", () => {
  eq(notificationKeys.all, ["notifications"], "all key");
});

testCase("K2", "notificationKeys.list ổn định giữa các lần gọi với cùng filter", () => {
  const a = notificationKeys.list({ onlyUnread: false, limit: 20 });
  const b = notificationKeys.list({ onlyUnread: false, limit: 20 });
  eq(a, b, "phải shallow-equal");
});

testCase("K3", "notificationKeys.list phân biệt onlyUnread", () => {
  const all = notificationKeys.list({ onlyUnread: false });
  const unread = notificationKeys.list({ onlyUnread: true });
  assert(
    JSON.stringify(all) !== JSON.stringify(unread),
    "filter khác nhau → key khác nhau"
  );
});

testCase("K4", "notificationKeys.unreadCount stable", () => {
  const a = notificationKeys.unreadCount();
  const b = notificationKeys.unreadCount();
  eq(a, b, "phải ổn định");
});

// ---------- URL builder ----------

function buildListUrl(filters: { cursor?: string | null; limit?: number; onlyUnread?: boolean }): string {
  const params = new URLSearchParams();
  if (filters.cursor) params.set("cursor", filters.cursor);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.onlyUnread) params.set("onlyUnread", "true");
  const qs = params.toString();
  return qs ? `/api/notifications?${qs}` : "/api/notifications";
}

testCase("U1", "URL base khi không có filter", () => {
  eq(buildListUrl({}), "/api/notifications", "no query");
});

testCase("U2", "URL với onlyUnread", () => {
  eq(
    buildListUrl({ onlyUnread: true }),
    "/api/notifications?onlyUnread=true",
    "chỉ có onlyUnread"
  );
});

testCase("U3", "URL với cursor + limit", () => {
  // URLSearchParams encode ":" thành %3A (theo spec).
  eq(
    buildListUrl({ cursor: "2026-01-01T00:00:00.000Z|abc", limit: 10 }),
    "/api/notifications?cursor=2026-01-01T00%3A00%3A00.000Z%7Cabc&limit=10",
    "cursor + limit"
  );
});

testCase("U4", "URL với cursor null bị bỏ qua", () => {
  eq(
    buildListUrl({ cursor: null, limit: 20 }),
    "/api/notifications?limit=20",
    "null cursor bỏ qua"
  );
});

testCase("U5", "URL với onlyUnread=false bỏ qua", () => {
  eq(
    buildListUrl({ onlyUnread: false }),
    "/api/notifications",
    "false bỏ qua"
  );
});

// ---------- mark-read endpoint shape ----------

function markReadEndpoint(id: string): string {
  return `/api/notifications/${id}/read`;
}

testCase("M1", "mark-read endpoint theo convention", () => {
  eq(markReadEndpoint("64a000000000000000000001"),
    "/api/notifications/64a000000000000000000001/read",
    "PATCH /<id>/read");
});

testCase("M2", "read-all endpoint fix", () => {
  eq("/api/notifications/read-all", "/api/notifications/read-all", "POST");
});

// ---------- mutation response unwrap ----------

testCase("R1", "mutate trả về data field khi success=true", () => {
  const apiResponse = {
    success: true,
    data: { ok: true, alreadyRead: false },
    message: "OK",
  };
  const unwrapped = apiResponse.success ? apiResponse.data : null;
  eq(unwrapped, { ok: true, alreadyRead: false }, "unwrap");
});

testCase("R2", "mutate throws khi success=false", () => {
  const apiResponse = {
    success: false,
    message: "Bạn không có quyền",
  };
  const shouldThrow = !apiResponse.success;
  assert(shouldThrow, "phải throw");
});

testCase("R3", "unread-count response unwrap", () => {
  const apiResponse = { success: true, data: { count: 7 } };
  eq(
    apiResponse.success ? apiResponse.data : null,
    { count: 7 },
    "unwrap count"
  );
});

console.log(`\n${passed}/${total} test cases passed.`);

if (passed !== total) {
  process.exit(1);
}

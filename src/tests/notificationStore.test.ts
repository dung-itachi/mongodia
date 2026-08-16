/**
 * Notification store reducers — unit tests.
 *
 * Run: npx tsx src/tests/notificationStore.test.ts
 *   (or `npx jest src/tests/notificationStore.test.ts` if the file is
 *   renamed to .test.ts so jest.config.js picks it up.)
 *
 * Coverage:
 *   - snapshot event updates unreadCount
 *   - created event increments unreadCount
 *   - read event decrements unreadCount iff wasUnread
 *   - readAll event resets unreadCount to 0
 *   - count never goes negative
 *   - list event for created prepends & deduplicates
 *   - list event for read toggles item.read
 *   - list event for readAll sets all items to read
 */

import {
  applyStoreSnapshot,
  applyStoreCreated,
  applyStoreRead,
  applyStoreReadAll,
  applyListEvent,
  type NotificationStateSnapshot,
} from "../store/notification.reducers";

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

const base: NotificationStateSnapshot = { unreadCount: 3 };

console.log("Notification store reducers — unit tests\n");

// ---------- snapshot ----------

testCase("S1", "snapshot ghi đè unreadCount", () => {
  const next = applyStoreSnapshot(base, 12);
  eq(next, { unreadCount: 12 }, "count phải = 12");
});

testCase("S2", "snapshot với count âm trả về 0", () => {
  const next = applyStoreSnapshot(base, -5);
  eq(next, { unreadCount: 0 }, "count phải >= 0");
});

// ---------- created ----------

testCase("C1", "created tăng unreadCount lên 1", () => {
  const next = applyStoreCreated({ unreadCount: 4 });
  eq(next, { unreadCount: 5 }, "4 + 1 = 5");
});

// ---------- read ----------

testCase("R1", "read với wasUnread=true giảm 1", () => {
  const next = applyStoreRead({ unreadCount: 4 }, { wasUnread: true });
  eq(next, { unreadCount: 3 }, "4 - 1 = 3");
});

testCase("R2", "read với wasUnread=false KHÔNG giảm", () => {
  const next = applyStoreRead({ unreadCount: 4 }, { wasUnread: false });
  eq(next, { unreadCount: 4 }, "giữ nguyên 4");
});

testCase("R3", "read không tạo count âm", () => {
  const next = applyStoreRead({ unreadCount: 0 }, { wasUnread: true });
  eq(next, { unreadCount: 0 }, "clamp về 0");
});

// ---------- readAll ----------

testCase("A1", "readAll reset về 0", () => {
  const next = applyStoreReadAll({ unreadCount: 99 });
  eq(next, { unreadCount: 0 }, "reset về 0");
});

// ---------- list events ----------

testCase("L1", "list event 'created' prepend item", () => {
  const items = [
    { id: "a", read: false },
    { id: "b", read: false },
  ];
  const result = applyListEvent(items, {
    kind: "created",
    notification: { id: "c", read: false },
  });
  eq(result.map((n) => n.id), ["c", "a", "b"], "c phải ở đầu");
});

testCase("L2", "list event 'created' với id trùng KHÔNG thêm", () => {
  const items = [{ id: "a", read: false }];
  const result = applyListEvent(items, {
    kind: "created",
    notification: { id: "a", read: false },
  });
  eq(result.length, 1, "không trùng");
});

testCase("L3", "list event 'read' đánh dấu 1 item đã đọc", () => {
  const items = [
    { id: "a", read: false },
    { id: "b", read: false },
  ];
  const result = applyListEvent(items, { kind: "read", id: "b" });
  eq(result, [
    { id: "a", read: false },
    { id: "b", read: true },
  ], "chỉ b đổi");
});

testCase("L4", "list event 'readAll' đánh dấu tất cả đã đọc", () => {
  const items = [
    { id: "a", read: false },
    { id: "b", read: true },
    { id: "c", read: false },
  ];
  const result = applyListEvent(items, { kind: "readAll" });
  assert(result.every((n) => n.read === true), "tất cả phải read:true");
  assert(result.length === 3, "giữ nguyên độ dài");
});

testCase("L5", "list event 'created' produce item mới với read=false", () => {
  const items: { id: string; read: boolean }[] = [];
  const result = applyListEvent(items, {
    kind: "created",
    notification: { id: "x", read: false },
  });
  eq(result, [{ id: "x", read: false }], "thêm 1");
});

testCase("L6", "list event không mutate input", () => {
  const items = [{ id: "a", read: false }];
  const snapshot = [{ id: "a", read: false }];
  applyListEvent(items, { kind: "read", id: "a" });
  eq(items, snapshot, "input không đổi");
});

console.log(`\n${passed}/${total} test cases passed.`);

if (passed !== total) {
  process.exit(1);
}

/**
 * Suppress Ant Design + Turbopack warnings
 * This must be imported before any Ant Design components
 */

"use client";

// Đăng ký dayjs locale `vi` sớm để Antd DatePicker nhận weekStart = 1 (Thứ 2)
// và hiển thị header tuần theo T2..CN thay vì CN..T7.
import "dayjs/locale/vi";

// Suppress "useForm instance not connected" warning from Turbopack
const originalWarning = console.error;
console.error = (...args: unknown[]) => {
  const message = args[0];
  if (typeof message === "string") {
    // Ant Design / rc-form: Turbopack re-mount flakiness
    if (message.includes("Instance created by `useForm` is not connected")) {
      return;
    }
    // Ant Design: Static message API without App context
    if (message.includes("Static function can not consume context like dynamic theme")) {
      return;
    }
    // Next.js DevTools: IndexedDB persistence (dev-only, benign)
    if (
      message.includes("Persisting failed") ||
      message.includes("Compaction failed") ||
      message.includes("Another write batch or compaction is already active")
    ) {
      return;
    }
    // Ant Design: Deprecation warnings that Turbopack promotes to console.error
    if (
      message.includes("is deprecated") ||
      message.includes("[antd:")
    ) {
      return;
    }
  }
  originalWarning.apply(console, args);
};

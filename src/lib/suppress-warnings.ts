/**
 * Suppress Ant Design + Turbopack warnings
 * This must be imported before any Ant Design components
 */

"use client";

// Suppress "useForm instance not connected" warning from Turbopack
const originalWarning = console.error;
console.error = (...args: unknown[]) => {
  const message = args[0];
  if (typeof message === "string") {
    // Ant Design / rc-form: Turbopack re-mount flakiness
    if (message.includes("Instance created by `useForm` is not connected")) {
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
  }
  originalWarning.apply(console, args);
};

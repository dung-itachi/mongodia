/**
 * Toast/Notification Component (Sprint 3.1 - Complete UI Kit)
 *
 * Wrapper for Ant Design message.
 */

import { message } from "antd";

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

export type ToastOptions = {
  type: ToastType;
  content: string;
  duration?: number;
};

let toastInstance: ReturnType<typeof message.useMessage>[0] | null = null;

export function setToastInstance(
  instance: ReturnType<typeof message.useMessage>[0]
) {
  toastInstance = instance;
}

export function showToast(options: ToastOptions): void {
  const { type, content, duration = 3 } = options;

  if (toastInstance) {
    toastInstance[type](content);
  } else {
    const msg = message[type];
    msg(content, duration);
  }
}

export const toast = {
  success: (content: string, duration?: number) =>
    showToast({ type: "success", content, duration }),
  error: (content: string, duration?: number) =>
    showToast({ type: "error", content, duration }),
  info: (content: string, duration?: number) =>
    showToast({ type: "info", content, duration }),
  warning: (content: string, duration?: number) =>
    showToast({ type: "warning", content, duration }),
  loading: (content: string, duration?: number) =>
    showToast({ type: "loading", content, duration }),
};

export default toast;
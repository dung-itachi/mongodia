/**
 * Custom Toast/Notification Component (Sprint 3.1 - Complete UI Kit)
 *
 * Simple toast implementation without Ant Design dependencies.
 * Compatible with Turbopack.
 */

"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warning" | "loading";

interface Toast {
  id: string;
  type: ToastType;
  content: string;
  duration: number;
}

interface ToastContextValue {
  toast: (type: ToastType, content: string, duration?: number) => void;
}

// Toast Context
let toastFn: ((type: ToastType, content: string, duration?: number) => void) | null = null;

export const registerToast = (fn: (type: ToastType, content: string, duration?: number) => void) => {
  toastFn = fn;
};

export const toast = {
  success: (content: string, duration = 3) => toastFn?.("success", content, duration),
  error: (content: string, duration = 3) => toastFn?.("error", content, duration),
  info: (content: string, duration = 3) => toastFn?.("info", content, duration),
  warning: (content: string, duration = 3) => toastFn?.("warning", content, duration),
  loading: (content: string, duration = 0) => toastFn?.("loading", content, duration),
};

// Toast Container Component
function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, content: string, duration = 3) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, content, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Register toast function
  useEffect(() => {
    registerToast(addToast);
  }, [addToast]);

  // Auto-remove toasts
  useEffect(() => {
    toasts.forEach((t) => {
      if (t.duration > 0) {
        const timer = setTimeout(() => removeToast(t.id), t.duration * 1000);
        return () => clearTimeout(timer);
      }
    });
  }, [toasts, removeToast]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success": return "✓";
      case "error": return "✕";
      case "warning": return "⚠";
      case "loading": return "⟳";
      default: return "ℹ";
    }
  };

  const getColor = (type: ToastType) => {
    switch (type) {
      case "success": return "#52c41a";
      case "error": return "#ff4d4f";
      case "warning": return "#faad14";
      case "loading": return "#1677ff";
      default: return "#1677ff";
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      top: 24,
      right: 24,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            padding: "12px 16px",
            background: "#fff",
            border: "1px solid #d9d9d9",
            borderRadius: 8,
            boxShadow: "0 6px 16px 0 rgba(0, 0, 0, 0.08)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            minWidth: 280,
            maxWidth: 400,
            animation: "toastSlideIn 0.2s ease-out",
          }}
        >
          <span style={{
            fontSize: 18,
            color: getColor(t.type),
            fontWeight: "bold",
          }}>
            {getIcon(t.type)}
          </span>
          <span style={{ flex: 1, color: "#000000d9" }}>{t.content}</span>
          <button
            onClick={() => removeToast(t.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#00000073",
              fontSize: 12,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
      ))}
      <style>{`
        @keyframes toastSlideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default ToastContainer;

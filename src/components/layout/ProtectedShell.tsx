"use client";

import { ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import NotificationProvider from "@/providers/NotificationProvider";

type Props = {
  children: ReactNode;
};

/**
 * Client-side wrapper that lives inside the protected server layout.
 *
 * Hosts:
 *   - NotificationProvider — opens the SSE stream, syncs the badge,
 *     invalidates react-query cache on realtime events.
 *   - react-toastify container — used by the notification toast helper.
 */
export default function ProtectedShell({ children }: Props) {
  return (
    <NotificationProvider>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={6000}
        newestOnTop
        pauseOnHover
        theme="light"
      />
    </NotificationProvider>
  );
}

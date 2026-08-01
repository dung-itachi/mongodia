"use client";

import { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

type Props = {
  children: ReactNode;
};

/**
 * AppShell — primary layout for authenticated (admin) routes.
 *
 * Mirrors the original HTML's `.main` + `.content` shell from
 * `layout.css`. Pure layout — no auth gate, no business logic.
 *
 * Phase A.1 (CSS Refactor):
 *  - Uses `className` only (layout.css owns the visual rules).
 *  - Tailwind is reserved for flex/grid spacing utilities.
 */
export default function AppShell({ children }: Props) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="main">
        <Header />
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

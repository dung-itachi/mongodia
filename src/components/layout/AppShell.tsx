"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

/**
 * Sidebar context — minimal shared state for mobile overlay.
 *
 * Header's `.mob-open` button calls `toggleMobile()` to flip the
 * mobile sidebar in/out. The backdrop and the sidebar are toggled in
 * lock-step (mirror HTML: clicking `.backdrop` calls `closeSB()`).
 *
 * Desktop collapse (`.sb.col`) is owned entirely inside Sidebar.
 */
type SidebarContextValue = {
  toggleMobile: () => void;
  closeMobile: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used inside AppShell");
  }
  return ctx;
}

type Props = {
  children: ReactNode;
};

/**
 * AppShell — primary layout for authenticated (admin) routes.
 *
 * Mirrors the original HTML's `body{display:flex}` + `.main` shell
 * (`layout.css`). The wrapper div is intentionally absent — the body
 * itself is the flex container (the HTML root sets
 * `body{display:flex}` in `globals.css`).
 *
 * JSX hierarchy matches the HTML spec exactly:
 *   body
 *     div.backdrop#bk   (mobile sidebar overlay — sits in <body> per HTML)
 *     aside.sb          (Sidebar)
 *     div.main
 *       header.topbar   (Header — drives mobile sidebar toggle)
 *       main.content    (children)
 *     div.kp#kpop       (key popup — calls history)
 *     div.mo#mo         (modal overlay)
 *       div.modal#moc   (modal content slot)
 *     div.toast#toast   (toast notifications)
 *
 * Phase A.3 (Shell Behavior):
 *  - Sidebar and Header persist across route changes because they live
 *    in the route-group layout `(admin)/layout.tsx`. Only `<main
 *    class="content">` re-renders on navigation.
 *  - Collapse (`.sb.col`) is owned by Sidebar.
 *  - Mobile overlay (`.sb.open` + `.backdrop.show`) is opened by
 *    Header's `.mob-open` button via context, closed by tapping the
 *    backdrop or by Sidebar's `.sb-tg` toggle.
 *
 * Tailwind is not used.
 */
export default function AppShell({ children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const value: SidebarContextValue = {
    toggleMobile: () => setMobileOpen((v) => !v),
    closeMobile: () => setMobileOpen(false),
  };

  return (
    <SidebarContext.Provider value={value}>
      <div
        className={`backdrop ${mobileOpen ? "show" : ""}`}
        id="bk"
        onClick={value.closeMobile}
        aria-hidden="true"
      />
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={value.closeMobile} />
      <div className="main">
        <Header />
        <main className="content">{children}</main>
      </div>
      <div className="kp" id="kpop" />
      <div className="mo" id="mo">
        <div className="modal" id="moc" />
      </div>
      <div className="toast" id="toast" />
    </SidebarContext.Provider>
  );
}
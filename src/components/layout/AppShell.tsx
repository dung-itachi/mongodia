"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

/**
 * Sidebar context — shared state for mobile overlay AND desktop collapse.
 *
 * Header's `.mob-open` button calls `toggleMobile()` to flip the
 * mobile sidebar in/out. The backdrop and the sidebar are toggled in
 * lock-step (mirror HTML: clicking `.backdrop` calls `closeSB()`).
 *
 * Desktop collapse (`.sb.col`) is controlled via the `collapsed` state
 * that lives here in AppShell, passed to Sidebar.
 */
type SidebarContextValue = {
  toggleMobile: () => void;
  closeMobile: () => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggleCollapsed: () => void;
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
 *  - Collapse (`.sb.col`) is owned by AppShell, passed to Sidebar.
 *  - Mobile overlay (`.sb.open` + `.backdrop.show`) is opened by
 *    Header's `.mob-open` button via context, closed by tapping the
 *    backdrop or by Sidebar's `.sb-tg` toggle.
 *
 * Tailwind is not used.
 */
export default function AppShell({ children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const value: SidebarContextValue = {
    toggleMobile: () => setMobileOpen((v) => !v),
    closeMobile: () => setMobileOpen(false),
    collapsed,
    setCollapsed,
    toggleCollapsed: () => setCollapsed((v) => !v),
  };

  // Debug: log mobile state changes
  console.log("[AppShell] mobileOpen:", mobileOpen, "collapsed:", collapsed);

  return (
    <SidebarContext.Provider value={value}>
      <div
        style={{
          display: "flex",
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <div
          className={`backdrop ${mobileOpen ? "show" : ""}`}
          id="bk"
          onClick={value.closeMobile}
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 90,
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? "auto" : "none",
            transition: "opacity 0.25s",
            display: "none", // Only show on mobile via CSS
          }}
        />
        <Sidebar
          mobileOpen={mobileOpen}
          onCloseMobile={value.closeMobile}
          collapsed={collapsed}
          onCollapsedChange={value.setCollapsed}
        />
        <div
          className="main"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <Header />
          <main
            className="content"
            style={{
              flex: 1,
              overflow: "auto",
              padding: "9px 12px 55px",
            }}
          >
            {children}
          </main>
        </div>
        <div className="kp" id="kpop" />
        <div className="mo" id="mo">
          <div className="modal" id="moc" />
        </div>
        <div className="toast" id="toast" />
      </div>
    </SidebarContext.Provider>
  );
}
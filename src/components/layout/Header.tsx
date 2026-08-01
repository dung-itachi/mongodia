"use client";

import { useState } from "react";

import { useSidebar } from "@/components/layout/AppShell";

/**
 * Header — topbar.
 *
 * Visual rules live in `src/styles/header.css` (`.topbar`, `.mob-open`,
 * `.pt`, `.vb`, `.srch`, `.tbr`, `.cnt`). Class names mirror the
 * original HTML 1:1.
 *
 * JSX hierarchy matches the spec:
 *   header.topbar
 *     button.mob-open (svg)
 *     div.pt (span#tT + small#tS)
 *     div#tB.vb vb-b
 *     div.srch (svg + input#sq)
 *     div.tbr > div.cnt (span#cntLbl + b#tc)
 *
 * Tailwind is not used here. No inline styles.
 *
 * Phase A.3: `.mob-open` is wired to AppShell's `openMobile()` so the
 * sidebar slides in on mobile when the button is tapped.
 */
export default function Header() {
  const { openMobile } = useSidebar();
  const [pageTitle] = useState("Mongolia CRM");
  const [pageSub] = useState("Phase A.2");
  const [badgeText] = useState("Phase A");
  const [badgeVariant] = useState<"vb-b" | "vb-g" | "vb-a" | "vb-p">("vb-b");
  const [countLabel] = useState("SL:");
  const [count] = useState(0);

  return (
    <header className="topbar">
      <button
        type="button"
        className="mob-open"
        aria-label="Open sidebar"
        onClick={openMobile}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      <div className="pt">
        <span id="tT">{pageTitle}</span>
        <small id="tS">{pageSub}</small>
      </div>

      <div id="tB" className={`vb ${badgeVariant}`}>
        {badgeText}
      </div>

      <div className="srch">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input id="sq" type="text" disabled />
      </div>

      <div className="tbr">
        <div className="cnt">
          <span id="cntLbl">{countLabel}</span> <b id="tc">{count}</b>
        </div>
      </div>
    </header>
  );
}
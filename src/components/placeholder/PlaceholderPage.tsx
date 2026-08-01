"use client";

import { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  /**
   * Small status badge shown next to the title (e.g. "Coming Soon").
   * Plain text — render as `<small>` so styling comes from card.css.
   */
  badge?: string;
  children?: ReactNode;
};

/**
 * PlaceholderPage — a small info card. Mirrors the HTML spec
 * `<div class="card"><div class="card-h"><h2>…</h2>…</div>
 * <div class="card-body">…</div></div>` exactly.
 *
 * Phase A.3 behaviour:
 *  - Card is naturally sized (no full-height flex stretch).
 *  - No developer roadmap text (Sprint X) is shown to end users.
 *  - Badge is optional short label, e.g. "Coming Soon".
 *  - Body may be empty if no description is provided.
 *
 * Visual rules live in `src/styles/card.css` (`.card`, `.card-h`,
 * `.card-body`). No inline styles, no business logic, no API calls.
 */
export default function PlaceholderPage({
  title,
  description,
  badge,
  children,
}: Props) {
  return (
    <div className="card">
      <div className="card-h">
        <h2>{title}</h2>
        {badge && <small>{badge}</small>}
      </div>
      {(description || children) && (
        <div className="card-body">
          {description && <p>{description}</p>}
          {children}
        </div>
      )}
    </div>
  );
}
/**
 * StatGrid Component (Sprint 3.1 - Complete UI Kit)
 *
 * Responsive grid for stat cards.
 */

import { ReactNode } from "react";

export type StatGridProps = {
  /** Stat card children */
  children: ReactNode;
  /** Number of columns on desktop */
  columns?: number;
  /** Gap between cards */
  gap?: number;
  /** Additional class names */
  className?: string;
};

export default function StatGrid({
  children,
  columns = 4,
  gap = 16,
  className = "",
}: StatGridProps) {
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
      }}
    >
      {children}
    </div>
  );
}

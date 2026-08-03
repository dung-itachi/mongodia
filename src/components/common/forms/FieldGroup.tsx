/**
 * FieldGroup Component (Sprint 3.1 - Complete UI Kit)
 *
 * Group multiple form fields in a row.
 */

import { ReactNode } from "react";

export type FieldGroupProps = {
  /** Children fields */
  children: ReactNode;
  /** Number of columns */
  columns?: number;
  /** Gap between fields */
  gutter?: number;
  /** Additional class name */
  className?: string;
};

export default function FieldGroup({
  children,
  columns = 2,
  gutter = 16,
  className = "",
}: FieldGroupProps) {
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: gutter,
      }}
    >
      {children}
    </div>
  );
}

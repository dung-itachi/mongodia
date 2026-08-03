/**
 * PageContainer Component (Sprint 3.1 - Complete UI Kit)
 *
 * Standard page layout wrapper.
 */

import { ReactNode } from "react";

export type PageContainerProps = {
  /** Page content */
  children: ReactNode;
  /** Additional class names */
  className?: string;
  /** Page padding */
  padding?: boolean;
};

export default function PageContainer({
  children,
  className = "",
  padding = true,
}: PageContainerProps) {
  return (
    <div
      className={className}
      style={{
        padding: padding ? 16 : 0,
      }}
    >
      {children}
    </div>
  );
}

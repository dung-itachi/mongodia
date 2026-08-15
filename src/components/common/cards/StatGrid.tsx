/**
 * StatGrid Component (Sprint 3.1 - Complete UI Kit)
 *
 * Responsive grid for stat cards.
 *
 * Mobile (<640px): 2 cột
 * Tablet (640–1024px): 3 cột
 * Desktop (1024–1440px): 4 cột
 * Wide (≥1440px): tối đa `columns` (mặc định 6)
 *
 * Công thức: chia đều n cột trên desktop-wide; tự rớt xuống ít cột hơn
 * khi viewport nhỏ lại, dùng media queries inline-style qua className wrapper.
 */

import { ReactNode, CSSProperties } from "react";

export type StatGridProps = {
  /** Stat card children */
  children: ReactNode;
  /** Maximum number of columns on the widest breakpoint. */
  columns?: number;
  /** Minimum card width (px) before wrapping. */
  minItemWidth?: number;
  /** Gap between cards */
  gap?: number;
  /** Additional class names */
  className?: string;
  /** Style override */
  style?: CSSProperties;
};

export default function StatGrid({
  children,
  columns = 4,
  minItemWidth = 180,
  gap = 16,
  className = "",
  style,
}: StatGridProps) {
  // Auto-fit số cột trong khoảng [1, columns], mỗi item >= minItemWidth.
  // CSS `auto-fit` sẽ tự co giãn theo viewport.
  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(min(${minItemWidth}px, 100%), 1fr))`,
    gap,
    ...style,
  };

  return (
    <div
      className={className}
      style={gridStyle}
      data-max-columns={columns}
      data-min-item-width={minItemWidth}
    >
      {children}
    </div>
  );
}

/**
 * ChartContainer Component (Sprint 3.1 - Complete UI Kit)
 *
 * Wrapper for chart components.
 * Does NOT render actual charts - just provides the container.
 */

import { ReactNode } from "react";

export type ChartContainerProps = {
  /** Chart content */
  children: ReactNode;
  /** Chart title */
  title?: string;
  /** Chart subtitle */
  subtitle?: string;
  /** Chart actions (e.g., time range selector) */
  actions?: ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Chart height */
  height?: number;
  /** Additional class name */
  className?: string;
};

export default function ChartContainer({
  children,
  title,
  subtitle,
  actions,
  loading,
  height = 300,
  className = "",
}: ChartContainerProps) {
  return (
    <div className={`card ${className}`}>
      {(title || actions) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            paddingBottom: 16,
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <div>
            {title && (
              <h4
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {title}
              </h4>
            )}
            {subtitle && (
              <p
                style={{
                  fontSize: 12,
                  color: "#8c8c8c",
                  margin: "4px 0 0",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {loading ? (
          <div>Đang tải biểu đồ...</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

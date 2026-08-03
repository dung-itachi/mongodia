/**
 * SectionTitle Component (Sprint 3.1 - Complete UI Kit)
 *
 * Standard section title with optional subtitle and actions.
 */

import { ReactNode } from "react";

export type SectionTitleProps = {
  /** Title text */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Optional actions on the right */
  actions?: ReactNode;
  /** Title level (for semantic HTML) */
  level?: 1 | 2 | 3 | 4 | 5;
  /** Show divider below title */
  showDivider?: boolean;
};

export default function SectionTitle({
  title,
  subtitle,
  actions,
  level = 3,
  showDivider = true,
}: SectionTitleProps) {
  const getFontSize = () => {
    if (level === 2) return 18;
    if (level === 3) return 16;
    return 14;
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: getFontSize(),
              fontWeight: 600,
              color: "#262626",
              margin: 0,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              style={{
                fontSize: 14,
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
      {showDivider && (
        <div
          style={{
            marginTop: 8,
            height: 1,
            backgroundColor: "#f0f0f0",
          }}
        />
      )}
    </div>
  );
}
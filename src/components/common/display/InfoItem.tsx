/**
 * InfoItem Component (Sprint 3.1 - Complete UI Kit)
 *
 * Display a label-value pair.
 */

import { ReactNode } from "react";

export type InfoItemProps = {
  /** Label text */
  label: string;
  /** Value to display */
  value?: ReactNode;
  /** Optional value color */
  valueColor?: string;
  /** Optional label color */
  labelColor?: string;
  /** Span full width */
  fullWidth?: boolean;
};

export default function InfoItem({
  label,
  value,
  valueColor = "#262626",
  labelColor = "#8c8c8c",
  fullWidth = false,
}: InfoItemProps) {
  return (
    <div
      style={{
        display: fullWidth ? "flex" : "inline-flex",
        flexDirection: "column",
        gap: 4,
        flex: fullWidth ? 1 : undefined,
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: labelColor,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 14,
          color: valueColor,
          fontWeight: 500,
        }}
      >
        {value ?? "-"}
      </span>
    </div>
  );
}

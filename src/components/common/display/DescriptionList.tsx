/**
 * DescriptionList Component (Sprint 3.1 - Complete UI Kit)
 *
 * Display a list of label-value pairs in a grid layout.
 */

import { ReactNode } from "react";
import InfoItem, { InfoItemProps } from "./InfoItem";

export type DescriptionListProps = {
  /** List of items */
  items: {
    label: string;
    value?: ReactNode;
    span?: number;
  }[];
  /** Number of columns */
  columns?: number;
  /** Gap between items */
  gutter?: number;
  /** Optional title */
  title?: string;
  /** Optional actions */
  actions?: ReactNode;
  /** Size variant */
  size?: "small" | "default";
};

export default function DescriptionList({
  items,
  columns = 3,
  gutter = 24,
  title,
  actions,
  size = "default",
}: DescriptionListProps) {
  return (
    <div>
      {(title || actions) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
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
          {actions}
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: gutter,
        }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              gridColumn:
                item.span && item.span > 1
                  ? `span ${item.span}`
                  : undefined,
            }}
          >
            <InfoItem
              label={item.label}
              value={item.value}
              labelColor={size === "small" ? "#8c8c8c" : "#8c8c8c"}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

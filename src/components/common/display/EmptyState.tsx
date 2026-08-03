/**
 * EmptyState Component (Sprint 3.1 - Complete UI Kit)
 *
 * Display empty state with icon, title, description and optional action.
 */

import { Button } from "antd";
import { ReactNode } from "react";

export type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      {icon && (
        <div
          style={{
            fontSize: 48,
            color: "#d9d9d9",
            marginBottom: 16,
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "#262626",
          margin: "0 0 8px",
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: 14,
            color: "#8c8c8c",
            margin: "0 0 16px",
            maxWidth: 300,
          }}
        >
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

/**
 * Metric Component (Sprint 3.1 - Complete UI Kit)
 *
 * Display a metric value with trend indicator.
 */

import { ReactNode } from "react";

export type MetricTrend = "up" | "down" | "neutral";

export type MetricProps = {
  /** Metric label */
  label: string;
  /** Current value */
  value: string | number;
  /** Previous value for comparison (optional) */
  previousValue?: string | number;
  /** Trend direction */
  trend?: MetricTrend;
  /** Trend value (e.g., "+10%", "-5%") */
  trendValue?: string | number;
  /** Icon or indicator */
  icon?: ReactNode;
  /** Value color */
  valueColor?: string;
  /** Label color */
  labelColor?: string;
  /** Compact mode */
  compact?: boolean;
};

const trendColorMap: Record<MetricTrend, string> = {
  up: "#52c41a",
  down: "#ff4d4f",
  neutral: "#8c8c8c",
};

export default function Metric({
  label,
  value,
  trend,
  trendValue,
  icon,
  valueColor = "#262626",
  labelColor = "#8c8c8c",
  compact = false,
}: MetricProps) {
  const trendColor = trend ? trendColorMap[trend] : undefined;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: compact ? "row" : "column",
        alignItems: compact ? "center" : "flex-start",
        gap: compact ? 8 : 4,
      }}
    >
      <span
        style={{
          fontSize: compact ? 12 : 14,
          color: labelColor,
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: compact ? 20 : 24,
            fontWeight: 600,
            color: valueColor,
            lineHeight: 1.2,
          }}
        >
          {value}
        </span>
        {icon && (
          <span style={{ fontSize: compact ? 16 : 20 }}>{icon}</span>
        )}
      </div>
      {trend && trendValue && (
        <span
          style={{
            fontSize: 12,
            color: trendColor,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          {trend === "up" ? "↑" : trend === "down" ? "↓" : ""}{" "}
          {trendValue}
        </span>
      )}
    </div>
  );
}

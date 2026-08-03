/**
 * StatCard Component (Sprint 3.1 - Complete UI Kit)
 *
 * Display a single statistic with optional trend indicator.
 */

import { Spin } from "antd";
import { ReactNode } from "react";

export type StatTrend = "up" | "down" | "neutral";

export type StatColor =
  | "blue"
  | "green"
  | "red"
  | "orange"
  | "purple"
  | "default";

export type StatCardProps = {
  /** Card title */
  title: string;
  /** Stat value to display */
  value: string | number;
  /** Icon to display */
  icon?: ReactNode;
  /** Color theme */
  color?: StatColor;
  /** Loading state */
  loading?: boolean;
  /** Trend indicator */
  trend?: {
    value: number | string;
    direction: StatTrend;
  };
  /** Optional suffix */
  suffix?: string;
  /** Optional prefix */
  prefix?: string;
};

const colorMap: Record<StatColor, { bg: string; text: string; border: string }> = {
  blue: { bg: "#e6f7ff", text: "#1890ff", border: "#91d5ff" },
  green: { bg: "#f6ffed", text: "#52c41a", border: "#b7eb8f" },
  red: { bg: "#fff1f0", text: "#ff4d4f", border: "#ffccc7" },
  orange: { bg: "#fff7e6", text: "#fa8c16", border: "#ffd591" },
  purple: { bg: "#f9f0ff", text: "#722ed1", border: "#d3adf7" },
  default: { bg: "#fafafa", text: "#595959", border: "#d9d9d9" },
};

export default function StatCard({
  title,
  value,
  icon,
  color = "default",
  loading,
  trend,
  suffix,
  prefix,
}: StatCardProps) {
  const colors = colorMap[color];

  const trendColor =
    trend?.direction === "up"
      ? "#52c41a"
      : trend?.direction === "down"
        ? "#ff4d4f"
        : "#8c8c8c";

  const trendIcon =
    trend?.direction === "up" ? "↑" : trend?.direction === "down" ? "↓" : "";

  if (loading) {
    return (
      <div className="card" style={{ minHeight: 140 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 100,
          }}
        >
          <Spin />
        </div>
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        borderLeft: `4px solid ${colors.border}`,
        minHeight: 140,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              color: "#8c8c8c",
              marginBottom: 8,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "#262626",
              lineHeight: 1.2,
            }}
          >
            {prefix}
            {value}
            {suffix}
          </div>
          {trend && (
            <div
              style={{
                fontSize: 12,
                color: trendColor,
                marginTop: 8,
              }}
            >
              {trendIcon} {trend.value}
            </div>
          )}
        </div>
        {icon && (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              backgroundColor: colors.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.text,
              fontSize: 24,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

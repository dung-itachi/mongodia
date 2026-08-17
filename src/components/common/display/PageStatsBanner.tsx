/**
 * PageStatsBanner Component
 *
 * Displays key metrics in a visually appealing banner with icons and colors.
 * Each stat shows: icon, value, and label.
 */

import { CSSProperties, ReactNode } from "react";
import { Spin } from "antd";

export type StatItemColor =
  | "blue"
  | "green"
  | "red"
  | "orange"
  | "purple"
  | "cyan"
  | "gold";

export type PageStatItem = {
  /** Unique key for the stat */
  key: string;
  /** Display value */
  value: number | string;
  /** Label text */
  label: string;
  /** Icon component */
  icon: ReactNode;
  /** Color theme */
  color?: StatItemColor;
  /** Optional suffix (e.g., "%", "+") */
  suffix?: string;
  /** Optional prefix (e.g., "đ", "$") */
  prefix?: string;
};

export type PageStatsBannerProps = {
  /** Array of stat items to display */
  stats: PageStatItem[];
  /** Loading state */
  loading?: boolean;
  /** Custom container style */
  style?: CSSProperties;
  /** Gap between stat items */
  gap?: number;
  /** Minimum width for each stat item */
  minItemWidth?: number;
};

const colorMap: Record<StatItemColor, { bg: string; border: string; icon: string }> = {
  blue: { bg: "#e6f7ff", border: "#1890ff", icon: "#1890ff" },
  green: { bg: "#f6ffed", border: "#52c41a", icon: "#52c41a" },
  red: { bg: "#fff1f0", border: "#ff4d4f", icon: "#ff4d4f" },
  orange: { bg: "#fff7e6", border: "#fa8c16", icon: "#fa8c16" },
  purple: { bg: "#f9f0ff", border: "#722ed1", icon: "#722ed1" },
  cyan: { bg: "#e6fffb", border: "#13c2c2", icon: "#13c2c2" },
  gold: { bg: "#fffbe6", border: "#faad14", icon: "#faad14" },
};

function formatNumber(value: number | string): string {
  if (typeof value === "string") return value;
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + "M";
  }
  if (value >= 1000) {
    return value.toLocaleString("vi-VN");
  }
  return value.toString();
}

export default function PageStatsBanner({
  stats,
  loading = false,
  style,
  gap = 16,
  minItemWidth = 180,
}: PageStatsBannerProps) {
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 120,
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #f0f0f0",
          ...style,
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (stats.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}px, 1fr))`,
        gap,
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #f0f0f0",
        padding: 20,
        ...style,
      }}
    >
      {stats.map((stat) => {
        const colors = colorMap[stat.color ?? "blue"];

        return (
          <div
            key={stat.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px 20px",
              background: colors.bg,
              borderRadius: 10,
              borderLeft: `4px solid ${colors.border}`,
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              cursor: "default",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                flexShrink: 0,
              }}
            >
              {stat.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: colors.icon,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {stat.prefix}
                {formatNumber(stat.value)}
                {stat.suffix}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#595959",
                  marginTop: 4,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {stat.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

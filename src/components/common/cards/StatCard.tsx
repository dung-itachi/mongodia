/**
 * StatCard Component (Sprint 3.1 - Complete UI Kit)
 *
 * Display a single statistic with optional trend indicator.
 */

import { Spin, Tooltip } from "antd";
import { CSSProperties, ReactNode } from "react";

export type StatTrend = "up" | "down" | "neutral";

export type StatSize = "default" | "compact";

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
  /** Optional click handler for drill-down */
  onClick?: () => void;
  /** Size variant: default (140px) or compact (88px). */
  size?: StatSize;
  /** Click handler for the currency icon — used on revenue cards to toggle MNT/VND. */
  onCurrencyToggle?: () => void;
  /** Current display currency — used for tooltip text. */
  displayCurrency?: "MNT" | "VND";
};

const colorMap: Record<StatColor, { bg: string; text: string; border: string }> = {
  blue: { bg: "#e6f7ff", text: "#1890ff", border: "#91d5ff" },
  green: { bg: "#f6ffed", text: "#52c41a", border: "#b7eb8f" },
  red: { bg: "#fff1f0", text: "#ff4d4f", border: "#ffccc7" },
  orange: { bg: "#fff7e6", text: "#fa8c16", border: "#ffd591" },
  purple: { bg: "#f9f0ff", text: "#722ed1", border: "#d3adf7" },
  default: { bg: "#fafafa", text: "#595959", border: "#d9d9d9" },
};

const sizeMap: Record<
  StatSize,
  {
    minHeight: number;
    padding: string;
    titleSize: number;
    titleMb: number;
    valueSize: number;
    trendSize: number;
    trendMt: number;
    iconSize: number;
    iconBox: number;
  }
> = {
  default: {
    minHeight: 140,
    padding: "16px",
    titleSize: 14,
    titleMb: 8,
    valueSize: 28,
    trendSize: 12,
    trendMt: 8,
    iconSize: 24,
    iconBox: 48,
  },
  compact: {
    minHeight: 88,
    padding: "12px 14px",
    titleSize: 12,
    titleMb: 2,
    valueSize: 20,
    trendSize: 11,
    trendMt: 4,
    iconSize: 16,
    iconBox: 32,
  },
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
  onClick,
  size = "default",
  onCurrencyToggle,
  displayCurrency,
}: StatCardProps) {
  const colors = colorMap[color];
  const sz = sizeMap[size];

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
      <div className="card" style={{ minHeight: sz.minHeight }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: sz.minHeight - 32,
          }}
        >
          <Spin size={size === "compact" ? "small" : "default"} />
        </div>
      </div>
    );
  }

  const wrapStyle: CSSProperties = {
    borderLeft: `4px solid ${colors.border}`,
    minHeight: sz.minHeight,
    padding: sz.padding,
    cursor: onClick ? "pointer" : "default",
    transition: "box-shadow 0.2s ease",
  };

  return (
    <div
      className="card"
      style={wrapStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        }
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: sz.titleSize,
              color: "#8c8c8c",
              marginBottom: sz.titleMb,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: sz.valueSize,
              fontWeight: 600,
              color: "#262626",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {prefix}
            {value}
            {suffix}
          </div>
          {trend && (
            <div
              style={{
                fontSize: sz.trendSize,
                color: trendColor,
                marginTop: sz.trendMt,
              }}
            >
              {trendIcon} {trend.value}
            </div>
          )}
        </div>
        {icon && (
          <Tooltip
            title={
              onCurrencyToggle
                ? displayCurrency === "MNT"
                  ? "Click để hiển thị VND"
                  : "Click để hiển thị MNT"
                : undefined
            }
          >
            <div
              role={onCurrencyToggle ? "button" : undefined}
              tabIndex={onCurrencyToggle ? 0 : undefined}
              aria-label={onCurrencyToggle ? "Đổi đơn vị tiền tệ" : undefined}
              onClick={(e) => {
                if (!onCurrencyToggle) return;
                e.stopPropagation();
                onCurrencyToggle();
              }}
              onKeyDown={(e) => {
                if (!onCurrencyToggle) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onCurrencyToggle();
                }
              }}
              style={{
                width: sz.iconBox,
                height: sz.iconBox,
                borderRadius: size === "compact" ? 6 : 8,
                backgroundColor: colors.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.text,
                fontSize: sz.iconSize,
                flexShrink: 0,
                cursor: onCurrencyToggle ? "pointer" : "default",
              }}
            >
              {icon}
            </div>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

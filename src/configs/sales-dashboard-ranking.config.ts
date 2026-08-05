/**
 * ==================================================
 * SALES DASHBOARD RANKING CONFIG
 * ==================================================
 *
 * Sprint 8.2 — Sales Dashboard
 *
 * Configuration for dashboard rankings.
 */

export type RankingType = "revenue" | "orders" | "customers";

export type RankingConfig = {
  key: RankingType;
  label: string;
  icon: string;
  color: string;
  format: "currency" | "number";
};

export const RANKING_TYPES: RankingConfig[] = [
  {
    key: "revenue",
    label: "Top doanh thu",
    icon: "💰",
    color: "#1890ff",
    format: "currency",
  },
  {
    key: "orders",
    label: "Top số đơn",
    icon: "📦",
    color: "#52c41a",
    format: "number",
  },
  {
    key: "customers",
    label: "Top khách hàng",
    icon: "👥",
    color: "#722ed1",
    format: "number",
  },
];

export const RANKING_COLORS = {
  gold: "#faad14",
  silver: "#8c8c8c",
  bronze: "#d48806",
  default: "#1890ff",
};

export function getRankColor(rank: number): string {
  switch (rank) {
    case 1:
      return RANKING_COLORS.gold;
    case 2:
      return RANKING_COLORS.silver;
    case 3:
      return RANKING_COLORS.bronze;
    default:
      return RANKING_COLORS.default;
  }
}

export function formatRankingValue(
  value: number,
  type: RankingType
): string {
  if (type === "revenue") {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString("vi-VN");
  }

  return value.toLocaleString("vi-VN");
}

/**
 * RevenueChart Component (Sprint 4.2 - Dashboard Charts)
 *
 * Visualizes revenue trend over time as a bar/line chart.
 * Uses ChartContainer from UI Kit.
 */

import { ChartContainer } from "@/components/common";
import type { RevenueChartItem } from "@/types/dashboard-chart";
import { formatCurrency, formatCompact } from "@/lib/format";

export type RevenueChartProps = {
  data: RevenueChartItem[];
  loading?: boolean;
};

export default function RevenueChart({ data, loading }: RevenueChartProps) {
  const maxRevenue = data.reduce(
    (max, item) => (item.revenue > max ? item.revenue : max),
    0
  );

  return (
    <ChartContainer
      title="Doanh thu"
      subtitle="Doanh thu theo tháng"
      loading={loading}
      height={280}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 8,
          padding: "0 8px",
        }}
      >
        {data.map((item) => {
          const heightPercent =
            maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
          return (
            <div
              key={item.date}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#8c8c8c",
                  fontWeight: 500,
                }}
              >
                {formatCompact(item.revenue)}
              </div>
              <div
                style={{
                  width: "100%",
                  height: `${heightPercent}%`,
                  minHeight: 4,
                  backgroundColor: "#1890ff",
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.3s ease",
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  color: "#595959",
                  marginTop: 4,
                }}
              >
                {item.date}
              </div>
            </div>
          );
        })}
      </div>
    </ChartContainer>
  );
}
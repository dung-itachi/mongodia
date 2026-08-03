/**
 * TopSaleChart Component (Sprint 4.2 - Dashboard Charts)
 *
 * Top performers ranked by sales.
 * Uses ChartContainer from UI Kit.
 */

import { ChartContainer } from "@/components/common";
import type { TopSaleItem } from "@/types/dashboard-chart";
import { formatCurrency, formatCompact } from "@/lib/format";

export type TopSaleChartProps = {
  data: TopSaleItem[];
  loading?: boolean;
};

export default function TopSaleChart({ data, loading }: TopSaleChartProps) {
  const maxTotal = data.reduce(
    (max, item) => (item.total > max ? item.total : max),
    0
  );

  return (
    <ChartContainer
      title="Top Sale"
      subtitle="Top 5 nhân viên kinh doanh"
      loading={loading}
      height={280}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {data.map((item, index) => {
          const widthPercent =
            maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;

          return (
            <div
              key={item.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  backgroundColor:
                    index === 0
                      ? "#faad14"
                      : index === 1
                        ? "#bfbfbf"
                        : index === 2
                          ? "#d4880d"
                          : "#f0f0f0",
                  color: index < 3 ? "#fff" : "#595959",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </span>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: 13, color: "#262626" }}>
                    {item.name}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "#595959",
                      fontWeight: 500,
                    }}
                  >
                    {formatCompact(item.total)} ₫
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    width: "100%",
                    backgroundColor: "#f0f0f0",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${widthPercent}%`,
                      backgroundColor: "#52c41a",
                      borderRadius: 3,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ChartContainer>
  );
}
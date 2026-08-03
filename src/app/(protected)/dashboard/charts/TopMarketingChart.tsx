/**
 * TopMarketingChart Component (Sprint 4.2 - Dashboard Charts)
 *
 * Top marketing performers by lead count.
 * Uses ChartContainer from UI Kit.
 */

import { ChartContainer } from "@/components/common";
import type { TopMarketingItem } from "@/types/dashboard-chart";
import { formatNumber } from "@/lib/format";

export type TopMarketingChartProps = {
  data: TopMarketingItem[];
  loading?: boolean;
};

export default function TopMarketingChart({ data, loading }: TopMarketingChartProps) {
  const maxCount = data.reduce(
    (max, item) => (item.count > max ? item.count : max),
    0
  );

  return (
    <ChartContainer
      title="Top Marketing"
      subtitle="Top 5 nhân viên marketing"
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
            maxCount > 0 ? (item.count / maxCount) * 100 : 0;

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
                      fontSize: 13,
                      color: "#262626",
                      fontWeight: 600,
                    }}
                  >
                    {formatNumber(item.count)}
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
                      backgroundColor: "#722ed1",
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
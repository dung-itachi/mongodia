/**
 * LeadSourceChart Component (Sprint 4.2 - Dashboard Charts)
 *
 * Visualizes lead source distribution as a horizontal bar chart.
 * Uses ChartContainer from UI Kit.
 */

import { ChartContainer } from "@/components/common";
import type { LeadSourceChartItem } from "@/types/dashboard-chart";
import { formatNumber } from "@/lib/format";

export type LeadSourceChartProps = {
  data: LeadSourceChartItem[];
  loading?: boolean;
};

const SOURCE_COLORS = [
  "#1890ff",
  "#13c2c2",
  "#52c41a",
  "#fa8c16",
  "#722ed1",
  "#eb2f96",
];

export default function LeadSourceChart({ data, loading }: LeadSourceChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <ChartContainer
      title="Nguồn Leads"
      subtitle="Phân bố nguồn leads"
      loading={loading}
      height={280}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {data.map((item, index) => {
          const percent = total > 0 ? (item.count / total) * 100 : 0;
          const color = SOURCE_COLORS[index % SOURCE_COLORS.length];

          return (
            <div
              key={item.source}
              style={{ display: "flex", flexDirection: "column", gap: 4 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: color,
                    }}
                  />
                  <span style={{ fontSize: 13, color: "#262626" }}>
                    {item.source}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#8c8c8c" }}>
                    {percent.toFixed(1)}%
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#262626",
                      minWidth: 50,
                      textAlign: "right",
                    }}
                  >
                    {formatNumber(item.count)}
                  </span>
                </div>
              </div>
              <div
                style={{
                  height: 8,
                  width: "100%",
                  backgroundColor: "#f0f0f0",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${percent}%`,
                    backgroundColor: color,
                    borderRadius: 4,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ChartContainer>
  );
}
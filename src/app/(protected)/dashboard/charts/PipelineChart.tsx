/**
 * PipelineChart Component (Sprint 4.2 - Dashboard Charts)
 *
 * Visualizes pipeline stages as horizontal progress bars.
 * Uses ChartContainer from UI Kit.
 */

import { ChartContainer } from "@/components/common";
import type { PipelineChartItem } from "@/types/dashboard-chart";
import { formatNumber } from "@/lib/format";

export type PipelineChartProps = {
  data: PipelineChartItem[];
  loading?: boolean;
};

const STAGE_COLORS: Record<string, string> = {
  "Mới": "#1890ff",
  "KNM": "#13c2c2",
  "Chốt": "#722ed1",
  "Đang giao": "#fa8c16",
  "Giao TC": "#52c41a",
  "Hoàn hàng": "#ff4d4f",
};

const DEFAULT_COLOR = "#8c8c8c";

export default function PipelineChart({ data, loading }: PipelineChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <ChartContainer
      title="Quy trình"
      subtitle="Phân bố theo giai đoạn"
      loading={loading}
      height={280}
    >
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
        {data.map((item) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0;
          const color = STAGE_COLORS[item.label] ?? DEFAULT_COLOR;

          return (
            <div
              key={item.label}
              style={{ display: "flex", flexDirection: "column", gap: 4 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 13, color: "#262626" }}>
                  {item.label}
                </span>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#8c8c8c" }}>
                    {percent.toFixed(1)}%
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#262626",
                      minWidth: 60,
                      textAlign: "right",
                    }}
                  >
                    {formatNumber(item.value)}
                  </span>
                </div>
              </div>
              <div
                style={{
                  height: 10,
                  width: "100%",
                  backgroundColor: "#f0f0f0",
                  borderRadius: 5,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${percent}%`,
                    backgroundColor: color,
                    borderRadius: 5,
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
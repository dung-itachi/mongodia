/**
 * TopSaleChart Component (Sprint 4.2 - Dashboard Charts)
 *
 * Top performers ranked by sales.
 * Uses ChartContainer from UI Kit.
 * Supports toggle between bar chart and line chart views.
 */

import { useState } from "react";
import { ChartContainer } from "@/components/common";
import { Button, Space, Tooltip } from "antd";
import { BarChartOutlined, LineChartOutlined } from "@ant-design/icons";
import type { TopSaleItem } from "@/types/dashboard-chart";
import { formatCurrency, formatCompact } from "@/lib/format";
import styles from "../dashboard.module.css";

export type TopSaleChartProps = {
  data: TopSaleItem[];
  loading?: boolean;
};

type ChartViewType = "bar" | "line";

export default function TopSaleChart({ data, loading }: TopSaleChartProps) {
  const [chartType, setChartType] = useState<ChartViewType>("bar");
  const maxTotal = data.reduce(
    (max, item) => (item.total > max ? item.total : max),
    0
  );

  const renderBarChart = () => (
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
  );

  const renderLineChart = () => {
    const SVG_W = 720;
    const SVG_H = 260;
    const PAD_LEFT = 52;
    const PAD_RIGHT = 16;
    const PAD_TOP = 24;
    const PAD_BOTTOM = 44;
    const innerW = SVG_W - PAD_LEFT - PAD_RIGHT;
    const innerH = SVG_H - PAD_TOP - PAD_BOTTOM;

    const xStep = data.length > 1 ? innerW / (data.length - 1) : innerW;
    const points = data.map((d, i) => ({
      x: PAD_LEFT + i * xStep,
      y: PAD_TOP + innerH - (maxTotal > 0 ? (d.total / maxTotal) * innerH : 0),
      total: d.total,
      name: d.name,
      index: i,
    }));

    const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
    const areaPath =
      points.length > 1
        ? `M ${PAD_LEFT},${PAD_TOP + innerH} ` +
          points.map((p) => `L ${p.x},${p.y}`).join(" ") +
          ` L ${points[points.length - 1].x},${PAD_TOP + innerH} Z`
        : "";

    const yAxisLabels = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
      ratio,
      y: PAD_TOP + innerH * (1 - ratio),
      value: maxTotal * ratio,
    }));

    return (
      <div className={styles["mk-line-chart-wrap"]}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: "100%", height: 220, display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id="topsale-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#52c41a" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#52c41a" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* Vertical grid lines */}
          {points.map((p) => (
            <line
              key={`vgrid-${p.index}`}
              x1={p.x}
              y1={PAD_TOP}
              x2={p.x}
              y2={PAD_TOP + innerH}
              stroke="#f0f0f0"
              strokeWidth={1}
            />
          ))}

          {/* Horizontal grid lines */}
          {yAxisLabels.map((lbl) => (
            <line
              key={`hgrid-${lbl.ratio}`}
              x1={PAD_LEFT}
              y1={lbl.y}
              x2={PAD_LEFT + innerW}
              y2={lbl.y}
              stroke="#e8e8e8"
              strokeWidth={1}
            />
          ))}

          {/* Y-axis labels */}
          {yAxisLabels.map((lbl) => (
            <text
              key={`ylabel-${lbl.ratio}`}
              x={PAD_LEFT - 6}
              y={lbl.y + 4}
              textAnchor="end"
              fontSize={9}
              fill="#8c8c8c"
            >
              {formatCompact(lbl.value)}
            </text>
          ))}

          {/* X-axis baseline */}
          <line
            x1={PAD_LEFT}
            y1={PAD_TOP + innerH}
            x2={PAD_LEFT + innerW}
            y2={PAD_TOP + innerH}
            stroke="#d9d9d9"
            strokeWidth={1}
          />

          {/* Area fill */}
          {areaPath && (
            <path d={areaPath} fill="url(#topsale-gradient)" />
          )}

          {/* Line */}
          {points.length > 1 && (
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="#52c41a"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Dots + labels */}
          {points.map((p) => (
            <g key={p.name || p.index}>
              <circle cx={p.x} cy={p.y} r={5} fill="#52c41a" />
              <text
                x={p.x}
                y={PAD_TOP + innerH + 16}
                textAnchor="middle"
                fontSize={10}
                fill="#595959"
              >
                {p.name.length > 8 ? p.name.substring(0, 8) + "..." : p.name}
              </text>
              <text
                x={p.x}
                y={p.y - 8}
                textAnchor="middle"
                fontSize={9}
                fill="#8c8c8c"
                fontWeight={500}
              >
                {formatCompact(p.total)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <ChartContainer
      title="Top Sale"
      subtitle="Top 5 nhân viên kinh doanh"
      loading={loading}
      height={280}
      actions={
        <Space.Compact size="small">
          <Tooltip title="Biểu đồ cột">
            <Button
              icon={<BarChartOutlined />}
              type={chartType === "bar" ? "primary" : "default"}
              onClick={() => setChartType("bar")}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Biểu đồ đường">
            <Button
              icon={<LineChartOutlined />}
              type={chartType === "line" ? "primary" : "default"}
              onClick={() => setChartType("line")}
              size="small"
            />
          </Tooltip>
        </Space.Compact>
      }
    >
      {chartType === "bar" ? renderBarChart() : renderLineChart()}
    </ChartContainer>
  );
}
